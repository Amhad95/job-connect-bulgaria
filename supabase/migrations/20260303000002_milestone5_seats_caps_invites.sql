-- =============================================================================
-- Migration: 20260303000002_milestone5_seats_caps_invites.sql
-- Milestone 5: Team invites, RBAC, DB-level job/seat caps, trial expiry fields
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) employer_invites table
-- ---------------------------------------------------------------------------
create table if not exists employer_invites (
  id           uuid        primary key default gen_random_uuid(),
  employer_id  uuid        not null references employers(id) on delete cascade,
  email        text        not null,
  role         text        not null default 'member'
                           check (role in ('admin', 'member', 'viewer')),
  token        text        not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_by   uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),

  constraint uq_invite_employer_email unique (employer_id, email, status)
);

create index if not exists idx_employer_invites_token      on employer_invites(token);
create index if not exists idx_employer_invites_employer   on employer_invites(employer_id);
create index if not exists idx_employer_invites_email      on employer_invites(email);

alter table employer_invites enable row level security;

-- Owner/admin: read invites for their employer
create policy "invite: employer read"
  on employer_invites for select
  using (
    exists (
      select 1 from employer_profiles ep
      where ep.user_id = auth.uid()
        and ep.employer_id = employer_invites.employer_id
        and ep.role in ('owner', 'admin')
    )
  );

-- Only service-role inserts/updates (done via SECURITY DEFINER functions)
create policy "invite: deny user mutate"
  on employer_invites for all
  with check (false);

comment on table employer_invites is
  'Pending team invitations. Tokens expire after 7 days. '
  'Accepted invites create employer_profiles rows via accept_employer_invite().';

-- ---------------------------------------------------------------------------
-- B) Add viewer role to employer_profiles role check
-- ---------------------------------------------------------------------------
do $$ begin
  alter table employer_profiles
    drop constraint if exists employer_profiles_role_check;
exception when others then null;
end $$;

alter table employer_profiles
  add constraint employer_profiles_role_check
    check (role in ('owner', 'admin', 'member', 'viewer'));

