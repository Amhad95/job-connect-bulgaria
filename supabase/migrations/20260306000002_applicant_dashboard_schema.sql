-- =============================================================================
-- Applicant Dashboard Schema: Profile + Saved Jobs + Tracker
-- Migration: 20260306000002_applicant_dashboard_schema.sql
--
-- NOTE: saved_jobs table already exists from an earlier migration.
-- This migration uses IF NOT EXISTS / DO blocks to be fully idempotent.
-- =============================================================================

-- =============================================================================
-- A) SUGGESTION CATALOGS (public read, admin write)
-- =============================================================================

create table if not exists skills_catalog (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  normalized_name  text not null generated always as (lower(trim(name))) stored,
  category         text,
  popularity_score int  not null default 0,
  created_at       timestamptz not null default now()
);
create unique index if not exists idx_skills_catalog_norm on skills_catalog(normalized_name);
create index if not exists idx_skills_catalog_pop on skills_catalog(popularity_score desc);

create table if not exists institutions_catalog (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  country          text,
  city             text,
  popularity_score int  not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_institutions_catalog_name on institutions_catalog using gin(to_tsvector('simple', name));

create table if not exists companies_catalog (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  normalized_name  text not null generated always as (lower(trim(name))) stored,
  domain           text,
  popularity_score int  not null default 0,
  created_at       timestamptz not null default now()
);
create unique index if not exists idx_companies_catalog_norm on companies_catalog(normalized_name);

create table if not exists roles_catalog (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  normalized_name  text not null generated always as (lower(trim(name))) stored,
  popularity_score int  not null default 0,
  created_at       timestamptz not null default now()
);
create unique index if not exists idx_roles_catalog_norm on roles_catalog(normalized_name);

-- =============================================================================
-- B) APPLICANT PROFILE TABLES
-- =============================================================================

-- B1) Core profile
create table if not exists applicant_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  headline   text,
  summary    text,
  location   text,
  email      text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- B2) Work experience
create table if not exists applicant_experiences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  company_id  uuid references companies_catalog(id),
  title       text not null,
  start_date  date not null,
  end_date    date,
  is_current  boolean not null default false,
  location    text,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_exp_current_end check (not is_current or end_date is null)
);
create index if not exists idx_exp_user on applicant_experiences(user_id, sort_order);

-- B3) Experience achievement bullets
create table if not exists applicant_experience_bullets (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references applicant_experiences(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  bullet        text not null,
  sort_order    int not null default 0
);
create index if not exists idx_exp_bullets_exp on applicant_experience_bullets(experience_id, sort_order);

-- B4) Experience role-specific skills
create table if not exists applicant_experience_skills (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references applicant_experiences(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  skill_id      uuid references skills_catalog(id),
  skill_name    text not null
);
create index if not exists idx_exp_skills_exp on applicant_experience_skills(experience_id);

-- B5) Education
create table if not exists applicant_education (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  institution_name text not null,
  institution_id   uuid references institutions_catalog(id),
  degree           text,
  field_of_study   text,
  start_date       date,
  end_date         date,
  is_current       boolean not null default false,
  notes            text,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_edu_current_end check (not is_current or end_date is null)
);
create index if not exists idx_edu_user on applicant_education(user_id, sort_order);

-- B6) Skills (structured)
create table if not exists applicant_skills (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  skill_id         uuid references skills_catalog(id),
  skill_name       text not null,
  category         text,
  proficiency      text check (proficiency is null or proficiency in ('Beginner','Intermediate','Advanced','Expert')),
  years_experience numeric,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_skills_user on applicant_skills(user_id, sort_order);

-- B7) Certificates
create table if not exists applicant_certificates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  issuer         text,
  issue_date     date,
  expiry_date    date,
  credential_url text,
  credential_id  text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists idx_certs_user on applicant_certificates(user_id, sort_order);

-- B8) Links
create table if not exists applicant_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  url        text not null,
  sort_order int not null default 0
);
create index if not exists idx_links_user on applicant_links(user_id, sort_order);

-- =============================================================================
-- C) SAVED JOBS + HISTORY + INTEREST TAGS
-- =============================================================================

-- saved_jobs ALREADY EXISTS from earlier migration (20260226143258).
-- It uses created_at instead of saved_at, and has its own UNIQUE(user_id,job_id)
-- and RLS policy. We skip creating it and only add the new tables.

