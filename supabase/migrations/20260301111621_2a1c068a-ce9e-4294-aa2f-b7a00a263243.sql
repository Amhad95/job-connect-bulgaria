
-- Create a no-op queue_notification stub so triggers don't fail
-- This will be replaced with a real implementation when notifications are fully wired
CREATE OR REPLACE FUNCTION public.queue_notification(
  p_event_type text,
  p_recipient_email text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_channel text DEFAULT 'email',
  p_employer_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Stub: log to partner_events if employer_id provided, otherwise no-op
  IF p_employer_id IS NOT NULL THEN
    INSERT INTO partner_events (employer_id, event_type, payload)
    VALUES (p_employer_id, p_event_type, p_payload);
  END IF;
END;
$$;
