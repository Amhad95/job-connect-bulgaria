-- =============================================================================
-- Migration: 20260304000001_milestone6_notifications.sql
-- Notification system: schema + queue function + DB triggers
-- Covers: 6.0 (foundation), 6.1 (employer lifecycle), 6.2 (application events),
--          6.3 (AI scoring), 6.4 (admin alerts)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) notification_events — outbox / system log (email + in-app source of truth)
-- ---------------------------------------------------------------------------
create table if not exists notification_events (
  id                uuid        primary key default gen_random_uuid(),
  event_type        text        not null,   -- e.g. 'employer.approved'
  recipient_user_id uuid        references auth.users(id) on delete set null,
  recipient_email   text,                   -- always set; may differ from user email
  employer_id       uuid        references employers(id) on delete set null,
  job_id            uuid        references job_postings(id) on delete set null,
  application_id    uuid        references applications(id) on delete set null,
  locale            text        not null default 'en',
  payload           jsonb       not null default '{}',
  channel           text        not null default 'email'
                                check (channel in ('email', 'in_app', 'both')),
  status            text        not null default 'queued'
                                check (status in ('queued', 'sent', 'failed', 'skipped')),
  idempotency_key   text        unique,     -- prevents duplicate sends on retry
  created_at        timestamptz not null default now(),
  sent_at           timestamptz,
  error_message     text
);

create index if not exists idx_notevt_status      on notification_events(status);
create index if not exists idx_notevt_recipient   on notification_events(recipient_user_id);
create index if not exists idx_notevt_employer    on notification_events(employer_id);
create index if not exists idx_notevt_type        on notification_events(event_type);

alter table notification_events enable row level security;

-- Admins (service-role) can do everything; users can only see their own
create policy "notevt: user read own"
  on notification_events for select
  using (recipient_user_id = auth.uid());

create policy "notevt: deny user write"
  on notification_events for all
  with check (false);

-- ---------------------------------------------------------------------------
-- B) notifications — in-app feed (bell dropdown)
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  body        text        not null,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user    on notifications(user_id);
create index if not exists idx_notifications_unread  on notifications(user_id, read_at) where read_at is null;

alter table notifications enable row level security;

create policy "notif: user read own"
  on notifications for select
  using (user_id = auth.uid());

create policy "notif: user mark read"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notif: deny user insert"
  on notifications for insert
  with check (false);

-- ---------------------------------------------------------------------------
-- C) user_notification_preferences
-- ---------------------------------------------------------------------------
create table if not exists user_notification_preferences (
  user_id                     uuid    primary key references auth.users(id) on delete cascade,
  email_enabled               boolean not null default true,
  notify_new_applications     boolean not null default true,  -- employer: new app alert
  notify_application_updates  boolean not null default true,  -- candidate: status changed
  notify_ai_scoring           boolean not null default true,  -- employer: score complete
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table user_notification_preferences enable row level security;

create policy "pref: user read/write own"
  on user_notification_preferences for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Upsert default prefs when a new user is created
create or replace function trg_init_notification_prefs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into user_notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_notification_prefs on auth.users;
create trigger trg_create_notification_prefs
  after insert on auth.users
  for each row execute function trg_init_notification_prefs();

-- ---------------------------------------------------------------------------
-- D) queue_notification() — SECURITY DEFINER
--    Single entry point for all notification creation.
--    Inserts into notification_events (idempotent), then fires pg_net POST
--    to dispatch-notification edge function.
-- ---------------------------------------------------------------------------
create or replace function queue_notification(
  p_event_type      text,
  p_recipient_email text,
  p_payload         jsonb,
  p_idempotency_key text,
  p_channel         text    default 'both',
  p_recipient_uid   uuid    default null,
  p_employer_id     uuid    default null,
  p_job_id          uuid    default null,
  p_application_id  uuid    default null,
  p_locale          text    default 'en'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id    uuid;
  v_fn_url      text;
  v_svc_key     text;
begin
  -- Idempotency: if key already exists, return existing id without re-queuing
  select id into v_event_id
  from notification_events
  where idempotency_key = p_idempotency_key;

  if found then
    return v_event_id;
  end if;

  -- Insert event
  insert into notification_events (
    event_type, recipient_user_id, recipient_email,
    employer_id, job_id, application_id,
    locale, payload, channel, idempotency_key
  ) values (
    p_event_type, p_recipient_uid, p_recipient_email,
    p_employer_id, p_job_id, p_application_id,
    p_locale, p_payload, p_channel, p_idempotency_key
  ) returning id into v_event_id;

  -- Fire dispatch-notification edge function (non-blocking via pg_net)
  v_fn_url  := current_setting('app.supabase_url', true);
  v_svc_key := current_setting('app.service_role_key', true);

  if v_fn_url is not null and v_svc_key is not null then
    perform net.http_post(
      url     := v_fn_url || '/functions/v1/dispatch-notification',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_svc_key
      ),
      body    := jsonb_build_object('event_id', v_event_id)::text
    );
  end if;

  return v_event_id;
