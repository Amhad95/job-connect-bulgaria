-- =============================================================================
-- Migration: 20260304000002_milestone6_employer_lifecycle_notifications.sql
-- Patches approve_employer_workspace() and reject_employer_workspace() to queue
-- notification events via queue_notification().
-- Also queues employer.signup_pending from provision_employer_workspace().
-- Also creates admin.new_employer_request trigger on signup_requests insert.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Trigger: admin.new_employer_request
--    Fires after insert into signup_requests
-- ---------------------------------------------------------------------------
create or replace function trg_admin_new_signup_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_key text;
begin
  v_key := 'admin.new_employer_request.' || new.id;

  perform queue_notification(
    p_event_type      := 'admin.new_employer_request',
    p_recipient_email := 'admin@bacham.bg', -- overridden by ADMIN_EMAILS env in edge fn
    p_payload         := jsonb_build_object(
      'company_name',      new.company_name,
      'plan_id',           new.proposed_plan,
      'submitted_by_email', new.submitted_by_email,
      'request_id',        new.id,
      'created_at',        new.created_at
    ),
    p_idempotency_key := v_key,
    p_channel         := 'email'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_signup_request on signup_requests;
create trigger trg_notify_admin_on_signup_request
  after insert on signup_requests
  for each row
  execute function trg_admin_new_signup_request();

-- ---------------------------------------------------------------------------
-- B) Trigger: employer.approved / employer.rejected
--    Fires after UPDATE on employers table when approval_status changes
-- ---------------------------------------------------------------------------
create or replace function trg_employer_approval_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_email text;
  v_event_type  text;
  v_plan_id     text;
  v_key         text;
begin
  -- Only fire on approval_status change
  if new.approval_status = old.approval_status then return new; end if;

  -- Map status to event type
  v_event_type := case new.approval_status
    when 'approved'  then 'employer.approved'
    when 'rejected'  then 'employer.rejected'
    when 'suspended' then 'employer.suspended'
    else null
  end;

  if v_event_type is null then return new; end if;

  v_owner_email := get_employer_owner_email(new.id);
  if v_owner_email is null then return new; end if;

  select plan_id into v_plan_id
  from employer_subscriptions where employer_id = new.id limit 1;

  v_key := v_event_type || '.' || new.id || '.' || new.approval_status;

  perform queue_notification(
    p_event_type      := v_event_type,
    p_recipient_email := v_owner_email,
    p_payload         := jsonb_build_object(
      'company_name', new.name,
      'plan_id',      v_plan_id,
      'plan_label',   initcap(v_plan_id)
    ),
    p_idempotency_key := v_key,
    p_channel         := 'both',
    p_employer_id     := new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_employer_approval on employers;
create trigger trg_notify_employer_approval
  after update on employers
  for each row
  execute function trg_employer_approval_notification();

-- ---------------------------------------------------------------------------
-- C) Trigger: employer.signup_pending
--    Fires after INSERT into employers (new workspace created)
-- ---------------------------------------------------------------------------
create or replace function trg_employer_signup_pending_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_email text;
  v_plan_id     text;
  v_key         text;
begin
  -- Small delay: wait for employer_profiles and subscriptions to be created
  -- Queue it now; the edge function will retry if email not yet resolvable
  v_key := 'employer.signup_pending.' || new.id;

  -- Get plan from signup_requests (most recently created for this employer)
  select proposed_plan into v_plan_id
  from signup_requests where employer_id = new.id order by created_at desc limit 1;

  -- Get owner email via auth.users (set during provision_employer_workspace)
  select u.email into v_owner_email
  from employer_profiles ep
  join auth.users u on u.id = ep.user_id
  where ep.employer_id = new.id and ep.role = 'owner'
  limit 1;

  perform queue_notification(
    p_event_type      := 'employer.signup_pending',
    p_recipient_email := coalesce(v_owner_email, 'unknown@example.com'),
    p_payload         := jsonb_build_object(
      'company_name', new.name,
      'plan_id',      coalesce(v_plan_id, 'starter'),
      'plan_label',   initcap(coalesce(v_plan_id, 'starter'))
    ),
    p_idempotency_key := v_key,
    p_channel         := 'email',
    p_employer_id     := new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_employer_signup_pending on employers;
create trigger trg_notify_employer_signup_pending
  after insert on employers
  for each row
  execute function trg_employer_signup_pending_notification();
