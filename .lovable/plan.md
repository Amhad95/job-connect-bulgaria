

## Clean Up Stale Job Data + Harden Retention Policy

### What the data shows

Your 873 job_postings break down as:
- **284** `firecrawl_extract_stale` / INACTIVE — old jobs the crawler correctly marked stale
- **165** `firecrawl_extract` / INACTIVE — extracted then deactivated
- **134** `map_discovery` / INACTIVE — URL-only records from an old discovery method, never extracted
- **123** `firecrawl_extract_not_a_job` / INACTIVE — pages that weren't real jobs
- **67** `firecrawl_extract` / ACTIVE — legitimate active jobs
- Rest: small counts of various states

Only ~67-80 rows are actually useful. The other ~800 are dead weight that will never be shown to users.

Similarly, 370 crawl runs (264 COMPLETED, 106 FAILED) are pure audit logs with no UI and no value after a few days.

### Plan

**1. One-time data purge (migration with data statements)**

Delete job_postings (and their cascading job_posting_content) that are clearly garbage:
- `status = 'INACTIVE'` AND `approval_status NOT IN ('APPROVED')` — never approved, inactive = delete
- `extraction_method IN ('firecrawl_extract_not_a_job', 'map_discovery', 'link_discovery', 'firecrawl_extract_empty')` — known junk methods, delete regardless
- Delete crawl_runs older than 7 days (audit logs, no UI)

**2. Update `cleanup_stale_data()` function to be aggressive**

Add to the existing nightly cleanup function:
- Hard-delete INACTIVE + never-approved jobs older than 7 days (not 90)
- Hard-delete `extraction_method` in (`not_a_job`, `map_discovery`, `link_discovery`, `firecrawl_extract_empty`) immediately
- Hard-delete crawl_runs older than 14 days
- Hard-delete REJECTED jobs older than 7 days

**3. Prevent future junk accumulation in crawler**

In `supabase/functions/crawl-source/index.ts`:
- For "not a job" results: don't insert into `job_postings` at all (currently it saves them with `firecrawl_extract_not_a_job`)
- For stale jobs (>1 month old): mark as `INACTIVE` + `REJECTED` immediately so cleanup catches them fast

### Files changed

1. **Migration SQL** — one-time purge + updated `cleanup_stale_data()` function
2. **`supabase/functions/crawl-source/index.ts`** — skip inserting non-job results entirely

### Expected outcome

- Immediate drop from ~873 to ~80 job_postings
- Crawl runs trimmed to recent ones only
- Nightly cleanup keeps the database lean going forward
- No impact on published/approved jobs

