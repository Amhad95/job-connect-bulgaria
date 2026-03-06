-- =============================================================================
-- Employer ATS Upgrade Migration
-- Migration: 20260306000003_employer_ats_upgrade.sql
-- Parts A-F: Job fields, screening, notes, AI reviews, audit trail
-- =============================================================================

-- =============================================================================
-- A) JOB POSTINGS — add professional_field + industry, map existing category
-- =============================================================================

alter table job_postings
  add column if not exists professional_field text,
  add column if not exists industry text;

create index if not exists idx_job_postings_prof_field on job_postings(professional_field);
create index if not exists idx_job_postings_industry on job_postings(industry);

-- Map existing category values to professional_field where they match known fields
update job_postings
set professional_field = case lower(trim(category))
  when 'engineering' then 'Engineering'
  when 'software engineering' then 'Engineering'
  when 'development' then 'Engineering'
  when 'marketing' then 'Marketing'
  when 'sales' then 'Sales'
  when 'finance' then 'Finance'
  when 'hr' then 'HR'
  when 'human resources' then 'HR'
  when 'operations' then 'Operations'
  when 'customer support' then 'Customer Support'
  when 'support' then 'Customer Support'
  when 'design' then 'Design'
  when 'product' then 'Product'
  when 'product management' then 'Product'
  when 'data' then 'Data'
  when 'data science' then 'Data'
  when 'analytics' then 'Data'
  when 'legal' then 'Legal'
  when 'devops' then 'Engineering'
  when 'qa' then 'Engineering'
  when 'quality assurance' then 'Engineering'
  else category -- keep original value as professional_field if not matched
end
where category is not null and category <> '' and professional_field is null;

-- Map known industry-like categories to industry column
update job_postings
set industry = case lower(trim(category))
  when 'software' then 'Software'
  when 'fintech' then 'FinTech'
  when 'banking' then 'Banking'
  when 'telecom' then 'Telecom'
  when 'healthcare' then 'Healthcare'
  when 'retail' then 'Retail'
  when 'logistics' then 'Logistics'
  when 'manufacturing' then 'Manufacturing'
  when 'consulting' then 'Consulting'
  when 'public sector' then 'Public Sector'
  when 'technology' then 'Software'
  when 'it' then 'Software'
  else null
end
where category is not null and category <> '' and industry is null;

-- =============================================================================
-- B) APPLICATIONS — add profile_strength_score for composite ranking
-- =============================================================================

alter table applications
  add column if not exists profile_strength_score int
    check (profile_strength_score is null or (profile_strength_score >= 0 and profile_strength_score <= 100));

create index if not exists idx_applications_composite
  on applications(job_id, ai_match_score desc nulls last, profile_strength_score desc nulls last);

-- =============================================================================
-- C) JOB SCREENING QUESTIONS (Part F2)
-- =============================================================================

create table if not exists job_screening_questions (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references job_postings(id) on delete cascade,
  question    text not null,
  q_type      text not null default 'yes_no'
              check (q_type in ('yes_no', 'multiple_choice', 'short_text')),
  options     text[],  -- for multiple_choice
  knockout    boolean not null default false,
  knockout_answer text, -- expected answer for knockout
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_screening_q_job on job_screening_questions(job_id, sort_order);

-- =============================================================================
-- D) APPLICATION SCREENING ANSWERS (Part F2)
-- =============================================================================

create table if not exists application_screening_answers (
  id            uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  question_id   uuid not null references job_screening_questions(id) on delete cascade,
  answer        text not null,
  is_knockout   boolean not null default false, -- true if this answer triggered knockout
  created_at    timestamptz not null default now(),
  unique(application_id, question_id)
);

create index if not exists idx_screening_ans_app on application_screening_answers(application_id);

-- =============================================================================
-- E) APPLICATION NOTES (Part F3 — employer internal notes)
-- =============================================================================

create table if not exists application_notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  employer_id     uuid not null references employers(id) on delete cascade,
  created_by      uuid not null references auth.users(id) on delete cascade,
  note            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notes_app on application_notes(application_id, created_at desc);

-- =============================================================================
-- F) EMPLOYER AI REVIEWS (Part D — qualitative AI review reports)
-- =============================================================================

create table if not exists employer_ai_reviews (
  id                      uuid primary key default gen_random_uuid(),
  employer_id             uuid not null references employers(id) on delete cascade,
  job_id                  uuid not null references job_postings(id) on delete cascade,
  created_by              uuid not null references auth.users(id) on delete cascade,
  candidate_application_ids uuid[] not null,
  prompt_context          jsonb,
  report_markdown         text,
  status                  text not null default 'pending'
                          check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at              timestamptz not null default now()
);

create index if not exists idx_ai_reviews_job on employer_ai_reviews(job_id, created_at desc);

