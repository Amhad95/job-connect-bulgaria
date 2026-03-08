

## Plan: Integrate LinkedIn Jobs (RapidAPI / Fantastic.jobs) as a New API Source

This adds a second API provider (`linkedin_rapidapi`) to the existing API Sources architecture, reusing the same tables, admin UI, and normalization pipeline as TheirStack.

---

### Part 1: Secrets Configuration

Use the `add_secret` tool to request two secrets:
- `RAPIDAPI_LINKEDIN_JOBS_KEY` — the RapidAPI key
- `RAPIDAPI_LINKEDIN_JOBS_HOST` — value: `linkedin-job-search-api.p.rapidapi.com`

---

### Part 2: Edge Function — `import-linkedin-rapidapi`

Create `supabase/functions/import-linkedin-rapidapi/index.ts`.

Follows the same pattern as `import-theirstack` but adapted for the RapidAPI GET-based API:

- Reads `RAPIDAPI_LINKEDIN_JOBS_KEY` and `RAPIDAPI_LINKEDIN_JOBS_HOST` from env
- Accepts `{ source_id? }` body — runs one source or all active `linkedin_rapidapi` sources
- For each source:
  - Creates a `job_import_runs` row
  - Reads `config_json` for endpoint, limit, offset, filters
  - Builds GET URL: `https://{host}/{endpoint}?limit=...&offset=...&location_filter=...&description_type=text&agency=false&...`
  - Paginates via `offset` increments (max 5 pages safety cap)
  - For each job in response array:
    - **Provider-level dedupe**: check `job_import_items` for `provider=linkedin_rapidapi` + `source_id` + `external_source_job_id`
    - **Cross-source dedupe**: normalize apply URL (strip UTM params, trailing slash, lowercase host) and check `job_postings.canonical_url`
    - **Employer resolution**: reuse `getOrCreateEmployer()` with `job.organization` and domain derived from `job.organization_url`
    - **Insert `job_postings`**: map fields per normalization spec below
    - **Insert `job_posting_content`**: `description_text` from `job.description_text`
    - **Insert `job_import_items`**: audit record
  - Updates `job_import_runs` with stats
  - Updates `job_api_sources.last_run_at`

**Normalization mapping:**
```
title             ← job.title
employer_id       ← resolved employer
canonical_url     ← cleaned job.external_apply_url || job.url
apply_url         ← job.external_apply_url || job.url
source_url        ← job.url
source_type       = 'EXTERNAL'
ingestion_channel = 'api'
external_source_provider = 'linkedin_rapidapi'
external_source_job_id   = String(job.id)
posted_at         ← job.date_posted
location_city     ← first city from cities_derived
location_slug     ← normalizeCitySlug(city)
location_country  ← first country from countries_derived
work_mode         ← 'remote' if remote_derived, else from ai_work_arrangement
employment_type   ← first from employment_type array
seniority         ← job.seniority
industry          ← job.linkedin_org_industry
status            = 'ACTIVE'
approval_status   = 'PENDING'
raw_source_payload = full raw job JSON
```

Add to `supabase/config.toml`:
```toml
[functions.import-linkedin-rapidapi]
  verify_jwt = false
```

---

### Part 3: Seed 4 Source Configs

Insert into `job_api_sources` via migration (or seed):

| key | name | provider | config_json |
|-----|------|----------|-------------|
| linkedin_bg_jobs | LinkedIn API - Bulgaria Jobs | linkedin_rapidapi | `{endpoint: "active-jb-7d", limit: 100, offset: 0, description_type: "text", location_filter: "Bulgaria", agency: false, order: "desc"}` |
| linkedin_bg_internships | LinkedIn API - Bulgaria Internships | linkedin_rapidapi | `{endpoint: "active-jb-7d", limit: 100, offset: 0, description_type: "text", location_filter: "Bulgaria", title_filter: "intern OR internship OR trainee OR graduate OR junior", type_filter: "INTERN,OTHER,FULL_TIME", agency: false, order: "desc"}` |
| linkedin_eu_remote | LinkedIn API - EU Remote | linkedin_rapidapi | `{endpoint: "active-jb-7d", limit: 100, offset: 0, description_type: "text", remote: true, location_filter: "Austria OR Belgium OR Bulgaria OR ...(all EU)", agency: false, order: "desc"}` |
| linkedin_gcc_remote | LinkedIn API - GCC Remote | linkedin_rapidapi | `{endpoint: "active-jb-7d", limit: 100, offset: 0, description_type: "text", remote: true, location_filter: "United Arab Emirates OR Saudi Arabia OR Qatar OR Kuwait OR Oman OR Bahrain", agency: false, order: "desc"}` |

Using `active-jb-7d` instead of `active-jb-1h` for initial backfill (more jobs). The endpoint is configurable in `config_json` so admin can switch later.

---

### Part 4: Admin UI Updates — `AdminApiSources.tsx`

**Providers tab**: Add a LinkedIn API row alongside TheirStack, showing active config count.

**triggerImport mutation**: Route to the correct edge function based on the source's `provider` field. When `provider === 'linkedin_rapidapi'`, invoke `import-linkedin-rapidapi`; otherwise invoke `import-theirstack`. The "Run All Active" button will invoke both functions.

**Imported Jobs query**: The existing query on `job_import_items` already works provider-agnostically — no changes needed for runs/items/errors tabs beyond the provider column already showing.

---

### Part 5: Public Jobs Integration

Already handled. The `useJobs` hook fetches all `ACTIVE` jobs from `job_postings`. LinkedIn API jobs will:
- Have `approval_status = 'PENDING'` initially, requiring admin approval (as established in the recent fix)
- Once approved, appear on `/jobs` like all other external listings
- Show the "External Listing" badge (determined by `source_type === 'EXTERNAL'`)
- Use outbound apply URL (not platform apply)

No changes needed to `useJobs.ts` or the public jobs UI.

---

### Part 6: i18n Strings

Add to both `en.ts` and `bg.ts`:
- Provider name: "LinkedIn Jobs (RapidAPI)"
- Credential status labels
- Any new UI strings in the providers tab

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/import-linkedin-rapidapi/index.ts` | **New** — Edge function for LinkedIn RapidAPI import |
| `supabase/config.toml` | Add `verify_jwt = false` for new function |
| `src/pages/admin/AdminApiSources.tsx` | Add LinkedIn provider row; route trigger to correct function by provider |
| `src/i18n/en.ts` | Add LinkedIn API provider strings |
| `src/i18n/bg.ts` | Add LinkedIn API provider strings (Bulgarian) |

### Database Changes

- Insert 4 rows into `job_api_sources` table (data operation, not schema change)

### Secrets Required

- `RAPIDAPI_LINKEDIN_JOBS_KEY` — user must provide
- `RAPIDAPI_LINKEDIN_JOBS_HOST` — set to `linkedin-job-search-api.p.rapidapi.com`

### Post-Implementation

Once secrets are configured, admin can click "Run Now" on any LinkedIn source config, or the system can be triggered via the edge function directly. Jobs will land in the moderation queue (PENDING) for admin review before appearing publicly.

