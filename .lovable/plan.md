

## Why 27 out of 89 jobs show on the public site

The 89 rows break down as:
- **79 ACTIVE** (shown to the query) + 8 INACTIVE + 2 PAUSED (excluded by `status = 'ACTIVE'`)
- Of those 79, the client-side quality heuristics in `useJobs.ts` reject **52 jobs**:

| Filter | Jobs rejected |
|---|---|
| `posted_at` older than 1 month (incl. 9 with dates from 2023!) | ~9 |
| No `location_city` AND not remote | ~16 |
| No description or description < 150 chars | ~41 (biggest) |
| Bad/short title | ~2 |
| Some overlap between filters | — |

**Root cause**: The crawler saved job metadata (title, URL, posted_at) but **failed to save content** (description, requirements, benefits) for ~41 of the 79 active jobs. And 9 jobs have ancient `posted_at` dates (2023) that the cleanup function didn't catch because they were still marked ACTIVE.

### Fix plan

**1. Clean up ancient jobs (migration)**
- Deactivate any ACTIVE jobs with `posted_at < 2025-01-01` — these are clearly stale data from bad crawl extractions.

**2. Fix the crawler content-saving gap**
- In `supabase/functions/crawl-source/index.ts`, verify that the content upsert into `job_posting_content` always runs for every successfully extracted job (not just when certain conditions are met). The metadata is being saved but the content write appears to be skipped or failing silently for many jobs.

**3. Re-crawl to backfill missing content**
- After fixing the crawler, re-running scrapes on existing sources will populate the missing `job_posting_content` rows, immediately increasing visible jobs.

**4. (Optional) Relax the description filter for APPROVED jobs**
- In `useJobs.ts`, skip the 150-char description check for jobs with `approval_status = 'APPROVED'` — if an admin explicitly approved a job, it should show regardless of description length.

### Files changed
1. **Migration SQL** — deactivate ancient jobs
2. **`supabase/functions/crawl-source/index.ts`** — ensure content is always persisted
3. **`src/hooks/useJobs.ts`** — skip heuristics for admin-approved jobs