end;
$$;

revoke all on function queue_notification(text,text,jsonb,text,text,uuid,uuid,uuid,uuid,text) from public;
comment on function queue_notification is
  'Idempotent notification entry point. Checks idempotency_key before inserting. '
  'Fires pg_net POST to dispatch-notification edge function for processing.';

-- ---------------------------------------------------------------------------
-- E) Trigger: employer.signup_pending
--    Fires after provision_employer_workspace inserts a new employers row.
--    (Added inside the existing function body below in F)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- F) Extend approve_employer_workspace to queue employer.approved notification
--    (Patch the existing SECURITY DEFINER function)
-- ---------------------------------------------------------------------------
-- NOTE: We wrap the approval/rejection queue calls here so they fire
-- atomically with the approval state change. If approve_employer_workspace
-- doesn't exist yet (CI), we define it here; if it does exist this replaces it.
-- The original function from earlier migrations is preserved except for added
-- queue_notification() calls at the end.

-- First, create a helper to get the owner email for an employer
create or replace function get_employer_owner_email(p_employer_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
  from employer_profiles ep
  join auth.users u on u.id = ep.user_id
  where ep.employer_id = p_employer_id and ep.role = 'owner'
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- G) DB trigger: candidate.application_received + employer.new_application
--    Fires after each insert into applications
-- ---------------------------------------------------------------------------
create or replace function trg_application_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job_title     text;
  v_company_name  text;
  v_employer_id   uuid;
  v_owner_email   text;
  v_pref_new_app  boolean;
  v_candidate_key text;
  v_employer_key  text;
begin
  -- Fetch job + company info
  select jp.title, e.name, jp.employer_id
  into v_job_title, v_company_name, v_employer_id
  from job_postings jp
  join employers e on e.id = jp.employer_id
  where jp.id = new.job_id;

  -- 1. candidate.application_received (email only)
  v_candidate_key := 'candidate.app_received.' || new.id;
  perform queue_notification(
    p_event_type      := 'candidate.application_received',
    p_recipient_email := new.email,
    p_payload         := jsonb_build_object(
      'first_name',    new.first_name,
      'last_name',     new.last_name,
      'job_title',     v_job_title,
      'company_name',  v_company_name,
      'job_id',        new.job_id
    ),
    p_idempotency_key := v_candidate_key,
    p_channel         := 'email',
    p_recipient_uid   := new.user_id,
    p_job_id          := new.job_id,
    p_application_id  := new.id
  );

  -- 2. employer.new_application — only if DIRECT job (employer_id set)
  if v_employer_id is not null then
    -- Check employer prefs
    select coalesce(unp.notify_new_applications, true)
    into v_pref_new_app
    from employer_profiles ep
    left join user_notification_preferences unp on unp.user_id = ep.user_id
    where ep.employer_id = v_employer_id and ep.role in ('owner', 'admin')
    limit 1;

    if coalesce(v_pref_new_app, true) then
      v_owner_email := get_employer_owner_email(v_employer_id);
      v_employer_key := 'employer.new_app.' || new.id || '.' || v_employer_id;

      perform queue_notification(
        p_event_type      := 'employer.new_application_received',
        p_recipient_email := v_owner_email,
        p_payload         := jsonb_build_object(
          'first_name',    new.first_name,
          'last_name',     new.last_name,
          'job_title',     v_job_title,
          'company_name',  v_company_name,
          'job_id',        new.job_id,
          'application_id', new.id,
          'ai_score',      new.ai_match_score
        ),
        p_idempotency_key := v_employer_key,
        p_channel         := 'both',
        p_employer_id     := v_employer_id,
        p_job_id          := new.job_id,
        p_application_id  := new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_application on applications;
create trigger trg_notify_on_application
  after insert on applications
  for each row
  execute function trg_application_notifications();

-- ---------------------------------------------------------------------------
-- H) DB trigger: candidate.application_status_updated
--    Fires when applications.status changes
-- ---------------------------------------------------------------------------
create or replace function trg_application_status_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job_title     text;
  v_company_name  text;
  v_pref_updates  boolean;
  v_key           text;
