-- Admin v2 schema additions
-- Run: supabase db push (or apply via Supabase Dashboard SQL editor)

-- Add company management fields to employers
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS company_type        VARCHAR  NOT NULL DEFAULT 'CRAWLED',
  ADD COLUMN IF NOT EXISTS is_signed_up_active BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ats_direct_access   BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_tier           VARCHAR  NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS about_text          TEXT;

-- Add scrape configuration to system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS scrape_unknown_policy  VARCHAR  NOT NULL DEFAULT 'skip',
  ADD COLUMN IF NOT EXISTS user_agent             VARCHAR  NOT NULL DEFAULT 'Bachkam/1.0 (+https://bachkam.com/robots)',
  ADD COLUMN IF NOT EXISTS max_concurrent_scrapes INTEGER  NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rate_limit_ms          INTEGER  NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS default_job_status     VARCHAR  NOT NULL DEFAULT 'PENDING';

-- Add admin write policy for system_settings (currently only SELECT policy exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Admin can update system settings'
  ) THEN
    CREATE POLICY "Admin can update system settings"
      ON public.system_settings FOR UPDATE USING (true);
  END IF;
END
$$;
