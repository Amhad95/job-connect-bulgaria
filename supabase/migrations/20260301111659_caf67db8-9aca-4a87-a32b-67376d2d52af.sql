
-- Fix the trigger function to use correct column name
CREATE OR REPLACE FUNCTION public.trg_admin_new_signup_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_key text;
begin
  v_key := 'admin.new_employer_request.' || new.id;

  perform queue_notification(
    p_event_type      := 'admin.new_employer_request',
    p_recipient_email := 'admin@bacham.bg',
    p_payload         := jsonb_build_object(
      'company_name',      new.company_name,
      'plan_id',           new.proposed_plan,
      'contact_email',     new.contact_email,
      'request_id',        new.id,
      'created_at',        new.created_at
    ),
    p_idempotency_key := v_key,
    p_channel         := 'email'
  );

  return new;
end;
$function$;