-- =============================================================================
-- G) EMPLOYER AUDIT EVENTS (Part F5 — GDPR compliance trail)
-- =============================================================================

create table if not exists employer_audit_events (
  id            uuid primary key default gen_random_uuid(),
  employer_id   uuid not null references employers(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action_type   text not null, -- create_job, publish_job, change_status, run_ai_review, delete_application, etc.
  entity_type   text not null, -- job_posting, application, ai_review, etc.
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_employer on employer_audit_events(employer_id, created_at desc);
create index if not exists idx_audit_entity on employer_audit_events(entity_type, entity_id);

-- =============================================================================
-- H) ENABLE RLS
-- =============================================================================

alter table job_screening_questions      enable row level security;
alter table application_screening_answers enable row level security;
alter table application_notes            enable row level security;
alter table employer_ai_reviews          enable row level security;
alter table employer_audit_events        enable row level security;

-- =============================================================================
-- I) RLS POLICIES — employer member scoped via employer_profiles
-- =============================================================================

-- Helper: check if user is a member of the employer that owns a job
-- Screening questions — readable by employer members who own the job
do $$ begin
  create policy screening_q_sel on job_screening_questions
    for select to authenticated
    using (
      exists (
        select 1 from job_postings jp
        join employer_profiles em on em.employer_id = jp.employer_id
        where jp.id = job_screening_questions.job_id
          and em.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy screening_q_ins on job_screening_questions
    for insert to authenticated
    with check (
      exists (
        select 1 from job_postings jp
        join employer_profiles em on em.employer_id = jp.employer_id
        where jp.id = job_screening_questions.job_id
          and em.user_id = auth.uid()
          and em.role in ('owner', 'admin', 'member')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy screening_q_upd on job_screening_questions
    for update to authenticated
    using (
      exists (
        select 1 from job_postings jp
        join employer_profiles em on em.employer_id = jp.employer_id
        where jp.id = job_screening_questions.job_id
          and em.user_id = auth.uid()
          and em.role in ('owner', 'admin', 'member')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy screening_q_del on job_screening_questions
    for delete to authenticated
    using (
      exists (
        select 1 from job_postings jp
        join employer_profiles em on em.employer_id = jp.employer_id
        where jp.id = job_screening_questions.job_id
          and em.user_id = auth.uid()
          and em.role in ('owner', 'admin')
      )
    );
exception when duplicate_object then null;
end $$;

-- Screening answers — readable by employer members
do $$ begin
  create policy screening_ans_sel on application_screening_answers
    for select to authenticated
    using (
      exists (
        select 1 from applications a
        join job_postings jp on jp.id = a.job_id
        join employer_profiles em on em.employer_id = jp.employer_id
        where a.id = application_screening_answers.application_id
          and em.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

-- Application notes — employer members can CRUD
do $$ begin
  create policy notes_sel on application_notes
    for select to authenticated
    using (
      exists (
        select 1 from employer_profiles em
        where em.employer_id = application_notes.employer_id
          and em.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy notes_ins on application_notes
    for insert to authenticated
    with check (
      exists (
        select 1 from employer_profiles em
        where em.employer_id = application_notes.employer_id
          and em.user_id = auth.uid()
          and em.role in ('owner', 'admin', 'member')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy notes_del on application_notes
    for delete to authenticated
    using (created_by = auth.uid());
exception when duplicate_object then null;
end $$;

-- AI reviews — employer members can read; creator/admin can delete
do $$ begin
  create policy ai_reviews_sel on employer_ai_reviews
    for select to authenticated
    using (
      exists (
        select 1 from employer_profiles em
        where em.employer_id = employer_ai_reviews.employer_id
          and em.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_reviews_ins on employer_ai_reviews
    for insert to authenticated
    with check (
      exists (
        select 1 from employer_profiles em
        where em.employer_id = employer_ai_reviews.employer_id
          and em.user_id = auth.uid()
          and em.role in ('owner', 'admin', 'member')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_reviews_del on employer_ai_reviews
    for delete to authenticated
    using (
      created_by = auth.uid()
      or exists (
        select 1 from employer_profiles em
        where em.employer_id = employer_ai_reviews.employer_id
          and em.user_id = auth.uid()
          and em.role in ('owner', 'admin')
      )
    );
exception when duplicate_object then null;
end $$;

-- Audit events — employer members can read, system inserts
do $$ begin
  create policy audit_sel on employer_audit_events
    for select to authenticated
    using (
      exists (
        select 1 from employer_profiles em
        where em.employer_id = employer_audit_events.employer_id
          and em.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy audit_ins on employer_audit_events
    for insert to authenticated
    with check (
      exists (
        select 1 from employer_profiles em
        where em.employer_id = employer_audit_events.employer_id
          and em.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;
