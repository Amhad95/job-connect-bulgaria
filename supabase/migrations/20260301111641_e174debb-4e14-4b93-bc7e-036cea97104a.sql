
-- Add 'pending_approval' to the allowed status values
ALTER TABLE public.employer_subscriptions
  DROP CONSTRAINT employer_subscriptions_status_check;

ALTER TABLE public.employer_subscriptions
  ADD CONSTRAINT employer_subscriptions_status_check
  CHECK (status = ANY (ARRAY['active', 'trialing', 'trial_expired', 'past_due', 'suspended', 'cancelled', 'expired', 'pending_approval']));
