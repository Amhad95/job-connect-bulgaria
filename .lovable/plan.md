

## Plan: Add JSearch (RapidAPI) Import Integration

### Overview
Add a new edge function `import-jsearch` that uses the JSearch API (via RapidAPI) to search for jobs by query+location. This follows the exact same pattern as the existing `import-linkedin-rapidapi` and `import-theirstack` functions, reusing the same tables (`job_api_sources`, `job_import_runs`, `job_import_items`).

### Key Constraints
- **200 monthly request limit** (free plan) — each page = 1 request credit
- **10 results per page**, pages 1-50
- Search-based: each source config stores a `query` (e.g. "marketing jobs in sofia") and `country` (e.g. "bg")

### Changes

#### 1. Add API Key Secret
- Use `add_secret` tool to request `RAPIDAPI_JSEARCH_KEY` from user (their RapidAPI key for JSearch)
- Host is fixed: `jsearch.p.rapidapi.com`

#### 2. New Edge Function: `supabase/functions/import-jsearch/index.ts`
Following the established pattern:
- Reads `job_api_sources` where `provider = 'jsearch'` and `status = 'active'`
- Each source's `config_json` holds: `{ query: "marketing jobs in sofia", country: "bg", date_posted: "week", num_pages: 2 }`
- Calls `GET https://jsearch.p.rapidapi.com/search?query=...&country=bg&page=1&num_pages=1`
- Maps JSearch response fields to `job_postings`:
  - `job_title` → `title`
  - `employer_name` → employer lookup/create
  - `job_apply_link` → `apply_url` / `canonical_url`
  - `job_city`, `job_country` → location fields
  - `job_description` → `job_posting_content`
  - `job_employment_type` → `employment_type`
  - `job_is_remote` → `work_mode`
  - `job_posted_at_datetime_utc` → `posted_at`
  - `job_id` → `external_source_job_id`
- **Credit protection** (same as other importers):
  - Global abort on 429/402
  - Duplicate circuit breaker (>80% dupes → stop)
  - Max 3 pages per source (conservative given 200/month limit)
  - Inter-source delay of 3 seconds
  - Read `x-ratelimit-requests-remaining` header

#### 3. Update `supabase/config.toml`
Add `verify_jwt = false` entry for `import-jsearch`.

#### 4. Update `AdminApiSources.tsx`
- Add "JSearch (RapidAPI)" row to the Providers table
- Wire `triggerImport` to call `import-jsearch` when `provider === 'jsearch'`
- Add JSearch to the "Run All Active" parallel invocation

#### 5. Create Source Configs in DB
After deployment, you'll create `job_api_sources` rows like:

| name | provider | config_json |
|------|----------|-------------|
| JSearch - Marketing Sofia | jsearch | `{ "query": "marketing jobs in sofia", "country": "bg", "date_posted": "week", "num_pages": 1 }` |
| JSearch - Sales Sofia | jsearch | `{ "query": "sales jobs in sofia", "country": "bg", "date_posted": "week", "num_pages": 1 }` |
| JSearch - Accountant Sofia | jsearch | `{ "query": "accountant jobs in sofia", "country": "bg", "date_posted": "week", "num_pages": 1 }` |

Each config uses `num_pages: 1` (10 results) to stay well within the 200 request/month budget. With 3 queries, that's only 3 requests per run.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/import-jsearch/index.ts` | New edge function (follows linkedin-rapidapi pattern) |
| `supabase/config.toml` | Add `[functions.import-jsearch]` with `verify_jwt = false` |
| `src/pages/admin/AdminApiSources.tsx` | Add JSearch provider row + wire trigger |

### Credit Budget Strategy
With 200 requests/month and `num_pages: 1` per source config:
- 3 source configs × 1 page each = **3 requests per run**
- You can safely run ~60 times per month (roughly twice daily)