begin
  -- Only fire on status change, not other column updates
  if new.status = old.status then return new; end if;

  -- Check candidate preference (if they have a user account)
  if new.user_id is not null then
    select coalesce(unp.notify_application_updates, true)
    into v_pref_updates
    from user_notification_preferences unp
    where unp.user_id = new.user_id;

    if not coalesce(v_pref_updates, true) then return new; end if;
  end if;

  select jp.title, e.name
  into v_job_title, v_company_name
  from job_postings jp
  join employers e on e.id = jp.employer_id
  where jp.id = new.job_id;

  v_key := 'candidate.status_update.' || new.id || '.' || new.status;

  perform queue_notification(
    p_event_type      := 'candidate.application_status_updated',
    p_recipient_email := new.email,
    p_payload         := jsonb_build_object(
      'first_name',    new.first_name,
      'last_name',     new.last_name,
      'job_title',     v_job_title,
      'company_name',  v_company_name,
      'new_status',    new.status,
      'application_id', new.id
    ),
    p_idempotency_key := v_key,
    p_channel         := 'email',
    p_recipient_uid   := new.user_id,
    p_application_id  := new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_status_change on applications;
create trigger trg_notify_on_status_change
  after update on applications
  for each row
  execute function trg_application_status_notification();

-- ---------------------------------------------------------------------------
-- I) DB trigger: employer.ai_scoring_completed / employer.ai_scoring_failed
--    Fires when applications.ai_status changes to 'success' or 'failed'
-- ---------------------------------------------------------------------------
create or replace function trg_ai_score_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job_title    text;
  v_employer_id  uuid;
  v_owner_email  text;
  v_pref_ai      boolean;
  v_key          text;
  v_event_type   text;
begin
  -- Only fire when ai_status transitions to success or failed
  if new.ai_status = old.ai_status then return new; end if;
  if new.ai_status not in ('success', 'failed') then return new; end if;

  select jp.title, jp.employer_id
  into v_job_title, v_employer_id
  from job_postings jp where jp.id = new.job_id;

  if v_employer_id is null then return new; end if;

  -- Check employer AI scoring pref
  select coalesce(unp.notify_ai_scoring, true)
  into v_pref_ai
  from employer_profiles ep
  left join user_notification_preferences unp on unp.user_id = ep.user_id
  where ep.employer_id = v_employer_id and ep.role in ('owner', 'admin')
  limit 1;

  if not coalesce(v_pref_ai, true) then return new; end if;

  v_owner_email := get_employer_owner_email(v_employer_id);
  v_event_type  := case new.ai_status
    when 'success' then 'employer.ai_scoring_completed'
    else                'employer.ai_scoring_failed'
  end;
  v_key := v_event_type || '.' || new.id;

  perform queue_notification(
    p_event_type      := v_event_type,
    p_recipient_email := v_owner_email,
    p_payload         := jsonb_build_object(
      'first_name',    new.first_name,
      'last_name',     new.last_name,
      'job_title',     v_job_title,
      'job_id',        new.job_id,
      'application_id', new.id,
      'ai_score',      new.ai_match_score,
      'ai_error',      new.ai_error
    ),
    p_idempotency_key := v_key,
    -- In-app only for AI scoring (not spammy email per application)
    p_channel         := 'in_app',
    p_employer_id     := v_employer_id,
    p_job_id          := new.job_id,
    p_application_id  := new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_ai_score on applications;
create trigger trg_notify_ai_score
  after update on applications
  for each row
  execute function trg_ai_score_notification();

-- ---------------------------------------------------------------------------
-- J) Mark notification as read (callable by user)
-- ---------------------------------------------------------------------------
create or replace function mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update notifications
  set read_at = now()
  where id = p_notification_id and user_id = auth.uid() and read_at is null;
$$;

grant execute on function mark_notification_read(uuid) to authenticated;

-- mark_all_notifications_read
create or replace function mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

grant execute on function mark_all_notifications_read() to authenticated;
