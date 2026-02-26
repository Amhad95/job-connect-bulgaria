
-- Enums
CREATE TYPE policy_status_enum AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');
CREATE TYPE policy_mode_enum AS ENUM ('OFF', 'METADATA_ONLY', 'FULL_TEXT_ALLOWED', 'FEED_ONLY');
CREATE TYPE job_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE store_mode_enum AS ENUM ('METADATA_ONLY', 'FULL_TEXT');
CREATE TYPE removal_status_enum AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'REJECTED');
CREATE TYPE policy_check_result_enum AS ENUM ('PASS', 'FAIL');
CREATE TYPE crawl_run_status_enum AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- employers
CREATE TABLE public.employers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  website_domain text,
  logo_url text,
  industry_tags text[] DEFAULT '{}',
  hq_city text,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read employers" ON public.employers FOR SELECT USING (true);

-- employer_sources
CREATE TABLE public.employer_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  careers_home_url text,
  jobs_list_url text,
  ats_type text,
  policy_status policy_status_enum NOT NULL DEFAULT 'PENDING',
  policy_mode policy_mode_enum NOT NULL DEFAULT 'OFF',
  robots_url text,
  terms_url text,
  robots_last_checked_at timestamptz,
  terms_last_checked_at timestamptz,
  policy_reason text,
  last_crawl_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read employer_sources" ON public.employer_sources FOR SELECT USING (true);

-- policy_checks
CREATE TABLE public.policy_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_source_id uuid NOT NULL REFERENCES public.employer_sources(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  robots_snapshot_hash text,
  terms_snapshot_hash text,
  allowed_paths_json jsonb,
  blocked_paths_json jsonb,
  result policy_check_result_enum NOT NULL,
  notes text
);
ALTER TABLE public.policy_checks ENABLE ROW LEVEL SECURITY;
-- No public access; service role only

-- crawl_runs
CREATE TABLE public.crawl_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_source_id uuid NOT NULL REFERENCES public.employer_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  jobs_found integer DEFAULT 0,
  jobs_added integer DEFAULT 0,
  jobs_updated integer DEFAULT 0,
  jobs_removed integer DEFAULT 0,
  errors_json jsonb,
  status crawl_run_status_enum NOT NULL DEFAULT 'RUNNING'
);
ALTER TABLE public.crawl_runs ENABLE ROW LEVEL SECURITY;
-- No public access; service role only

-- job_postings
CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  employer_source_id uuid REFERENCES public.employer_sources(id) ON DELETE SET NULL,
  canonical_url text NOT NULL UNIQUE,
  apply_url text,
  title text NOT NULL,
  location_city text,
  location_region text,
  location_country text DEFAULT 'Bulgaria',
  work_mode text,
  employment_type text,
  seniority text,
  department text,
  category text,
  salary_min numeric,
  salary_max numeric,
  currency text DEFAULT 'BGN',
  salary_period text,
  language text DEFAULT 'bg',
  posted_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_scraped_at timestamptz,
  status job_status_enum NOT NULL DEFAULT 'ACTIVE',
  content_hash text,
  extraction_method text
);
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read job_postings" ON public.job_postings FOR SELECT USING (true);

-- job_posting_content
CREATE TABLE public.job_posting_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL UNIQUE REFERENCES public.job_postings(id) ON DELETE CASCADE,
  description_text text,
  requirements_text text,
  benefits_text text,
  store_mode store_mode_enum NOT NULL DEFAULT 'METADATA_ONLY'
);
ALTER TABLE public.job_posting_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read job_posting_content" ON public.job_posting_content FOR SELECT USING (true);

-- saved_jobs
CREATE TABLE public.saved_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own saved_jobs" ON public.saved_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- removal_requests
CREATE TABLE public.removal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  requester_email text,
  company_name text,
  reason text,
  status removal_status_enum NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.removal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit removal requests" ON public.removal_requests FOR INSERT WITH CHECK (true);

-- blocked_urls
CREATE TABLE public.blocked_urls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_pattern text NOT NULL,
  domain text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blocked_urls ENABLE ROW LEVEL SECURITY;
-- No public access; service role only

-- Modify tracker_items: add job linking columns
ALTER TABLE public.tracker_items
  ADD COLUMN job_id uuid,
  ADD COLUMN canonical_url text,
  ADD COLUMN apply_url text;

-- Indexes
CREATE INDEX idx_job_postings_employer ON public.job_postings(employer_id);
CREATE INDEX idx_job_postings_status ON public.job_postings(status);
CREATE INDEX idx_job_postings_posted_at ON public.job_postings(posted_at DESC);
CREATE INDEX idx_employer_sources_employer ON public.employer_sources(employer_id);
CREATE INDEX idx_employer_sources_status ON public.employer_sources(policy_status);
CREATE INDEX idx_saved_jobs_user ON public.saved_jobs(user_id);
CREATE INDEX idx_blocked_urls_domain ON public.blocked_urls(domain);