create table if not exists job_view_history (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  job_id    uuid not null references job_postings(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
-- keep as event log; UI deduplicates by showing distinct job_id ordered by max(viewed_at)
create index if not exists idx_view_history_user on job_view_history(user_id, viewed_at desc);

create table if not exists job_interest_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tag_type   text not null check (tag_type in ('role','skill','industry','location','keyword')),
  value      text not null,
  created_at timestamptz not null default now(),
  constraint uq_interest_tags unique (user_id, tag_type, value)
);
create index if not exists idx_interest_tags_user on job_interest_tags(user_id);

-- =============================================================================
-- D) APPLICATION TRACKER (external manual items only)
--    Uses a NEW table separate from the legacy tracker_items table.
-- =============================================================================

do $$ begin
  create type tracker_stage_enum as enum (
    'saved', 'applied', 'interviewing', 'offer', 'rejected'
  );
exception when duplicate_object then null;
end $$;

create table if not exists application_tracker_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source_type  text not null default 'external' check (source_type = 'external'),
  job_title    text not null,
  company_name text not null,
  job_url      text,
  location     text,
  notes        text,
  stage        tracker_stage_enum not null default 'saved',
  applied_date date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_tracker_user on application_tracker_items(user_id, stage);

-- =============================================================================
-- E) APPLICATION TABLE MODIFICATIONS (add profile snapshot)
-- =============================================================================

alter table applications
  add column if not exists applicant_profile_snapshot jsonb,
  add column if not exists applicant_profile_version  text;

comment on column applications.applicant_profile_snapshot is
  'Immutable snapshot of applicant profile at apply time. '
  'Later profile edits do not modify this.';

-- =============================================================================
-- F) ENABLE ROW LEVEL SECURITY
-- =============================================================================

alter table applicant_profiles          enable row level security;
alter table applicant_experiences       enable row level security;
alter table applicant_experience_bullets enable row level security;
alter table applicant_experience_skills enable row level security;
alter table applicant_education         enable row level security;
alter table applicant_skills            enable row level security;
alter table applicant_certificates      enable row level security;
alter table applicant_links             enable row level security;
-- saved_jobs RLS already enabled in earlier migration
alter table job_view_history            enable row level security;
alter table job_interest_tags           enable row level security;
alter table application_tracker_items   enable row level security;
alter table skills_catalog              enable row level security;
alter table institutions_catalog        enable row level security;
alter table companies_catalog           enable row level security;
alter table roles_catalog               enable row level security;

-- =============================================================================
-- G) RLS POLICIES — Profile tables (user CRUD own rows)
--    Uses IF NOT EXISTS check to skip tables that already have policies.
-- =============================================================================

do $$
declare
  tbl text;
  col text;
  pol_exists boolean;
begin
  for tbl, col in values
    ('applicant_profiles',           'user_id'),
    ('applicant_experiences',        'user_id'),
    ('applicant_experience_bullets', 'user_id'),
    ('applicant_experience_skills',  'user_id'),
    ('applicant_education',          'user_id'),
    ('applicant_skills',             'user_id'),
    ('applicant_certificates',       'user_id'),
    ('applicant_links',              'user_id'),
    ('job_view_history',             'user_id'),
    ('job_interest_tags',            'user_id'),
    ('application_tracker_items',    'user_id')
  loop
    -- Check if any policy already exists for this table
    select exists(
      select 1 from pg_policies where tablename = tbl and policyname = tbl || '_sel'
    ) into pol_exists;

    if not pol_exists then
      execute format(
        'create policy %I on %I for select to authenticated using (%I = auth.uid())',
        tbl || '_sel', tbl, col
      );
      execute format(
        'create policy %I on %I for insert to authenticated with check (%I = auth.uid())',
        tbl || '_ins', tbl, col
      );
      execute format(
        'create policy %I on %I for update to authenticated using (%I = auth.uid()) with check (%I = auth.uid())',
        tbl || '_upd', tbl, col, col
      );
      execute format(
        'create policy %I on %I for delete to authenticated using (%I = auth.uid())',
        tbl || '_del', tbl, col
      );
    end if;
  end loop;
end;
$$;

-- =============================================================================
-- H) RLS POLICIES — Catalogs (public SELECT, service-role INSERT/UPDATE)
-- =============================================================================

do $$ begin
  create policy catalogs_public_read_skills on skills_catalog for select to authenticated, anon using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy catalogs_public_read_institutions on institutions_catalog for select to authenticated, anon using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy catalogs_public_read_companies on companies_catalog for select to authenticated, anon using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy catalogs_public_read_roles on roles_catalog for select to authenticated, anon using (true);
exception when duplicate_object then null;
end $$;

