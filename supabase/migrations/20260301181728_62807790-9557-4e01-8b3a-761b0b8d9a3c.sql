-- 1. Add missing review_notes column to signup_requests
ALTER TABLE signup_requests ADD COLUMN IF NOT EXISTS review_notes text;

-- 2. Fix approve_employer_workspace: partner_events uses 'payload' not 'metadata'
CREATE OR REPLACE FUNCTION public.approve_employer_workspace(
  p_employer_id uuid,
  p_reviewer_uid uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_plan       text;
  v_sub_status text;
  v_trial_end  timestamptz;
begin
  update employers
  set
    approval_status       = 'approved',
    approval_reviewed_at  = now(),
    approval_reviewed_by  = p_reviewer_uid,
    approval_review_notes = p_review_notes
  where id = p_employer_id;

  select plan_id into v_plan
  from employer_subscriptions where employer_id = p_employer_id;

  if v_plan = 'growth' then
    v_sub_status := 'trialing';
    v_trial_end  := now() + interval '30 days';
  else
    v_sub_status := 'active';
    v_trial_end  := null;
  end if;

  update employer_subscriptions
  set status = v_sub_status, trial_ends_at = v_trial_end
  where employer_id = p_employer_id;

  update signup_requests
  set status = 'APPROVED', reviewed_at = now(), reviewed_by = p_reviewer_uid,
      review_notes = p_review_notes
  where employer_id = p_employer_id and status = 'PENDING';

  insert into partner_events (employer_id, event_type, payload)
  values (p_employer_id, 'APPROVED', jsonb_build_object(
    'reviewer', p_reviewer_uid, 'sub_status', v_sub_status
  ));
end;
$$;

-- 3. Fix reject_employer_workspace similarly
CREATE OR REPLACE FUNCTION public.reject_employer_workspace(
  p_employer_id uuid,
  p_reviewer_uid uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  update employers
  set
    approval_status       = 'rejected',
    approval_reviewed_at  = now(),
    approval_reviewed_by  = p_reviewer_uid,
    approval_review_notes = p_review_notes
  where id = p_employer_id;

  update employer_subscriptions
  set status = 'cancelled'
  where employer_id = p_employer_id;

  update signup_requests
  set status = 'REJECTED', reviewed_at = now(), reviewed_by = p_reviewer_uid,
      review_notes = p_review_notes
  where employer_id = p_employer_id and status = 'PENDING';

  insert into partner_events (employer_id, event_type, payload)
  values (p_employer_id, 'REJECTED', jsonb_build_object(
    'reviewer', p_reviewer_uid, 'notes', p_review_notes
  ));
end;
$$;