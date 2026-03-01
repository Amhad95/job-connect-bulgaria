
-- Issue 1: Allow canonical_url to be NULL for DIRECT employer-posted jobs
ALTER TABLE job_postings ALTER COLUMN canonical_url DROP NOT NULL;

-- Issue 2: Drop old function first (changing return type from text to jsonb)
DROP FUNCTION IF EXISTS public.create_employer_invite(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_employer_invite(p_employer_id uuid, p_email text, p_role text DEFAULT 'member'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role   text;
  v_token         text;
  v_active_seats  int;
  v_plan_id       text;
  v_seat_cap      int;
  v_invite_id     uuid;
BEGIN
  IF NOT (p_role IN ('admin', 'member', 'viewer')) THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  SELECT role INTO v_caller_role
  FROM employer_profiles
  WHERE user_id = auth.uid() AND employer_id = p_employer_id;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized to invite members';
  END IF;

  IF p_role = 'admin' AND v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can invite admins';
  END IF;

  SELECT count(*)::int INTO v_active_seats
  FROM employer_profiles WHERE employer_id = p_employer_id;

  SELECT plan_id INTO v_plan_id
  FROM employer_subscriptions WHERE employer_id = p_employer_id;

  v_seat_cap := CASE COALESCE(v_plan_id, 'starter')
    WHEN 'enterprise' THEN 999999
    WHEN 'growth'     THEN 5
    ELSE                   1
  END;

  IF v_active_seats >= v_seat_cap THEN
    RAISE EXCEPTION 'Seat cap reached for plan % (%/%). Upgrade to invite more members.',
      UPPER(COALESCE(v_plan_id, 'starter')), v_active_seats, v_seat_cap;
  END IF;

  v_token := md5(random()::text || clock_timestamp()::text || p_email);

  UPDATE employer_invites SET status = 'revoked'
  WHERE employer_id = p_employer_id AND email = lower(p_email) AND status = 'pending';

  INSERT INTO employer_invites (employer_id, email, role, token, created_by, expires_at)
  VALUES (p_employer_id, lower(p_email), p_role, v_token, auth.uid(), now() + interval '7 days')
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object('ok', true, 'token', v_token, 'invite_id', v_invite_id);
END;
$function$;

-- Issue 3: Create revoke_employer_invite RPC
CREATE OR REPLACE FUNCTION public.revoke_employer_invite(p_invite_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employer_id uuid;
  v_caller_role text;
BEGIN
  SELECT employer_id INTO v_employer_id
  FROM employer_invites WHERE id = p_invite_id AND status = 'pending';

  IF v_employer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_not_found');
  END IF;

  SELECT role INTO v_caller_role
  FROM employer_profiles WHERE user_id = auth.uid() AND employer_id = v_employer_id;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  UPDATE employer_invites SET status = 'revoked' WHERE id = p_invite_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
