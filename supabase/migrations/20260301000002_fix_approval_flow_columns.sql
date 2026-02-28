-- =============================================================================
-- Migration: 20260301000002_fix_approval_flow_columns.sql
-- Fixes column mismatch from migration 20260301000001.
-- 
-- Root cause: partner_events already existed with partner_id (not employer_id).
-- signup_requests may already exist without employer_id column.
-- This migration normalizes both tables to use employer_id.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) partner_events: add employer_id if it doesn't exist, backfill from partner_id
-- ---------------------------------------------------------------------------
do $$ begin
  -- Add employer_id column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'partner_events' and column_name = 'employer_id'
  ) then
    alter table partner_events add column employer_id uuid references employers(id) on delete cascade;
  end if;

  -- If partner_id exists, backfill employer_id from it
  if exists (
    select 1 from information_schema.columns
    where table_name = 'partner_events' and column_name = 'partner_id'
  ) then
    update partner_events set employer_id = partner_id where employer_id is null;
  end if;
end $$;

-- Recreate index on employer_id if not present
create index if not exists idx_partner_events_employer_id on partner_events(employer_id);

-- Update RLS policy to use employer_id if it doesn't already exist
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'partner_events' and policyname = 'pevt: employer read'
  ) then
    create policy "pevt: employer read"
      on partner_events for select
      using (
        exists (
          select 1 from employer_profiles ep
          where ep.user_id = auth.uid() and ep.employer_id = partner_events.employer_id
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- B) signup_requests: add employer_id, billing_interval, submitted_by_uid if missing
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'signup_requests' and column_name = 'employer_id'
  ) then
    alter table signup_requests add column employer_id uuid references employers(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'signup_requests' and column_name = 'billing_interval'
  ) then
    alter table signup_requests add column billing_interval text not null default 'free'
      check (billing_interval in ('monthly', 'quarterly', 'annual', 'free'));
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'signup_requests' and column_name = 'submitted_by_uid'
  ) then
    alter table signup_requests add column submitted_by_uid uuid references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists idx_signup_requests_employer_id on signup_requests(employer_id);
create index if not exists idx_signup_requests_status      on signup_requests(status);

-- ---------------------------------------------------------------------------
-- C) employers: add approval columns if not present (idempotent guard)
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'employers' and column_name = 'approval_status'
  ) then
    alter table employers
      add column approval_status       text not null default 'pending'
        check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
      add column approval_reviewed_at  timestamptz,
      add column approval_reviewed_by  uuid references auth.users(id) on delete set null,
      add column approval_review_notes text;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- D) employer_subscriptions: widen status check to include pending_approval
-- ---------------------------------------------------------------------------
alter table employer_subscriptions
  drop constraint if exists employer_subscriptions_status_check;

alter table employer_subscriptions
  add constraint employer_subscriptions_status_check
    check (status in ('pending_approval', 'active', 'trialing', 'cancelled', 'expired'));

-- ---------------------------------------------------------------------------
-- E) Redefine provision_employer_workspace with employer_id (not partner_id)
--    for partner_events insert
-- ---------------------------------------------------------------------------
create or replace function provision_employer_workspace(
  p_user_id           uuid,
  p_company_name      text,
  p_plan_id           text,
  p_billing_interval  text,
  p_email             text default null,
  p_domain            text default null,
  p_about             text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employer_id   uuid;
  v_slug          text;
  v_request_id    uuid;
begin
  -- Generate unique slug
  v_slug := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug) || '-' || substr(gen_random_uuid()::text, 1, 6);

  -- Create employer in PENDING state
  insert into employers (name, slug, approval_status)
  values (p_company_name, v_slug, 'pending')
  returning id into v_employer_id;

  -- Link user as owner
  insert into employer_profiles (user_id, employer_id, role)
  values (p_user_id, v_employer_id, 'owner');

  -- Plan stored as pending_approval (trial/active only after admin approves)
  insert into employer_subscriptions (employer_id, plan_id, billing_interval, status)
  values (v_employer_id, p_plan_id, p_billing_interval, 'pending_approval')
  on conflict (employer_id) do nothing;

  -- Create signup_request intake record
  insert into signup_requests (
    employer_id, submitted_by_uid, submitted_by_email, company_name,
    domain, about, proposed_plan, billing_interval, status
  )
  values (
    v_employer_id, p_user_id, coalesce(p_email, ''), p_company_name,
    p_domain, p_about, p_plan_id, p_billing_interval, 'PENDING'
  )
  returning id into v_request_id;

  -- Log event using employer_id
  insert into partner_events (employer_id, event_type, metadata)
  values (v_employer_id, 'SIGNUP_SUBMITTED', jsonb_build_object(
    'plan', p_plan_id,
    'interval', p_billing_interval,
    'request_id', v_request_id
  ));

  return jsonb_build_object(
    'employer_id',  v_employer_id,
    'request_id',   v_request_id,
    'status',       'pending_approval'
  );
end;
$$;

grant execute on function provision_employer_workspace(uuid, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- F) approve_employer_workspace using employer_id column in partner_events
-- ---------------------------------------------------------------------------
create or replace function approve_employer_workspace(
  p_employer_id   uuid,
  p_reviewer_uid  uuid,
  p_review_notes  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       text;
  v_sub_status text;
  v_trial_end  timestamptz;
begin
  update employers
  set
    approval_status       = 'approved',
    approval_reviewed_at  = now(),
    approval_reviewed_by  = p_reviewer_uid,
    approval_review_notes = p_review_notes
  where id = p_employer_id;

  select plan_id into v_plan
  from employer_subscriptions where employer_id = p_employer_id;

  if v_plan = 'growth' then
    v_sub_status := 'trialing';
    v_trial_end  := now() + interval '30 days';
  else
    v_sub_status := 'active';
    v_trial_end  := null;
  end if;

  update employer_subscriptions
  set status = v_sub_status, trial_ends_at = v_trial_end
  where employer_id = p_employer_id;

  update signup_requests
  set status = 'APPROVED', reviewed_at = now(), reviewed_by = p_reviewer_uid,
      review_notes = p_review_notes
  where employer_id = p_employer_id and status = 'PENDING';

  insert into partner_events (employer_id, event_type, metadata)
  values (p_employer_id, 'APPROVED', jsonb_build_object(
    'reviewer', p_reviewer_uid, 'sub_status', v_sub_status
  ));
end;
$$;

grant execute on function approve_employer_workspace(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- G) reject_employer_workspace using employer_id column in partner_events
-- ---------------------------------------------------------------------------
create or replace function reject_employer_workspace(
  p_employer_id   uuid,
  p_reviewer_uid  uuid,
  p_review_notes  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update employers
  set
    approval_status       = 'rejected',
    approval_reviewed_at  = now(),
    approval_reviewed_by  = p_reviewer_uid,
    approval_review_notes = p_review_notes
  where id = p_employer_id;

  update employer_subscriptions
  set status = 'cancelled'
  where employer_id = p_employer_id;

  update signup_requests
  set status = 'REJECTED', reviewed_at = now(), reviewed_by = p_reviewer_uid,
      review_notes = p_review_notes
  where employer_id = p_employer_id and status = 'PENDING';

  insert into partner_events (employer_id, event_type, metadata)
  values (p_employer_id, 'REJECTED', jsonb_build_object(
    'reviewer', p_reviewer_uid, 'notes', p_review_notes
  ));
end;
$$;

grant execute on function reject_employer_workspace(uuid, uuid, text) to authenticated;
