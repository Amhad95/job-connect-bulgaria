

## Problem Analysis

Three issues:

1. **Wrong source URLs** — All 9 employer sources point to generic careers homepages instead of the specific job listings pages you provided. The Map API discovers irrelevant links from these generic pages.

2. **No individual job page scraping** — Phase 2 extraction scrapes the same URL stored as `canonical_url`, which is often the listing page link (not the individual job detail page). The extraction schema gets empty results because the listing page doesn't contain a single job's details. Individual job pages must be scraped to get descriptions.

3. **Old jobs not filtered** — 143 jobs have `posted_at` older than 1 month but are still shown as ACTIVE. Need to filter these out in the query and mark stale jobs during crawl.

## Implementation Steps

### 1. Update `employer_sources` URLs (SQL migration)
Update `jobs_list_url` for all 9 employers to the correct URLs provided:

| Employer | New `jobs_list_url` |
|----------|-------------------|
| Nestle Bulgaria | `https://www.nestle.bg/bg/jobs/search-jobs?keyword=&country=BG` |
| Mondelez Bulgaria | `https://www.mondelezinternational.com/careers/jobs/?term&countrycode=BG` |
| Scalefocus | `https://www.scalefocus.com/open-positions` |
| Payhawk | `https://payhawk.com/bg/karieri#open-positions` |
| DXC Technology Bulgaria | `https://careers.dxc.com/job-search-results/?compliment[]=Bulgaria` |
| Accenture Bulgaria | `https://www.accenture.com/bg-en/careers/jobsearch` |
| Endava Bulgaria | `https://www.endava.com/careers/jobs?location=Sofia%2C+Bulgaria` |
| Kaufland Bulgaria | `https://kariera.kaufland.bg/svobodni-pozitsii` |
| Fibank | `https://www.fibank.bg/bg/za-nas/karieri` |

Also clear existing stale job_postings (set status=STALE where `posted_at < now() - 1 month`).

### 2. Update `crawl-source/index.ts` — fix extraction to scrape individual pages
The current Phase 2 already scrapes individual `canonical_url` pages. The real problem is that many `canonical_url` values are listing-page URLs (e.g., `/careers`) rather than individual job detail URLs — because the `looksLikeJobPath` filter is too narrow, and Map API returns listing pages that get stored as jobs.

Changes:
- **Relax `looksLikeJobPath`** — accept any path with 2+ segments that isn't obviously a static page (the Map API with `search: "job"` already filters for relevance)
- **Skip jobs older than 1 month** — during extraction, if `posted_date` is > 30 days ago, set `status = 'STALE'` instead of ACTIVE
- **Increase extraction cap** from 20 to 30 per run to process more jobs per crawl

### 3. Update `useJobs.ts` — filter out old jobs
- Add `.gte("posted_at", thirtyDaysAgo)` or handle in the query to exclude jobs posted > 1 month ago
- For jobs with null `posted_at`, keep them but sort them after dated jobs
- Also apply a fallback: exclude jobs where `first_seen_at` is > 1 month ago AND `posted_at` is null (likely stale)

### 4. Re-crawl all sources
After deploying, trigger crawl-source for each of the 9 updated employers to discover jobs from the correct URLs and extract their descriptions.

### Files Changed

| File | Change |
|------|--------|
| SQL migration | Update `jobs_list_url` for 9 employers; set old jobs to STALE |
| `supabase/functions/crawl-source/index.ts` | Relax path filter; mark old jobs as STALE during extraction; increase extraction cap |
| `src/hooks/useJobs.ts` | Filter out jobs older than 1 month |

