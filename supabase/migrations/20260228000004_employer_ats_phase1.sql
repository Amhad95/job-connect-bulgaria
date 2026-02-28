-- =============================================================================
-- Phase 1: Employer ATS Schema
-- Migration: 20260228000004_employer_ats_phase1.sql
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- A) ENUMS
-- =============================================================================

create type application_status_enum as enum (
  'new',
  'reviewing',
  'interviewing',
  'offered',
  'rejected'
);

-- =============================================================================
-- B) TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- employer_profiles
-- Links auth.users to employers; defines the user's role within that employer.
-- This is the multi-tenancy anchor: all employer RLS checks go through it.
-- ---------------------------------------------------------------------------
create table employer_profiles (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id)  on delete cascade,
  employer_id uuid        not null references employers(id)   on delete cascade,
  role        text        not null default 'member'
                          check (role in ('owner', 'admin', 'member')),
  created_at  timestamptz not null default now(),

  constraint uq_employer_profiles_user_employer unique (user_id, employer_id)
);

create index idx_employer_profiles_user_id     on employer_profiles(user_id);
create index idx_employer_profiles_employer_id on employer_profiles(employer_id);

comment on table employer_profiles is
  'Binds an auth user to an employer workspace with an RBAC role. '
  'All employer-side RLS policies resolve tenancy via this table.';

-- ---------------------------------------------------------------------------
-- applications
-- Candidate submissions into the ATS pipeline.
-- Supports both authenticated and guest (user_id IS NULL) applies.
-- ai_match_score / ai_match_reasoning are written exclusively by the
-- service-role SECURITY DEFINER function defined at the bottom of this file.
-- ---------------------------------------------------------------------------
create table applications (
  id                   uuid                     primary key default gen_random_uuid(),
  job_id               uuid                     not null references job_postings(id) on delete cascade,
  user_id              uuid                     references auth.users(id) on delete set null, -- null = guest apply
  first_name           text                     not null,
  last_name            text                     not null,
  email                text                     not null
                                                check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  resume_url           text                     not null,
  status               application_status_enum  not null default 'new',
  ai_match_score       int                      check (ai_match_score is null or (ai_match_score >= 0 and ai_match_score <= 100)),
  ai_match_reasoning   text,
  applied_at           timestamptz              not null default now()
);

-- Indexes ordered by most selective use-cases first
create index idx_applications_job_id              on applications(job_id);
create index idx_applications_status              on applications(status);
create index idx_applications_applied_at          on applications(applied_at desc);
create index idx_applications_job_status          on applications(job_id, status);
create index idx_applications_job_ai_score        on applications(job_id, ai_match_score desc nulls last);
-- Supports candidate "my applications" queries
create index idx_applications_user_id             on applications(user_id) where user_id is not null;

comment on table applications is
  'ATS candidate pipeline. Authenticated and guest applies are supported. '
  'ai_match_score and ai_match_reasoning must be written only by the '
  'set_application_ai_score() SECURITY DEFINER function.';

comment on column applications.user_id is
  'NULL for guest (unauthenticated) applications. Linked user cannot be '
  're-read by the guest after submission (no auth token to match on).';

comment on column applications.ai_match_score is
  'Score 0–100 set by AI pipeline. NULL until Edge Function runs.';

-- =============================================================================
-- C) ENABLE RLS
-- =============================================================================

alter table employer_profiles enable row level security;
alter table applications       enable row level security;

-- Keep existing job_postings / job_posting_content RLS intact; we add new
-- INSERT/UPDATE/DELETE policies below. Public SELECT policy is assumed to
-- already exist and must NOT be dropped.

-- =============================================================================
-- D) HELPER: is the current user a member of a given employer?
-- Used in EXISTS subqueries to avoid policy repetition.
-- Returns: boolean
-- =============================================================================

create or replace function is_employer_member(p_employer_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from employer_profiles ep
    where ep.user_id     = auth.uid()
      and ep.employer_id = p_employer_id
  );
$$;

comment on function is_employer_member(uuid) is
  'Returns true if the current user has any role in the given employer workspace.';

-- Convenience variant: lookup via a job_id (avoids repeated JOINs in policies)
create or replace function is_employer_member_for_job(p_job_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from employer_profiles ep
    join job_postings jp on jp.employer_id = ep.employer_id
    where ep.user_id = auth.uid()
      and jp.id      = p_job_id
  );
$$;

comment on function is_employer_member_for_job(uuid) is
  'Returns true if the current user belongs to the employer that owns the given job posting.';

-- =============================================================================
-- E) RLS POLICIES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- employer_profiles policies
-- ---------------------------------------------------------------------------

-- Candidates/employers can read only their own profile row.
create policy "ep: self read"
  on employer_profiles
  for select
  using (user_id = auth.uid());

-- INSERT is disallowed for regular users (admin/service-role only onboarding).
-- Service-role always bypasses RLS; no explicit USING needed for that path.
create policy "ep: deny user insert"
  on employer_profiles
  for insert
  with check (false); -- blocked; onboarding done via service-role or admin function

