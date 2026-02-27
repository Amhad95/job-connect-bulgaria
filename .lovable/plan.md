

## Sync Database Schema to Match Frontend Code

The other AI wrote frontend code referencing columns and tables that don't exist. We need to create them and fix the edge function type errors.

### Step 1: Database Migration — Add Missing Columns and Table

**`employers` table** — add 4 columns:
- `company_type` varchar default `'CRAWLED'`
- `is_signed_up_active` boolean default `false`
- `ats_direct_access` boolean default `false`
- `plan_tier` varchar default `'starter'`

**`job_postings` table** — add 3 columns:
- `title_en` text nullable
- `title_bg` text nullable
- `approval_status` varchar default `'ACTIVE'` (existing jobs should be ACTIVE, not PENDING)

**Create `system_settings` table**:
- `id` uuid primary key
- `max_job_age_days` integer default 30
- `auto_crawl_schedule` text default `'0 0 * * *'`
- `scrape_unknown_policy` text default `'skip'`
- `user_agent` text default `'Bachkam/1.0'`
- `max_concurrent_scrapes` integer default 3
- `rate_limit_ms` integer default 1000
- `default_job_status` text default `'PENDING'`
- Seed one row so AdminSettings can load it
- RLS: public read, service-role write

### Step 2: Fix `crawl-source/index.ts` TypeScript Errors

Change the `upsertJobPosting` function signature to use `any` for the Supabase client type instead of `ReturnType<typeof createClient>`. This resolves all 9 type errors (the generic mismatch between the edge function's `createClient` and the helper's parameter type).

### Step 3: Regenerate Types

After migration, the Supabase types file auto-updates so `system_settings`, the new columns on `employers` and `job_postings` are recognized by the TypeScript client — removing the `as any` casts from AdminSettings, AdminCompanies, and AdminDashboard.

### Files Changed

| Target | Change |
|--------|--------|
| Database migration | Add columns to `employers`, `job_postings`; create `system_settings` |
| `supabase/functions/crawl-source/index.ts` | Fix client type in `upsertJobPosting` signature |

