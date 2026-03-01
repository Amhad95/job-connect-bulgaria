-- =============================================================================
-- Migration: 20260304000003_milestone6_job_publish_invite_fixes.sql
-- Fixes two issues reported during employer usage:
-- 1. canonical_url not-null constraint on job_postings preventing drafting
-- 2. gen_random_bytes() missing error on employer invites
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Fix job_postings.canonical_url constraint
--    Make it nullable so DRAFT jobs can be saved without one.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table job_postings alter column canonical_url drop not null;
exception
  when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- B) Fix create_employer_invite() to use gen_random_uuid() for token
--    We replace the gen_random_bytes(32) which requires pgcrypto, using standard
--    core PG uuid generation instead.
-- ---------------------------------------------------------------------------
create or replace function create_employer_invite(
  p_employer_id uuid,
  p_email       text,
  p_role        text default 'member'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_token       text;
  v_active_seats int;
  v_plan_id     text;
  v_seat_cap    int;
begin
  if not (p_role in ('admin', 'member', 'viewer')) then
    raise exception 'Invalid role: %', p_role;
  end if;

  select role into v_caller_role
  from employer_profiles
  where user_id = auth.uid() and employer_id = p_employer_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'Unauthorized to invite members';
  end if;

  if p_role = 'admin' and v_caller_role != 'owner' then
    raise exception 'Only owners can invite admins';
  end if;

  v_active_seats := get_employer_active_seat_count(p_employer_id);

  select plan_id into v_plan_id
  from employer_subscriptions
  where employer_id = p_employer_id;

  v_seat_cap := case coalesce(v_plan_id, 'starter')
    when 'enterprise' then 999999
    when 'growth'     then 5
    else                   1     -- starter
  end;

  if v_active_seats >= v_seat_cap then
    raise exception 'Seat limit reached for plan % (%/%). Upgrade to invite more members.',
      upper(coalesce(v_plan_id, 'starter')), v_active_seats, v_seat_cap;
  end if;

  -- Fix: Use standard md5() + random() instead of missing gen_random_bytes()
  v_token := md5(random()::text || clock_timestamp()::text || p_email);

  update employer_invites
  set status = 'revoked'
  where employer_id = p_employer_id
    and email = p_email
    and status = 'pending';

  insert into employer_invites (
    employer_id, email, role, token, expires_at
  ) values (
    p_employer_id, lower(p_email), p_role, v_token, now() + interval '7 days'
  );

  return v_token;
end;
$$;
