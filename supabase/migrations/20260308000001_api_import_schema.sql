-- =============================================================================
-- API Import Schema & TheirStack Seed
-- Migration: 20260308000001_api_import_schema.sql
-- =============================================================================

-- =============================================================================
-- 1. EXTEND JOB POSTINGS
-- =============================================================================

alter table job_postings
  add column if not exists ingestion_channel text,
  add column if not exists external_source_provider text,
  add column if not exists external_source_job_id text,
  add column if not exists source_url text,
  add column if not exists raw_source_payload jsonb;

create index if not exists idx_job_postings_provider on job_postings(external_source_provider, external_source_job_id);

-- ensure source_type 'EXTERNAL' exists (assumed true, but just enforcing understanding that it's an enum or text)
-- source_type is already part of public.job_source_type

-- =============================================================================
-- 2. CREATE JOB_API_SOURCES
-- =============================================================================

create table if not exists job_api_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  key text not null unique,
  name text not null,
  status text not null default 'active'
    check (status in ('active','paused','disabled')),
  base_url text,
  auth_mode text not null default 'bearer',
  config_json jsonb not null default '{}'::jsonb,
  last_watermark_at timestamptz,
  last_cursor text,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table job_api_sources enable row level security;
create policy "Admin only on job_api_sources" on job_api_sources for all using (
  auth.uid() in (select user_id from employer_profiles where role in ('admin', 'owner')) -- rough heuristic or real admin check
  -- If there's a specific system admin check, usually in this app service_role bypasses RLS, so default lock is fine for public
);
-- Just block public reads.
drop policy if exists "Admin only on job_api_sources" on job_api_sources;

create index if not exists idx_api_sources_provider_status on job_api_sources(provider, status);


-- =============================================================================
-- 3. CREATE JOB_IMPORT_RUNS
-- =============================================================================

create table if not exists job_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references job_api_sources(id) on delete cascade,
  provider text not null,
  status text not null
    check (status in ('running','completed','failed','partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  pages_fetched int not null default 0,
  records_received int not null default 0,
  records_inserted int not null default 0,
  records_updated int not null default 0,
  records_skipped_duplicate int not null default 0,
  records_failed int not null default 0,
  error_summary text,
  meta jsonb not null default '{}'::jsonb
);

alter table job_import_runs enable row level security;
create index if not exists idx_import_runs_source on job_import_runs(source_id, started_at desc);

-- =============================================================================
-- 4. CREATE JOB_IMPORT_ITEMS
-- =============================================================================

create table if not exists job_import_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references job_import_runs(id) on delete cascade,
  source_id uuid not null references job_api_sources(id) on delete cascade,
  provider text not null,
  external_source_job_id text not null,
  job_posting_id uuid references job_postings(id) on delete set null,
  source_url text,
  apply_url text,
  dedupe_key text,
  status text not null
    check (status in ('inserted','updated','duplicate_skipped','failed')),
  raw_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  -- Prevent importing the exact same job ID for the exact same source config repeatedly per provider:
  constraint unique_provider_source_extjob unique (provider, source_id, external_source_job_id)
);

alter table job_import_items enable row level security;
create index if not exists idx_import_items_run on job_import_items(run_id);
create index if not exists idx_import_items_ext_job on job_import_items(source_id, external_source_job_id);
create index if not exists idx_import_items_dedupe on job_import_items(dedupe_key);


-- =============================================================================
-- 5. SEED INITIAL CONFIGS
-- =============================================================================

insert into job_api_sources (provider, key, name, config_json)
values 
('theirstack', 'theirstack_bg_jobs', 'TheirStack • Bulgaria Jobs', 
 '{
  "page": 0,
  "limit": 100,
  "posted_at_max_age_days": 7,
  "job_country_code_or": ["BG"],
  "property_exists_or": ["final_url"],
  "include_total_results": false
 }'::jsonb),

('theirstack', 'theirstack_bg_internships', 'TheirStack • Bulgaria Internships', 
 '{
  "page": 0,
  "limit": 100,
  "posted_at_max_age_days": 14,
  "job_country_code_or": ["BG"],
  "job_title_or": ["intern", "internship", "trainee", "graduate", "entry level", "junior"],
  "property_exists_or": ["final_url"],
  "include_total_results": false
 }'::jsonb),

('theirstack', 'theirstack_eu_remote', 'TheirStack • EU Remote', 
 '{
  "page": 0,
  "limit": 100,
  "posted_at_max_age_days": 7,
  "remote": true,
  "job_country_code_or": ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"],
  "property_exists_or": ["final_url"],
  "include_total_results": false
 }'::jsonb),

('theirstack', 'theirstack_gcc_remote', 'TheirStack • GCC Remote', 
 '{
  "page": 0,
  "limit": 100,
  "posted_at_max_age_days": 7,
  "remote": true,
  "job_country_code_or": ["AE","SA","QA","KW","OM","BH"],
  "property_exists_or": ["final_url"],
  "include_total_results": false
 }'::jsonb)
on conflict (key) do update set 
  config_json = excluded.config_json,
  name = excluded.name;
