
-- ============================================================
-- 1. notification_events — outbox table
-- ============================================================
CREATE TABLE public.notification_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text NOT NULL,
  channel          text NOT NULL DEFAULT 'email',       -- email | in_app | both
  recipient_email  text,
  recipient_user_id uuid,
  employer_id      uuid REFERENCES public.employers(id),
  payload          jsonb NOT NULL DEFAULT '{}',
  idempotency_key  text,
  status           text NOT NULL DEFAULT 'queued',      -- queued | sent | failed | skipped
  error_message    text,
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_events_idempotency
  ON public.notification_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- No client access — only service_role
CREATE POLICY "ne: deny all client access"
  ON public.notification_events FOR ALL
  USING (false) WITH CHECK (false);

-- ============================================================
-- 2. notifications — in-app notifications
-- ============================================================
CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  link       text,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif: user read own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notif: user update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notif: deny insert/delete"
  ON public.notifications FOR ALL
  USING (false) WITH CHECK (false);

-- Enable realtime for in-app notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- 3. Replace queue_notification() stub with real implementation
-- ============================================================
CREATE OR REPLACE FUNCTION public.queue_notification(
  p_event_type       text,
  p_recipient_email  text,
  p_payload          jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key  text DEFAULT NULL,
  p_channel          text DEFAULT 'email',
  p_employer_id      uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id       uuid;
  v_supabase_url   text;
  v_service_key    text;
  v_fn_url         text;
BEGIN
  -- Idempotency: skip if this key already queued/sent
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM notification_events
      WHERE idempotency_key = p_idempotency_key
        AND status IN ('queued', 'sent')
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- Insert into outbox
  INSERT INTO notification_events (
    event_type, channel, recipient_email, employer_id,
    payload, idempotency_key, status
  )
  VALUES (
    p_event_type, p_channel, p_recipient_email, p_employer_id,
    p_payload, p_idempotency_key, 'queued'
  )
  RETURNING id INTO v_event_id;

  -- Also log to partner_events for audit (preserve existing behaviour)
  IF p_employer_id IS NOT NULL THEN
    INSERT INTO partner_events (employer_id, event_type, payload)
    VALUES (p_employer_id, p_event_type, p_payload);
  END IF;

  -- Fire edge function via pg_net
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key  := current_setting('app.service_role_key', true);

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    v_fn_url := v_supabase_url || '/functions/v1/dispatch-notification';

    PERFORM net.http_post(
      url     := v_fn_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object('event_id', v_event_id)::text
    );
  END IF;
END;
$$;

-- ============================================================
-- 4. Attach triggers (they reference functions that already exist)
-- ============================================================

-- 4a. Employer approval/rejection/suspension trigger
DROP TRIGGER IF EXISTS trg_notify_employer_approval ON public.employers;
CREATE TRIGGER trg_notify_employer_approval
  AFTER UPDATE ON public.employers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_employer_approval_notification();

-- 4b. Employer signup pending trigger  
DROP TRIGGER IF EXISTS trg_notify_employer_signup ON public.employers;
CREATE TRIGGER trg_notify_employer_signup
  AFTER INSERT ON public.employers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_employer_signup_pending_notification();

-- 4c. Admin new signup request trigger
DROP TRIGGER IF EXISTS trg_notify_admin_signup ON public.signup_requests;
CREATE TRIGGER trg_notify_admin_signup
  AFTER INSERT ON public.signup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_admin_new_signup_request();
