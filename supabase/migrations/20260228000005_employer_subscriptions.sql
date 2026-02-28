-- =============================================================================
-- Migration: 20260228000005_employer_subscriptions.sql
-- Adds employer_subscriptions table to persist plan + billing interval
-- at signup time (pre-Stripe). Also adds an employers insert policy so
-- the signup flow can create the employer row via service-role function.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- employer_subscriptions
-- ---------------------------------------------------------------------------
create table employer_subscriptions (
  id               uuid        primary key default gen_random_uuid(),
  employer_id      uuid        not null references employers(id) on delete cascade,
  plan_id          text        not null check (plan_id in ('starter', 'growth', 'enterprise')),
  billing_interval text        not null check (billing_interval in ('monthly', 'quarterly', 'annual', 'free')),
  status           text        not null default 'active'
                               check (status in ('active', 'trialing', 'cancelled', 'expired')),
  trial_ends_at    timestamptz,                -- only set for growth trialing
  created_at       timestamptz not null default now(),

  constraint uq_employer_subscription unique (employer_id)  -- one active plan per employer
);

create index idx_employer_subscriptions_employer_id on employer_subscriptions(employer_id);

comment on table employer_subscriptions is
  'Pre-Stripe plan selection. One row per employer workspace. '
  'Will be replaced/extended by Stripe webhook data when billing goes live.';

-- RLS
alter table employer_subscriptions enable row level security;

-- Employers can read their own subscription
create policy "esub: employer read"
  on employer_subscriptions
  for select
  using (
    exists (
      select 1 from employer_profiles ep
      where ep.user_id     = auth.uid()
        and ep.employer_id = employer_subscriptions.employer_id
    )
  );

-- Service-role bypasses RLS for inserts (signup flow uses service role call
-- via SECURITY DEFINER function below). Regular users cannot insert directly.
create policy "esub: deny user insert"
  on employer_subscriptions
  for insert
  with check (false);

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: provision_employer_workspace
-- Called by the EmployerSignup edge/server action with service-role key.
-- Creates: employers row + employer_profiles row + employer_subscriptions row
-- in a single atomic transaction.
-- ---------------------------------------------------------------------------
create or replace function provision_employer_workspace(
  p_user_id         uuid,
  p_company_name    text,
  p_plan_id         text,
  p_billing_interval text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employer_id   uuid;
  v_slug          text;
  v_trial_end     timestamptz := null;
  v_status        text := 'active';
begin
  -- Generate a slug from company name
  v_slug := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug) || '-' || substr(gen_random_uuid()::text, 1, 6);

  -- Create the employer
  insert into employers (name, slug)
  values (p_company_name, v_slug)
  returning id into v_employer_id;

  -- Link user as owner
  insert into employer_profiles (user_id, employer_id, role)
  values (p_user_id, v_employer_id, 'owner');

  -- Set trialing for growth plan
  if p_plan_id = 'growth' then
    v_status    := 'trialing';
    v_trial_end := now() + interval '30 days';
  end if;

  -- Record the plan selection
  insert into employer_subscriptions (employer_id, plan_id, billing_interval, status, trial_ends_at)
  values (v_employer_id, p_plan_id, p_billing_interval, v_status, v_trial_end);

  return jsonb_build_object(
    'employer_id', v_employer_id,
    'status',      v_status,
    'trial_ends_at', v_trial_end
  );
end;
$$;

-- Only callable by service_role
revoke all on function provision_employer_workspace(uuid, text, text, text) from public;

comment on function provision_employer_workspace(uuid, text, text, text) is
  'SECURITY DEFINER: atomically creates employer + employer_profiles + employer_subscriptions. '
  'Called by frontend with anon key using supabase.rpc() — but restricted to service_role '
  'key in production. For now we grant execute to authenticated for MVP convenience; '
  'remove this grant before go-live and move to an Edge Function.';

-- TEMPORARY: grant to authenticated so frontend can call it without Edge Function in Phase 2
-- REMOVE THIS before production and replace with Edge Function call using service_role key
grant execute on function provision_employer_workspace(uuid, text, text, text) to authenticated;