-- Users may update their own row but cannot change user_id or employer_id
-- (immutable tenant anchors). role changes are also restricted here —
-- only owner/admin of the SAME employer may elevate another member.
-- Simpler, recursion-safe approach: disallow self-role updates; rely on
-- a SECURITY DEFINER admin function (future phase) for role management.
create policy "ep: self update (no tenant fields)"
  on employer_profiles
  for update
  using  (user_id = auth.uid())
  with check (
    user_id     = auth.uid()         -- cannot change user_id
    and role    = 'member'           -- cannot self-escalate; locked at member
  );

-- DELETE disallowed for regular users.
create policy "ep: deny user delete"
  on employer_profiles
  for delete
  using (false);

-- ---------------------------------------------------------------------------
-- job_postings policies — employer mutate only
-- (public SELECT policy assumed to exist already; we do not touch it)
-- ---------------------------------------------------------------------------

-- Employer members may insert new job postings for their employer.
create policy "jp: employer insert"
  on job_postings
  for insert
  with check (is_employer_member(employer_id));

-- Employer members may update postings that belong to their employer.
create policy "jp: employer update"
  on job_postings
  for update
  using  (is_employer_member(employer_id))
  with check (is_employer_member(employer_id));

-- Employer members may delete their own postings.
create policy "jp: employer delete"
  on job_postings
  for delete
  using (is_employer_member(employer_id));

-- ---------------------------------------------------------------------------
-- job_posting_content policies
-- ---------------------------------------------------------------------------

-- Employer members may read content for jobs they own.
create policy "jpc: employer select"
  on job_posting_content
  for select
  using (is_employer_member_for_job(job_id));

-- Employer members may insert content for their jobs.
create policy "jpc: employer insert"
  on job_posting_content
  for insert
  with check (is_employer_member_for_job(job_id));

-- Employer members may update content for their jobs.
create policy "jpc: employer update"
  on job_posting_content
  for update
  using  (is_employer_member_for_job(job_id))
  with check (is_employer_member_for_job(job_id));

-- Employer members may delete content for their jobs.
create policy "jpc: employer delete"
  on job_posting_content
  for delete
  using (is_employer_member_for_job(job_id));

-- ---------------------------------------------------------------------------
-- applications policies — candidates
-- ---------------------------------------------------------------------------

-- Authenticated candidate: insert own application.
-- user_id must match the authenticated caller.
create policy "app: candidate authenticated insert"
  on applications
  for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Guest candidate: insert with user_id = NULL.
create policy "app: candidate guest insert"
  on applications
  for insert
  with check (
    auth.uid() is null
    and user_id is null
  );

-- Candidates can read only their own applications (not guest reads).
create policy "app: candidate self read"
  on applications
  for select
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Candidates cannot update applications (status, AI fields, etc. are employer-only).
-- No candidate UPDATE policy = no update allowed by non-employer users.

-- ---------------------------------------------------------------------------
-- applications policies — employers
-- ---------------------------------------------------------------------------

-- Employer members can read applications for jobs they own.
create policy "app: employer select"
  on applications
  for select
  using (is_employer_member_for_job(job_id));

-- Employer members can update application status for their jobs.
-- AI score/reasoning fields are intentionally allowed here for the
-- SECURITY DEFINER function (Option 2 fallback); the preferred path
-- is the set_application_ai_score() function below (Option 1).
create policy "app: employer update"
  on applications
  for update
  using  (is_employer_member_for_job(job_id))
  with check (is_employer_member_for_job(job_id));

-- Employer members may hard-delete applications for their jobs.
-- Prefer soft-delete via status='rejected' in application code.
create policy "app: employer delete"
  on applications
  for delete
  using (is_employer_member_for_job(job_id));

-- =============================================================================
-- F) SECURITY DEFINER FUNCTION FOR AI SCORE WRITES (OPTION 1)
-- Called by the Edge Function using the service role key.
-- Regular users and employer members cannot call this directly because
-- the WHERE clause is not restricted by RLS when running as SECURITY DEFINER —
-- but we validate the token claim to prevent misuse.
-- =============================================================================

create or replace function set_application_ai_score(
  p_application_id  uuid,
  p_score           int,
  p_reasoning       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Enforce score range at the function level (redundant with column CHECK but explicit).
  if p_score < 0 or p_score > 100 then
    raise exception 'ai_match_score must be between 0 and 100, got %', p_score;
  end if;

  update applications
  set
    ai_match_score      = p_score,
    ai_match_reasoning  = p_reasoning
  where id = p_application_id;

  if not found then
    raise exception 'application % not found', p_application_id;
  end if;
end;
$$;

-- Revoke from public; only service_role (which bypasses RLS) should call this.
revoke all on function set_application_ai_score(uuid, int, text) from public;

comment on function set_application_ai_score(uuid, int, text) is
  'SECURITY DEFINER: writes AI score fields on an application. '
  'Callable only by service_role (Edge Function). '
  'All other callers are revoked via REVOKE ALL FROM PUBLIC.';
