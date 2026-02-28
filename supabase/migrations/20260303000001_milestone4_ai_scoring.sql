-- =============================================================================
-- Migration: 20260303000001_milestone4_ai_scoring.sql
-- AI scoring pipeline: lifecycle fields, rate limiting, plan gating,
-- trigger function, retry RPC.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Add ai_status + ai_error to applications
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'applications' and column_name = 'ai_status'
  ) then
    alter table applications
      add column ai_status text not null default 'pending'
        check (ai_status in ('pending', 'scoring', 'success', 'failed', 'unscored')),
      add column ai_error  text;
  end if;
end $$;

comment on column applications.ai_status is
  'pending = awaiting trigger. scoring = edge function running. '
  'success = score written. failed = error (see ai_error). '
  'unscored = plan does not include AI scoring (starter tier).';

create index if not exists idx_applications_ai_status on applications(ai_status);

-- ---------------------------------------------------------------------------
-- B) Scoring rate-limit tracking per employer per day
-- ---------------------------------------------------------------------------
create table if not exists ai_scoring_daily (
  id          uuid        primary key default gen_random_uuid(),
  employer_id uuid        not null references employers(id) on delete cascade,
  scored_date date        not null default current_date,
  count       int         not null default 0,

  constraint uq_ai_scoring_day unique (employer_id, scored_date)
);

create index if not exists idx_ai_scoring_daily_employer_date
  on ai_scoring_daily(employer_id, scored_date);

alter table ai_scoring_daily enable row level security;

-- Employers can read their own usage counter
create policy "aiday: employer read"
  on ai_scoring_daily for select
  using (
    exists (
      select 1 from employer_profiles ep
      where ep.user_id = auth.uid() and ep.employer_id = ai_scoring_daily.employer_id
    )
  );

create policy "aiday: deny user mutate"
  on ai_scoring_daily for all
  using (false);

comment on table ai_scoring_daily is
  'Rolling daily AI scoring count per employer. '
  'Incremented by queue_application_scoring() before dispatching. '
  'Plan limits: growth=100/day, enterprise=500/day, starter=0.';

-- ---------------------------------------------------------------------------
-- C) SECURITY DEFINER: queue_application_scoring
--    Called by pg_net trigger after application insert.
--    Checks plan + rate limit, sets ai_status, increments counter,
--    fires HTTP POST to score-application edge function.
--
--    Returns: 'queued' | 'unscored' | 'rate_limited' | 'error:<msg>'
-- ---------------------------------------------------------------------------
create or replace function queue_application_scoring(p_application_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id        uuid;
  v_employer_id   uuid;
  v_plan          text;
  v_daily_limit   int;
  v_today_count   int;
  v_supabase_url  text;
  v_service_key   text;
  v_fn_url        text;
begin
  -- 1. Get employer + plan
  select jp.employer_id, es.plan_id
  into v_employer_id, v_plan
  from applications a
  join job_postings jp on jp.id = a.job_id
  join employer_subscriptions es on es.employer_id = jp.employer_id
  where a.id = p_application_id;

  if v_employer_id is null then
    return 'error:employer_not_found';
  end if;

  -- 2. Plan gate: starter gets no AI scoring
  if v_plan = 'starter' or v_plan is null then
    update applications
    set ai_status = 'unscored'
    where id = p_application_id;
    return 'unscored';
  end if;

  -- 3. Rate limit check
  v_daily_limit := case v_plan
    when 'growth'     then 100
    when 'enterprise' then 500
    else 0
  end;

  select coalesce(sum(count), 0) into v_today_count
  from ai_scoring_daily
  where employer_id = v_employer_id and scored_date = current_date;

  if v_today_count >= v_daily_limit then
    update applications
    set ai_status = 'failed',
        ai_error  = 'Daily AI scoring limit reached (' || v_daily_limit || '/day on ' || v_plan || ' plan).'
    where id = p_application_id;
    return 'rate_limited';
  end if;

  -- 4. Increment daily counter (upsert)
  insert into ai_scoring_daily (employer_id, scored_date, count)
  values (v_employer_id, current_date, 1)
  on conflict (employer_id, scored_date)
  do update set count = ai_scoring_daily.count + 1;

  -- 5. Mark as scoring
  update applications
  set ai_status = 'scoring'
  where id = p_application_id;

  -- 6. Fire edge function via pg_net (non-blocking)
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key  := current_setting('app.service_role_key', true);

  if v_supabase_url is not null and v_service_key is not null then
    v_fn_url := v_supabase_url || '/functions/v1/score-application';

    perform net.http_post(
      url     := v_fn_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object('application_id', p_application_id)::text
    );
  end if;

  return 'queued';
end;
$$;

revoke all on function queue_application_scoring(uuid) from public;
grant execute on function queue_application_scoring(uuid) to authenticated;

comment on function queue_application_scoring(uuid) is
  'SECURITY DEFINER: Checks plan (starter=unscored), rate limit (growth=100/day, '
  'enterprise=500/day), increments counter, marks ai_status=scoring, fires '
  'pg_net HTTP POST to score-application edge function.';

-- ---------------------------------------------------------------------------
-- D) Trigger that fires queue_application_scoring after application insert
-- ---------------------------------------------------------------------------
create or replace function trg_application_score_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Run asynchronously via dedicated function (non-blocking path via pg_net inside)
  perform queue_application_scoring(new.id);
  return new;
end;
$$;

drop trigger if exists trg_score_on_application_insert on applications;

create trigger trg_score_on_application_insert
  after insert on applications
  for each row
  execute function trg_application_score_on_insert();

comment on trigger trg_score_on_application_insert on applications is
  'Fires queue_application_scoring() after each new application, which checks '
  'plan gating, rate limits, then dispatches to score-application edge function.';

-- ---------------------------------------------------------------------------
-- E) retry_application_scoring — employer-callable RPC
--    Allows employer to trigger a re-score for a failed application.
--    Enforces tenancy: caller must own the job that the application belongs to.
-- ---------------------------------------------------------------------------
create or replace function retry_application_scoring(p_application_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_is_member      boolean;
begin
  -- Tenancy check: caller must be an employer member for this application's job
  select
    a.ai_status,
    is_employer_member_for_job(a.job_id)
  into v_current_status, v_is_member
  from applications a
  where a.id = p_application_id;

  if not found then
    return 'error:not_found';
  end if;

  if not v_is_member then
    return 'error:unauthorized';
  end if;

  -- Only retry failed applications
  if v_current_status not in ('failed', 'pending') then
    return 'error:not_retryable (status=' || v_current_status || ')';
  end if;

  -- Reset score fields and re-queue
  update applications
  set ai_status = 'pending', ai_error = null,
      ai_match_score = null, ai_match_reasoning = null
  where id = p_application_id;

  return queue_application_scoring(p_application_id);
end;
$$;

revoke all on function retry_application_scoring(uuid) from public;
grant execute on function retry_application_scoring(uuid) to authenticated;

comment on function retry_application_scoring(uuid) is
  'Employer-callable RPC. Checks tenancy, resets ai_status to pending, '
  're-runs queue_application_scoring(). Returns queued/unscored/rate_limited/error:*.';

-- ---------------------------------------------------------------------------
-- F) App settings for pg_net URLs (set these in Supabase dashboard secrets)
--    These are referenced by queue_application_scoring() above.
--    Run separately in Supabase SQL editor after setting secrets:
--      ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
--      ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
-- ---------------------------------------------------------------------------
