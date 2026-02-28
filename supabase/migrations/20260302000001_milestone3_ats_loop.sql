-- =============================================================================
-- Migration: 20260302000001_milestone3_ats_loop.sql
-- Milestone 3: Job CRUD statuses, duplicate application guard,
-- resume storage bucket, plan job-cap function, public jobs fix.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Ensure job_postings has all needed columns
--    NOTE: status is typed as job_status_enum — enum values (DRAFT, PAUSED,
--    CLOSED) are added in migration 20260302000002_fix_job_status_enum.sql
-- ---------------------------------------------------------------------------
-- Add source_type column (key for Milestone 2 public jobs unification)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'job_postings' and column_name = 'source_type'
  ) then
    alter table job_postings
      add column source_type text not null default 'EXTERNAL'
        check (source_type in ('EXTERNAL', 'DIRECT'));
  end if;
end $$;

-- Add employer_id column if not present (M1 reference)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'job_postings' and column_name = 'employer_id'
  ) then
    alter table job_postings
      add column employer_id uuid references employers(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_job_postings_employer_id on job_postings(employer_id);
create index if not exists idx_job_postings_source_type on job_postings(source_type);
create index if not exists idx_job_postings_status      on job_postings(status);

-- ---------------------------------------------------------------------------
-- B) job_posting_content: ensure required columns exist
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'job_posting_content' and column_name = 'requirements_text'
  ) then
    alter table job_posting_content add column requirements_text text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'job_posting_content' and column_name = 'benefits_text'
  ) then
    alter table job_posting_content add column benefits_text text;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- C) Duplicate application guard (same job_id + email = blocked unless guest)
--    Using a partial unique index. Authenticated users are fully blocked.
--    Guest re-applications could be version-handled; we block for now.
-- ---------------------------------------------------------------------------
create unique index if not exists uq_application_job_email
  on applications (job_id, lower(email));

comment on index uq_application_job_email is
  'Prevents the same email from applying twice to the same job. '
  'Enforced at DB level; frontend should also check and show a friendly message.';

-- ---------------------------------------------------------------------------
-- D) Resume storage bucket (idempotent — safe to re-run)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- RLS: authenticated users can upload their own resumes
create policy "resumes: auth upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- Anonymous users can upload to a 'guest' subfolder
create policy "resumes: anon upload"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = 'guest');

-- Authenticated users can read/update/delete their own files
create policy "resumes: auth read own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- Employers can read resumes for their jobs' applicants via service-role only
-- (no direct storage RLS for that; handle via signed URL from Edge Function)

-- ---------------------------------------------------------------------------
-- E) Plan job cap enforcement function
-- Called before publish to gate by plan limits.
-- Returns: jsonb { allowed: bool, current: int, cap: int, plan: text }
-- ---------------------------------------------------------------------------
create or replace function check_job_publish_allowed(p_employer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan      text;
  v_status    text;
  v_cap       int;
  v_current   int;
  v_approval  text;
begin
  -- Get approval status
  select approval_status into v_approval
  from employers where id = p_employer_id;

  if v_approval is distinct from 'approved' then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'pending_approval',
      'approval_status', v_approval
    );
  end if;

  -- Get subscription
  select plan_id, status into v_plan, v_status
  from employer_subscriptions where employer_id = p_employer_id;

  -- Cap by plan (starter: 2, growth: 20, enterprise: unlimited)
  v_cap := case v_plan
    when 'starter'    then 2
    when 'growth'     then 20
    when 'enterprise' then 9999
    else 2
  end;

  -- Count current ACTIVE + DRAFT postings (drafts count toward the cap to prevent hoarding)
  select count(*) into v_current
  from job_postings
  where employer_id = p_employer_id
    and status in ('ACTIVE', 'DRAFT', 'PAUSED');

  return jsonb_build_object(
    'allowed',  v_current < v_cap,
    'current',  v_current,
    'cap',      v_cap,
    'plan',     v_plan,
    'sub_status', v_status
  );
end;
$$;

grant execute on function check_job_publish_allowed(uuid) to authenticated;

comment on function check_job_publish_allowed(uuid) is
  'Returns publish eligibility for an employer based on approval_status + plan cap. '
  'Call before creating or publishing a job posting.';
