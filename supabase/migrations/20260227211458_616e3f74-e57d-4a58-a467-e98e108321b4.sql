
-- Partners module tables

CREATE TABLE IF NOT EXISTS public.signup_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  message text,
  status text NOT NULL DEFAULT 'PENDING',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert signup_requests" ON public.signup_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service read signup_requests" ON public.signup_requests
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.partner_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read partner_memberships" ON public.partner_memberships
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.partner_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read partner_events" ON public.partner_events
  FOR SELECT USING (true);

-- Billing / feature-flag columns on employers (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='billing_email') THEN
    ALTER TABLE public.employers ADD COLUMN billing_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='stripe_customer_id') THEN
    ALTER TABLE public.employers ADD COLUMN stripe_customer_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='features_json') THEN
    ALTER TABLE public.employers ADD COLUMN features_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
