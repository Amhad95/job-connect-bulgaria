

## Three Issues and Fixes

### Issue 1: Crawling from careers homepage, not job listings page
Currently `crawl-source` scrapes the careers landing page and extracts links from HTML. Most careers homepages have generic navigation links, not individual job URLs. Even with the right page, JS-rendered listings are missed.

**Fix**: Replace `scrape` + link extraction with **Firecrawl Map API** (`/v1/map`). Map discovers all URLs on a site efficiently (including JS-rendered ones) and supports a `search` parameter to filter for job-related paths. No need to manually find the exact listings page — Map crawls from any entry point.

### Issue 2: No job detail extraction
Currently jobs are inserted with `extraction_method: "link_discovery"` — title is guessed from URL path slug, all metadata fields (description, requirements, posted_at, city, work_mode) are null.

**Fix**: After discovering job URLs via Map, scrape each job detail page using Firecrawl Scrape with **JSON extraction** (`formats: [{ type: 'json', schema }]`). Define a schema that extracts: title, description, requirements, benefits, location_city, work_mode, employment_type, posted_at, salary info. Store extracted content in `job_posting_content` and update `job_postings` metadata columns.

### Issue 3: Sorting by crawl date, not posting date
`posted_at` is always null. UI sorts by `first_seen_at`.

**Fix**: Once Issue 2 is resolved, `posted_at` will be populated from scraping. Update `useJobs` to sort by `posted_at` (falling back to `first_seen_at`), and update the UI sort option to use this.

---

### Implementation Steps

**1. Rewrite `crawl-source/index.ts`** — two-phase crawl:
- **Phase 1 (Discover)**: Call Firecrawl Map API with the employer's `careers_home_url`, using `search: "job position career opening vacancy"` and `limit: 200`. Filter returned URLs through existing `passesBasicFilters` + `looksLikeJobPath` + ATS recognition. Upsert discovered URLs as job postings.
- **Phase 2 (Extract)**: For each newly added job (or jobs missing metadata), call Firecrawl Scrape with JSON extraction schema to pull structured data. Cap at 20 detail scrapes per crawl run to stay within rate limits. Update `job_postings` fields and insert/update `job_posting_content`.
- Rate limit: 1 second delay between each Firecrawl API call (Map counts as 1 call, each Scrape counts as 1).

**2. Define extraction schema** (used in Firecrawl JSON format):
```text
{
  title, description, requirements, benefits,
  location_city, work_mode (remote/hybrid/onsite),
  employment_type (full-time/part-time/contract),
  posted_date, deadline_date,
  salary_min, salary_max, currency
}
```

**3. Update `useJobs` hook** (`src/hooks/useJobs.ts`):
- Change `.order("first_seen_at", { ascending: false })` to `.order("posted_at", { ascending: false, nullsFirst: false })`
- Map `postedAt` from `row.posted_at` (no longer falling back to `first_seen_at`)

**4. Update Jobs UI sorting** (`src/pages/Jobs.tsx`):
- "Newest" sort uses `postedAt` (with `firstSeenAt` as fallback for nulls)
- Show "Posted X ago" instead of crawl timestamp

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/crawl-source/index.ts` | Replace scrape+links with Map API for discovery; add Phase 2 detail extraction with JSON schema; rate limiting |
| `src/hooks/useJobs.ts` | Sort by `posted_at` descending, nulls last |
| `src/pages/Jobs.tsx` | Sort by `postedAt` with fallback; show posting date |
| `src/components/JobCard.tsx` | Display "Posted X ago" using `postedAt` |

