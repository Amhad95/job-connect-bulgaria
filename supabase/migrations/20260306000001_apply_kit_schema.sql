-- =============================================================================
-- Apply Kit Schema: AI CV & Cover Letter Tailoring
-- Migration: 20260306000001_apply_kit_schema.sql
-- =============================================================================

-- =============================================================================
-- A) TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- apply_kit_documents
-- Stores both uploaded base documents and generated finalized documents.
-- ---------------------------------------------------------------------------
create table if not exists apply_kit_documents (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  doc_type                text        not null check (doc_type in ('cv', 'cover_letter')),
  source                  text        not null check (source in ('uploaded', 'generated')),
  file_name               text        not null,
  storage_path            text        not null,
  mime_type               text,
  file_size_bytes         int,
  is_primary              boolean     not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  linked_job_id           uuid        references job_postings(id) on delete set null,
  target_company          text,
  target_job_title        text,
  target_job_url          text,
  custom_prompt           text,
  approved_markdown       text,
  approved_structured_json jsonb,
  template_version        text,
  privacy_mode            text        not null default 'store' check (privacy_mode in ('store', 'no_store_base')),
  base_document_id        uuid        references apply_kit_documents(id) on delete set null
);

-- Indexes
create index idx_akd_user_doctype_created on apply_kit_documents(user_id, doc_type, created_at desc);
create index idx_akd_linked_job           on apply_kit_documents(linked_job_id) where linked_job_id is not null;

-- Enforce only one primary CV and one primary cover letter per user
create unique index uq_akd_primary_per_user_doctype
  on apply_kit_documents(user_id, doc_type)
  where is_primary = true;

comment on table apply_kit_documents is
  'Stores uploaded base documents and AI-generated finalized documents for the Apply Kit.';

-- ---------------------------------------------------------------------------
-- apply_kit_generations
-- Tracks each AI generation session (including refinements).
-- ---------------------------------------------------------------------------
create table if not exists apply_kit_generations (
  id                            uuid        primary key default gen_random_uuid(),
  user_id                       uuid        not null references auth.users(id) on delete cascade,
  doc_type                      text        not null check (doc_type in ('cv', 'cover_letter')),
  mode                          text        not null check (mode in ('job_specific', 'manual')),
  status                        text        not null default 'processing'
                                            check (status in ('processing', 'draft_ready', 'finalized', 'failed')),
  privacy_mode                  text        not null default 'store' check (privacy_mode in ('store', 'no_store_base')),
  linked_job_id                 uuid        references job_postings(id) on delete set null,
  target_company                text,
  target_job_title              text,
  target_job_description        text,
  custom_prompt                 text,
  base_document_id              uuid        references apply_kit_documents(id) on delete set null,
  base_document_storage_path    text,
  base_document_extracted_text  text,
  latest_preview_markdown       text,
  latest_preview_structured_json jsonb,
  error_message                 text,
  retry_count                   int         not null default 0,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- Indexes
create index idx_akg_user_status   on apply_kit_generations(user_id, status);
create index idx_akg_linked_job    on apply_kit_generations(linked_job_id) where linked_job_id is not null;
create index idx_akg_created       on apply_kit_generations(created_at desc);

comment on table apply_kit_generations is
  'Tracks AI generation sessions for the Apply Kit, including status and refinement state.';

-- ---------------------------------------------------------------------------
-- apply_kit_generation_messages
-- Stores refinement loop conversation messages.
-- ---------------------------------------------------------------------------
create table if not exists apply_kit_generation_messages (
  id              uuid        primary key default gen_random_uuid(),
  generation_id   uuid        not null references apply_kit_generations(id) on delete cascade,
  role            text        not null check (role in ('system', 'user', 'assistant')),
  content         text        not null,
  created_at      timestamptz not null default now()
);

create index idx_akgm_generation on apply_kit_generation_messages(generation_id, created_at);

comment on table apply_kit_generation_messages is
  'Stores conversation messages for the Apply Kit refinement loop.';

-- =============================================================================
-- B) ENABLE RLS
-- =============================================================================

alter table apply_kit_documents          enable row level security;
alter table apply_kit_generations        enable row level security;
alter table apply_kit_generation_messages enable row level security;

-- =============================================================================
-- C) RLS POLICIES — apply_kit_documents
-- =============================================================================

create policy "akd: user select own"
  on apply_kit_documents for select
  using (user_id = auth.uid());

create policy "akd: user insert own"
  on apply_kit_documents for insert
  with check (user_id = auth.uid());

create policy "akd: user update own"
  on apply_kit_documents for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "akd: user delete own"
  on apply_kit_documents for delete
  using (user_id = auth.uid());

-- =============================================================================
-- D) RLS POLICIES — apply_kit_generations
-- =============================================================================

create policy "akg: user select own"
  on apply_kit_generations for select
  using (user_id = auth.uid());

create policy "akg: user insert own"
  on apply_kit_generations for insert
  with check (user_id = auth.uid());

create policy "akg: user update own"
  on apply_kit_generations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "akg: user delete own"
  on apply_kit_generations for delete
  using (user_id = auth.uid());

-- =============================================================================
-- E) RLS POLICIES — apply_kit_generation_messages
-- Users can read/write messages for their own generations only.
-- =============================================================================

create policy "akgm: user select own"
  on apply_kit_generation_messages for select
  using (
    exists (
      select 1 from apply_kit_generations g
      where g.id = generation_id
        and g.user_id = auth.uid()
    )
  );

create policy "akgm: user insert own"
  on apply_kit_generation_messages for insert
  with check (
    exists (
      select 1 from apply_kit_generations g
      where g.id = generation_id
        and g.user_id = auth.uid()
    )
  );

create policy "akgm: user delete own"
  on apply_kit_generation_messages for delete
  using (
    exists (
      select 1 from apply_kit_generations g
      where g.id = generation_id
        and g.user_id = auth.uid()
    )
  );

-- =============================================================================
-- F) HELPER FUNCTION: set_apply_kit_document_primary
-- Ensures only one primary document per user per doc_type.
-- Called before setting is_primary = true.
-- =============================================================================

create or replace function set_apply_kit_document_primary(
  p_document_id uuid,
  p_user_id     uuid,
  p_doc_type    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clear existing primary for this user + doc_type
  update apply_kit_documents
  set is_primary = false, updated_at = now()
  where user_id = p_user_id
    and doc_type = p_doc_type
    and is_primary = true
    and id != p_document_id;

  -- Set the new primary
  update apply_kit_documents
  set is_primary = true, updated_at = now()
  where id = p_document_id
    and user_id = p_user_id
    and doc_type = p_doc_type;

  if not found then
    raise exception 'Document % not found for user', p_document_id;
  end if;
end;
$$;

comment on function set_apply_kit_document_primary(uuid, uuid, text) is
  'Atomically sets a document as primary, clearing any existing primary of the same type for the user.';

-- =============================================================================
-- G) STORAGE BUCKET
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'apply-kit',
  'apply-kit',
  false,
  5242880, -- 5 MB
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Storage policies: users can manage their own files
create policy "ak_storage: user upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'apply-kit'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ak_storage: user read own"
  on storage.objects for select
  using (
    bucket_id = 'apply-kit'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ak_storage: user update own"
  on storage.objects for update
  using (
    bucket_id = 'apply-kit'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ak_storage: user delete own"
  on storage.objects for delete
  using (
    bucket_id = 'apply-kit'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
