
-- Step 1a: Add missing columns to signup_requests
ALTER TABLE public.signup_requests
  ADD COLUMN IF NOT EXISTS proposed_plan text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS about text;

-- Step 1b: Make contact_name nullable (default to empty string for existing rows)
ALTER TABLE public.signup_requests
  ALTER COLUMN contact_name SET DEFAULT '',
  ALTER COLUMN contact_name DROP NOT NULL;

-- Step 1c: Drop the broken 7-arg version of provision_employer_workspace
DROP FUNCTION IF EXISTS public.provision_employer_workspace(uuid, text, text, text, text, text, text);

-- Step 1d: Recreate the 7-arg version with correct column mappings
CREATE OR REPLACE FUNCTION public.provision_employer_workspace(
  p_user_id uuid,
  p_company_name text,
  p_plan_id text,
  p_billing_interval text,
  p_email text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_about text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_employer_id   uuid;
  v_slug          text;
  v_request_id    uuid;
begin
  -- Generate unique slug
  v_slug := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug) || '-' || substr(gen_random_uuid()::text, 1, 6);

  -- Create employer in PENDING state
  insert into employers (name, slug, approval_status)
  values (p_company_name, v_slug, 'pending')
  returning id into v_employer_id;

  -- Link user as owner
  insert into employer_profiles (user_id, employer_id, role)
  values (p_user_id, v_employer_id, 'owner');

  -- Plan stored as pending_approval (trial/active only after admin approves)
  insert into employer_subscriptions (employer_id, plan_id, billing_interval, status)
  values (v_employer_id, p_plan_id, p_billing_interval, 'pending_approval')
  on conflict (employer_id) do nothing;

  -- Create signup_request intake record (using correct column names)
  insert into signup_requests (
    employer_id, submitted_by_uid, contact_email, contact_name, company_name,
    domain, about, proposed_plan, billing_interval, status
  )
  values (
    v_employer_id, p_user_id, coalesce(p_email, ''), p_company_name, p_company_name,
    p_domain, p_about, p_plan_id, p_billing_interval, 'PENDING'
  )
  returning id into v_request_id;

  -- Log event
  insert into partner_events (employer_id, event_type, payload)
  values (v_employer_id, 'SIGNUP_SUBMITTED', jsonb_build_object(
    'plan', p_plan_id,
    'interval', p_billing_interval,
    'request_id', v_request_id
  ));

  return jsonb_build_object(
    'employer_id',  v_employer_id,
    'request_id',   v_request_id,
    'status',       'pending_approval'
  );
end;
$$;
