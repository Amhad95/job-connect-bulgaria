
-- 1. Add columns to employers
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS company_type varchar NOT NULL DEFAULT 'CRAWLED',
  ADD COLUMN IF NOT EXISTS is_signed_up_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ats_direct_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_tier varchar NOT NULL DEFAULT 'starter';

-- 2. Add columns to job_postings
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_bg text,
  ADD COLUMN IF NOT EXISTS approval_status varchar NOT NULL DEFAULT 'ACTIVE';

-- 3. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_job_age_days integer NOT NULL DEFAULT 30,
  auto_crawl_schedule text NOT NULL DEFAULT '0 0 * * *',
  scrape_unknown_policy text NOT NULL DEFAULT 'skip',
  user_agent text NOT NULL DEFAULT 'Bachkam/1.0',
  max_concurrent_scrapes integer NOT NULL DEFAULT 3,
  rate_limit_ms integer NOT NULL DEFAULT 1000,
  default_job_status text NOT NULL DEFAULT 'PENDING'
);

-- RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read system_settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- Seed one row
INSERT INTO public.system_settings (id) VALUES (gen_random_uuid());
