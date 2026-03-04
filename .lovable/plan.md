
Goal: ensure every job opened in Moderation Queue is prefilled with crawled metadata/content, and prevent “empty approve” cases.

What I found
- The modal prefill mapper in `AdminDashboard.tsx` is mostly correct now.
- The queue API response itself currently returns null for most fields (`location_city`, `work_mode`, `job_posting_content`, etc.) on pending jobs.
- Those rows are mostly created with `extraction_method = firecrawl_extract_stale`, where the crawler currently marks stale and exits before saving extracted metadata/content.
- Result: modal looks empty because DB rows are empty, not because of form binding.

Implementation plan

1) Fix crawler to always persist extracted fields before stale/not-live decision
- File: `supabase/functions/crawl-source/index.ts`
- Refactor extraction flow:
  - After `extracted` is parsed, build normalized metadata + content payload immediately.
  - Upsert into `job_postings` + `job_posting_content` first.
  - Then apply staleness decision (`posted_at < 1 month`) as a status/approval outcome, not as an early return before saving fields.
- This guarantees prefill data is present for reviewed jobs.

2) Keep stale/non-job items out of moderation queue
- In crawler stale path and “not a real job” path:
  - set `status = 'INACTIVE'`
  - set `approval_status = 'REJECTED'` (or equivalent non-pending terminal state already used in app)
- This prevents empty/invalid jobs from showing in queue and being accidentally approved.

3) Backfill existing bad pending rows (one-time data fix)
- Add a migration to clean current queue data:
  - For `approval_status='PENDING'` rows with `extraction_method in ('firecrawl_extract_stale','firecrawl_extract_not_a_job')`, set `approval_status='REJECTED'` and `status='INACTIVE'`.
- This immediately removes already-empty queue entries without waiting for future crawls.

4) Harden moderation queue filtering and approve safety
- File: `src/pages/admin/AdminDashboard.tsx`
- Query filter improvements:
  - keep `approval_status='PENDING'`
  - add quality gate (at minimum `last_scraped_at IS NOT NULL` and `extraction_method='firecrawl_extract'`)
- Approve safety:
  - disable quick approve buttons when job lacks minimum publishable fields (title + description length threshold), with tooltip/toast reason.
- Prevents another “approved but not visible” case.

5) Small prefill resiliency improvements (UI-side)
- In `jobToForm`:
  - city fallback should be `cityMatch?.name_en || job.location_city || ""` so non-canonical scraped city still shows.
  - keep array/object-safe handling for `job_posting_content`.
- This ensures UI never hides available raw values.

Technical details
- Why it happens now:
  - current crawler stale branch returns before metadata/content write.
  - moderation queue currently includes all PENDING rows, including stale rows with null extracted fields.
- Why this fix is safe:
  - no schema change required.
  - uses existing approval/status semantics already used by admin actions.
  - one-time migration only updates state of already-invalid queue rows.
- Expected outcome:
  - Moderation modal opens with real crawled data for valid jobs.
  - Stale/non-job records no longer pollute queue.
  - Approving without edits won’t create “empty live” listings.
