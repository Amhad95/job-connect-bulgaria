-- Partners SaaS module schema
-- Apply via: Supabase Dashboard → SQL Editor

-- ── Signup Requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name        VARCHAR NOT NULL,
  domain              VARCHAR,
  careers_url         VARCHAR,
  logo_url            VARCHAR,
  about               TEXT,
  proposed_plan       VARCHAR DEFAULT 'starter',
  submitted_by_user_id UUID,
  submitted_by_email  VARCHAR,
  status              VARCHAR NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
  review_notes        TEXT,
  reviewed_by         UUID,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on signup_requests" ON public.signup_requests USING (true) WITH CHECK (true);

-- ── Partner Memberships (users per partner company) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id     UUID,                                        -- null = pending invite
  email       VARCHAR NOT NULL,
  role        VARCHAR NOT NULL DEFAULT 'RECRUITER',        -- COMPANY_ADMIN | RECRUITER | VIEWER
  status      VARCHAR NOT NULL DEFAULT 'INVITED',          -- INVITED | ACTIVE | DISABLED
  invite_token VARCHAR,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE public.partner_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on partner_memberships" ON public.partner_memberships USING (true) WITH CHECK (true);

-- ── Partner Events (activity log) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  event_type  VARCHAR NOT NULL,   -- APPROVED | PLAN_CHANGED | USER_INVITED | ROLE_POSTED | SUSPENDED
  actor_id    UUID,               -- admin or company user
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on partner_events" ON public.partner_events USING (true) WITH CHECK (true);

-- ── Add partner feature flags / limits to employers ──────────────────────────
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS billing_status        VARCHAR DEFAULT 'unset',   -- ok | past_due | unset
  ADD COLUMN IF NOT EXISTS renewal_date          DATE,
  ADD COLUMN IF NOT EXISTS max_active_roles      INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_seats             INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS feature_direct_apply  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_ai_ranking    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_ai_cv         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_ai_cover      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_ai_suggestions BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes           TEXT,
  ADD COLUMN IF NOT EXISTS is_verified           BOOLEAN DEFAULT false;
