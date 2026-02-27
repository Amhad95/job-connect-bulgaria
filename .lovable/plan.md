

## Fire-and-Forget Scraping Architecture

### Problem
The scraping loop runs client-side in `AdminCompanies.tsx` (lines 120-150). Navigating away kills the process. Each company's sources are invoked sequentially via `await`, and nothing saves until all finish.

### Plan

#### 1. Create new edge function: `batch-scrape`
**File:** `supabase/functions/batch-scrape/index.ts`

Accepts `{ company_ids: string[] }`. For each company:
- Looks up active `employer_sources`
- Calls the existing `crawl-source` logic inline (or invokes it via fetch) for each source
- Commits jobs incrementally (already happens — `upsertJobPosting` inserts per-job)
- Returns immediately with `{ started: true, sources_count: N }`

The key: the edge function responds to the client quickly but continues processing via `waitUntil`-style pattern (Deno edge functions run until completion even after responding, so we respond first then continue the loop).

**Actually**, Deno.serve doesn't support background work after response. So the function must do all work before responding — but since it runs server-side, the browser can close. The function has a ~400s timeout on Supabase. This is acceptable for most batch sizes.

Alternative: have `batch-scrape` fire individual `crawl-source` invocations via `fetch()` without awaiting them (true fire-and-forget per source). This parallelizes and ensures each source completes independently.

**Chosen approach:** `batch-scrape` fires non-blocking `fetch()` calls to `crawl-source` for each active source, then returns immediately. Each `crawl-source` invocation runs independently server-side.

#### 2. Fix `crawl-source` to set `approval_status = 'PENDING'` on new jobs
**File:** `supabase/functions/crawl-source/index.ts` line 527-536

Currently inserts with `status: "ACTIVE"` and no `approval_status` (defaults to `'ACTIVE'`). Change to set `approval_status: "PENDING"` so new jobs appear in the moderation queue.

#### 3. Simplify `AdminCompanies.tsx` frontend
Replace `scrapeCompany`, `scrapeSelected`, `scrapeAllAllowed` (lines 120-150) with a single call to `batch-scrape` that sends company IDs and shows a toast. No progress tracking, no awaiting per-company.

#### 4. Verify Moderation Queue
`AdminDashboard.tsx` line 69 already queries `.eq("approval_status", "PENDING")` — this is correct. No changes needed.

#### 5. Add `batch-scrape` to `config.toml`
Set `verify_jwt = false` to match other functions.

#### 6. Migrations
The user mentions two additive migrations. These columns (`company_type`, `plan_tier`, etc.) already exist from the previous migration. The partners module tables (`signup_requests`, `partner_memberships`, `partner_events`) and billing columns need to be created via a new migration.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/batch-scrape/index.ts` | New — accepts `company_ids[]`, fires `crawl-source` per active source |
| `supabase/functions/crawl-source/index.ts` | Set `approval_status: "PENDING"` on new job inserts |
| `src/pages/admin/AdminCompanies.tsx` | Replace client-side loop with single `batch-scrape` call |
| `supabase/config.toml` | Add `[functions.batch-scrape]` |
| Database migration | Add partner tables if needed |