-- Authenticated users can insert new catalog entries
do $$ begin
  create policy catalogs_user_insert_skills on skills_catalog for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy catalogs_user_insert_institutions on institutions_catalog for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy catalogs_user_insert_companies on companies_catalog for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy catalogs_user_insert_roles on roles_catalog for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- I) UPDATED_AT TRIGGER (reusable)
-- =============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger trg_applicant_profiles_updated_at
    before update on applicant_profiles
    for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_applicant_experiences_updated_at
    before update on applicant_experiences
    for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_applicant_education_updated_at
    before update on applicant_education
    for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_tracker_items_updated_at
    before update on application_tracker_items
    for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- J) 1-CLICK APPLY — create platform application with profile snapshot
-- =============================================================================

create or replace function create_platform_application(
  p_job_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_resume_url text default '',
  p_profile_snapshot jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_id uuid;
  v_source_type text;
  v_existing_id uuid;
begin
  -- Verify job exists and is DIRECT (verified employer)
  select source_type into v_source_type
  from job_postings
  where id = p_job_id;

  if v_source_type is null then
    raise exception 'Job not found';
  end if;

  if v_source_type <> 'DIRECT' then
    raise exception 'Platform applications are only allowed for Verified Employer (DIRECT) jobs';
  end if;

  -- Check if user already applied
  select id into v_existing_id
  from applications
  where job_id = p_job_id
    and user_id = auth.uid();

  if v_existing_id is not null then
    raise exception 'You have already applied to this job';
  end if;

  -- Create the application
  insert into applications (
    job_id, user_id, first_name, last_name, email, resume_url,
    status, applicant_profile_snapshot, applicant_profile_version
  ) values (
    p_job_id, auth.uid(), p_first_name, p_last_name, p_email,
    coalesce(p_resume_url, ''),
    'new',
    p_profile_snapshot,
    'v1'
  )
  returning id into v_app_id;

  return v_app_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function create_platform_application to authenticated;

-- =============================================================================
-- K) SEED CATALOGS (minimal starter data)
-- =============================================================================

insert into skills_catalog (name, category, popularity_score) values
  ('JavaScript', 'Technical', 100),
  ('TypeScript', 'Technical', 95),
  ('React', 'Technical', 95),
  ('Node.js', 'Technical', 90),
  ('Python', 'Technical', 90),
  ('SQL', 'Technical', 85),
  ('PostgreSQL', 'Technical', 80),
  ('CSS', 'Technical', 80),
  ('HTML', 'Technical', 80),
  ('Git', 'Tools', 85),
  ('Docker', 'Tools', 75),
  ('AWS', 'Tools', 75),
  ('Figma', 'Tools', 70),
  ('Jira', 'Tools', 65),
  ('Agile', 'Soft', 70),
  ('Communication', 'Soft', 70),
  ('Leadership', 'Soft', 65),
  ('Problem Solving', 'Soft', 65),
  ('Project Management', 'Soft', 60),
  ('Data Analysis', 'Technical', 70),
  ('Machine Learning', 'Technical', 60),
  ('Java', 'Technical', 75),
  ('C#', 'Technical', 65),
  ('Go', 'Technical', 55),
  ('Rust', 'Technical', 45),
  ('Kotlin', 'Technical', 50),
  ('Swift', 'Technical', 50),
  ('Vue.js', 'Technical', 60),
  ('Angular', 'Technical', 60),
  ('Next.js', 'Technical', 65),
  ('Tailwind CSS', 'Technical', 65),
  ('GraphQL', 'Technical', 55),
  ('REST APIs', 'Technical', 80),
  ('CI/CD', 'Tools', 65),
  ('Kubernetes', 'Tools', 55),
  ('Linux', 'Tools', 70),
  ('Scrum', 'Soft', 60),
  ('Team Management', 'Soft', 55),
  ('UX Design', 'Technical', 55),
  ('Marketing', 'Soft', 50)
on conflict do nothing;

insert into roles_catalog (name, popularity_score) values
  ('Software Engineer', 100),
  ('Frontend Developer', 90),
  ('Backend Developer', 85),
  ('Full Stack Developer', 85),
  ('Data Analyst', 75),
  ('Data Scientist', 70),
  ('Product Manager', 80),
  ('Project Manager', 75),
  ('UX Designer', 70),
  ('UI Designer', 65),
  ('DevOps Engineer', 70),
  ('QA Engineer', 65),
  ('Marketing Manager', 65),
  ('Sales Manager', 60),
  ('Business Analyst', 65),
  ('Scrum Master', 55),
  ('CTO', 50),
  ('CEO', 45),
  ('HR Manager', 55),
  ('Accountant', 50)
on conflict do nothing;
