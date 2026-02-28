-- =============================================================================
-- Migration: 20260301000001_approval_flow.sql
-- Milestone 1: Employer approval state + signup_requests table
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Add approval_status to employers
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'employers' and column_name = 'approval_status'
  ) then
    alter table employers
      add column approval_status text not null default 'pending'
        check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
      add column approval_reviewed_at  timestamptz,
      add column approval_reviewed_by  uuid references auth.users(id) on delete set null,
      add column approval_review_notes text;
  end if;
end $$;

comment on column employers.approval_status is
  'Current approval state. pending = awaiting admin review. '
  'Restrict workspace features (publish, public visibility) until approved.';

-- ---------------------------------------------------------------------------
-- B) signup_requests table — intake record for each employer signup
-- Linked to employer once provisioned.
-- ---------------------------------------------------------------------------
create table if not exists signup_requests (
  id                  uuid        primary key default gen_random_uuid(),
  employer_id         uuid        references employers(id) on delete set null, -- set after provision
  submitted_by_email  text        not null,
  submitted_by_uid    uuid        references auth.users(id) on delete set null,
  company_name        text        not null,
  domain              text,
  careers_url         text,
  about               text,
  logo_url            text,
  proposed_plan       text        not null default 'starter'
                                  check (proposed_plan in ('starter', 'growth', 'enterprise')),
  billing_interval    text        not null default 'free'
                                  check (billing_interval in ('monthly', 'quarterly', 'annual', 'free')),
  status              text        not null default 'PENDING'
                                  check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  review_notes        text,
  reviewed_at         timestamptz,
  reviewed_by         uuid        references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_signup_requests_employer_id on signup_requests(employer_id);
create index if not exists idx_signup_requests_status      on signup_requests(status);
create index if not exists idx_signup_requests_submitted_uid on signup_requests(submitted_by_uid);

comment on table signup_requests is
  'Intake record for employer signup. Created at signup time. '
  'Linked to employers.id after provisioning. Admin approval transitions employer.approval_status.';

-- RLS
alter table signup_requests enable row level security;

-- Submitter can read their own request
create policy "sreq: self read"
  on signup_requests for select
  using (submitted_by_uid = auth.uid());

-- Only service_role / admin can insert/update
create policy "sreq: deny user insert"
  on signup_requests for insert
  with check (false);

create policy "sreq: deny user update"
  on signup_requests for update
  using (false);

-- ---------------------------------------------------------------------------
-- C) partner_events table (if it doesn't exist yet, create it consistently)
-- Used by admin module for activity log.
-- ---------------------------------------------------------------------------
create table if not exists partner_events (
  id          uuid        primary key default gen_random_uuid(),
  employer_id uuid        not null references employers(id) on delete cascade,
  event_type  text        not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_partner_events_employer_id on partner_events(employer_id);

alter table partner_events enable row level security;

-- Employer members can read their own events
create policy "pevt: employer read"
  on partner_events for select
  using (
    exists (
      select 1 from employer_profiles ep
      where ep.user_id = auth.uid() and ep.employer_id = partner_events.employer_id
    )
  );

-- Only service_role inserts
create policy "pevt: deny user insert"
  on partner_events for insert
  with check (false);

-- Grant service_role (bypasses RLS) for admin writes via AdminPartnerRequests
grant execute on function provision_employer_workspace(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- D) Update provision_employer_workspace() to:
--    1) Set employers.approval_status = 'pending'
--    2) Create a signup_requests row
--    3) Set employer_subscriptions.status = 'pending_approval' (not trialing/active yet)
--    4) Log a partner_event
-- ---------------------------------------------------------------------------
create or replace function provision_employer_workspace(
  p_user_id           uuid,
  p_company_name      text,
  p_plan_id           text,
  p_billing_interval  text,
  p_email             text        default null,
  p_domain            text        default null,
  p_about             text        default null
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

  -- Plan selection stored as pending_approval (no trial starts until approved)
  insert into employer_subscriptions (employer_id, plan_id, billing_interval, status, trial_ends_at)
  values (
    v_employer_id,
    p_plan_id,
    p_billing_interval,
    'pending_approval',  -- transitions to active/trialing after admin approves
    null
  )
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

  -- Log event
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

-- Keep grant for MVP
grant execute on function provision_employer_workspace(uuid, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- E) approve_employer_workspace() — called by AdminPartnerRequests
-- Sets approval_status=approved, transitions subscription status,
-- creates an employer_profiles row if not already present (defensive).
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
  v_plan text;
  v_sub_status text;
  v_trial_end  timestamptz;
begin
  -- Approve employer
  update employers
  set
    approval_status       = 'approved',
    approval_reviewed_at  = now(),
    approval_reviewed_by  = p_reviewer_uid,
    approval_review_notes = p_review_notes
  where id = p_employer_id;

  -- Get plan to determine subscription transition
  select plan_id into v_plan
  from employer_subscriptions
  where employer_id = p_employer_id;

  if v_plan = 'growth' then
    v_sub_status := 'trialing';
    v_trial_end  := now() + interval '30 days';
  else
    v_sub_status := 'active';
    v_trial_end  := null;
  end if;

  -- Transition subscription
  update employer_subscriptions
  set
    status        = v_sub_status,
    trial_ends_at = v_trial_end
  where employer_id = p_employer_id;

  -- Update signup_request
  update signup_requests
  set status = 'APPROVED', reviewed_at = now(), reviewed_by = p_reviewer_uid,
      review_notes = p_review_notes
  where employer_id = p_employer_id and status = 'PENDING';

  -- Log event
  insert into partner_events (employer_id, event_type, metadata)
  values (p_employer_id, 'APPROVED', jsonb_build_object(
    'reviewer', p_reviewer_uid,
    'sub_status', v_sub_status
  ));
end;
$$;

revoke all on function approve_employer_workspace(uuid, uuid, text) from public;
grant execute on function approve_employer_workspace(uuid, uuid, text) to authenticated;

comment on function approve_employer_workspace(uuid, uuid, text) is
  'SECURITY DEFINER: admin action to approve employer. Sets approval_status, '
  'transitions subscription (growth→trialing with trial_ends_at, others→active). '
  'Logs partner_event.';

-- ---------------------------------------------------------------------------
-- F) reject_employer_workspace() — admin action
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
    'reviewer', p_reviewer_uid,
    'notes', p_review_notes
  ));
end;
$$;

revoke all on function reject_employer_workspace(uuid, uuid, text) from public;
grant execute on function reject_employer_workspace(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- G) employer_subscriptions: allow pending_approval status
-- ---------------------------------------------------------------------------
alter table employer_subscriptions
  drop constraint if exists employer_subscriptions_status_check;

alter table employer_subscriptions
  add constraint employer_subscriptions_status_check
    check (status in ('pending_approval', 'active', 'trialing', 'cancelled', 'expired'));