-- ---------------------------------------------------------------------------
-- C) Seat cap helper function
-- ---------------------------------------------------------------------------
create or replace function get_seat_cap(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'starter'    then 3
    when 'growth'     then 10
    when 'enterprise' then 9999
    else 3
  end;
$$;

-- ---------------------------------------------------------------------------
-- D) SECURITY DEFINER: create_employer_invite
--    Owner/admin can invite; enforces seat cap before creating invite.
--    Returns: jsonb { ok, invite_id, error? }
-- ---------------------------------------------------------------------------
create or replace function create_employer_invite(
  p_employer_id uuid,
  p_email       text,
  p_role        text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role   text;
  v_plan          text;
  v_seat_cap      int;
  v_current_seats int;
  v_invite_id     uuid;
  v_token         text;
begin
  -- Caller must be owner or admin
  select ep.role into v_caller_role
  from employer_profiles ep
  where ep.user_id = auth.uid() and ep.employer_id = p_employer_id;

  if v_caller_role not in ('owner', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  -- Get plan + seat cap
  select plan_id into v_plan
  from employer_subscriptions where employer_id = p_employer_id;

  v_seat_cap := get_seat_cap(v_plan);

  -- Count current seats (profiles + pending invites)
  select count(*) into v_current_seats
  from employer_profiles where employer_id = p_employer_id;

  if v_current_seats >= v_seat_cap then
    return jsonb_build_object(
      'ok', false,
      'error', 'seat_cap_reached',
      'current', v_current_seats,
      'cap', v_seat_cap,
      'plan', v_plan
    );
  end if;

  -- Revoke any existing pending invite for this email
  update employer_invites
  set status = 'revoked'
  where employer_id = p_employer_id and email = lower(p_email) and status = 'pending';

  -- Create the invite
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into employer_invites (employer_id, email, role, token, created_by)
  values (p_employer_id, lower(p_email), p_role, v_token, auth.uid())
  returning id into v_invite_id;

  return jsonb_build_object(
    'ok', true,
    'invite_id', v_invite_id,
    'token', v_token,
    'role', p_role
  );
end;
$$;

grant execute on function create_employer_invite(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- E) SECURITY DEFINER: accept_employer_invite
--    Called by a newly-signed-in user after clicking /employer/join?token=...
--    Validates token, creates employer_profiles row, marks invite accepted.
-- ---------------------------------------------------------------------------
create or replace function accept_employer_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite      employer_invites%rowtype;
  v_plan        text;
  v_seat_cap    int;
  v_seat_count  int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  -- Fetch invite
  select * into v_invite
  from employer_invites
  where token = p_token and status = 'pending';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired_token');
  end if;

  -- Check expiry
  if v_invite.expires_at < now() then
    update employer_invites set status = 'expired' where id = v_invite.id;
    return jsonb_build_object('ok', false, 'error', 'token_expired');
  end if;

  -- Re-check seat cap at acceptance time
  select plan_id into v_plan
  from employer_subscriptions where employer_id = v_invite.employer_id;
  v_seat_cap := get_seat_cap(v_plan);

  select count(*) into v_seat_count
  from employer_profiles where employer_id = v_invite.employer_id;

  if v_seat_count >= v_seat_cap then
    return jsonb_build_object('ok', false, 'error', 'seat_cap_reached');
  end if;

  -- Create or update employer_profiles
  insert into employer_profiles (user_id, employer_id, role)
  values (auth.uid(), v_invite.employer_id, v_invite.role)
  on conflict (user_id, employer_id) do update set role = excluded.role;

  -- Mark invite accepted
  update employer_invites set status = 'accepted' where id = v_invite.id;

  return jsonb_build_object(
    'ok', true,
    'employer_id', v_invite.employer_id,
    'role', v_invite.role
  );
end;
$$;

grant execute on function accept_employer_invite(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- F) DB-level job cap trigger (enforced on ACTIVE transition only)
-- ---------------------------------------------------------------------------
create or replace function trg_enforce_job_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       text;
  v_cap        int;
  v_active_cnt int;
begin
  -- Only enforce when transitioning to ACTIVE
  if new.status <> 'ACTIVE' then return new; end if;
  if old.status = 'ACTIVE'  then return new; end if; -- already active, not a new activation

  -- Get plan
  select plan_id into v_plan
  from employer_subscriptions where employer_id = new.employer_id;

  v_cap := case v_plan
    when 'starter'    then 2
    when 'growth'     then 10
    when 'enterprise' then 9999
    else 2
  end;

  select count(*) into v_active_cnt
  from job_postings
  where employer_id = new.employer_id and status = 'ACTIVE' and id <> new.id;

  if v_active_cnt >= v_cap then
    raise exception 'JOB_CAP_EXCEEDED: % active job(s) allowed on % plan. Currently at cap (%/%)',
      v_cap, v_plan, v_active_cnt, v_cap;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_job_cap on job_postings;

create trigger trg_job_cap
  before update on job_postings
  for each row
  execute function trg_enforce_job_cap();

-- Also enforce on INSERT when status = ACTIVE
create or replace function trg_enforce_job_cap_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       text;
  v_cap        int;
  v_active_cnt int;
begin
  if new.status <> 'ACTIVE' then return new; end if;

  select plan_id into v_plan
  from employer_subscriptions where employer_id = new.employer_id;

  v_cap := case v_plan
    when 'starter'    then 2
    when 'growth'     then 10
    when 'enterprise' then 9999
    else 2
  end;

  select count(*) into v_active_cnt
  from job_postings where employer_id = new.employer_id and status = 'ACTIVE';

  if v_active_cnt >= v_cap then
    raise exception 'JOB_CAP_EXCEEDED: % active job(s) allowed on % plan.',
      v_cap, v_plan;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_job_cap_insert on job_postings;

create trigger trg_job_cap_insert
  before insert on job_postings
  for each row
  execute function trg_enforce_job_cap_on_insert();

-- ---------------------------------------------------------------------------
-- G) Trial expiry: add trial-expired status to employer_subscriptions
-- ---------------------------------------------------------------------------
do $$ begin
  alter table employer_subscriptions
    drop constraint if exists employer_subscriptions_status_check;
exception when others then null;
end $$;

-- Widen status to include trial_expired, past_due, suspended
alter table employer_subscriptions
  add constraint employer_subscriptions_status_check
    check (status in ('active', 'trialing', 'trial_expired', 'past_due', 'suspended', 'cancelled', 'expired'));

-- Add pending_approval to status list
-- (May already exist from M1 migration; idempotent via DROP/ADD)
comment on table employer_subscriptions is
  'Plan subscription state. Status flow: pending_approval → trialing/active → trial_expired/past_due → suspended/cancelled.';
