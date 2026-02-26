

## Problem Analysis

The crawler has three fundamental failures visible in the data:

1. **Indexing non-job pages as jobs** — Mondelez has 108 "active jobs" that are all corporate pages ("Awards", "5 Star", "Board of Directors", "Who We Are"). Endava has 18 "jobs" that are blog posts ("Meet Jan", "Meet Andreea"). The `looksLikeJobPath` filter accepts any URL with 2+ segments, which matches everything.

2. **No country filtering** — DXC has jobs from Malaysia, Australia, Tunisia — not Bulgaria. The listing page shows Bulgaria jobs, but the Scrape API returns ALL links on the page including global jobs.

3. **Wrong source for Kaufland** — Links go to `karieri.bg` (an aggregator) instead of Kaufland's own career portal at `kariera.kaufland.bg`.

**Root cause**: Using Firecrawl Scrape with `formats: ["links"]` returns every hyperlink on the page. The `looksLikeJobPath` filter cannot distinguish job links from navigation/corporate links. This approach is fundamentally broken.

## Solution: LLM-Powered Discovery

Replace the link-scraping approach in Phase 1 with Firecrawl's **extract** feature using a schema that asks the LLM to identify actual job postings and their URLs from the listing page. The LLM understands page context and will only return real job listings.

## Implementation Steps

### 1. Rewrite Phase 1 in `crawl-source/index.ts`

Replace the Scrape-links approach with an extract-based approach:

```typescript
// New extraction schema for listing pages
const JOB_LISTING_SCHEMA = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Job title" },
          url: { type: "string", description: "Direct URL to the individual job posting page" },
          location: { type: "string", description: "Job location if visible" },
        },
        required: ["title", "url"],
      },
      description: "List of actual job postings/openings found on this page. Only include real job vacancies, NOT blog posts, company info pages, news, or corporate content."
    }
  },
  required: ["jobs"]
};
```

Use `formats: ["extract"]` with this schema. The LLM will return only actual job postings with their detail URLs.

For same-domain links discovered this way, resolve relative URLs against the crawl URL origin. Skip blocked aggregators. Then proceed to upsert as before.

### 2. Add extraction prompt for clarity

Include an `extract.prompt` to guide the LLM:
```
"Extract only actual job vacancy/opening listings from this careers page. Each job should have a title and a direct link to its detail page. Do NOT include blog posts, company info, news articles, or navigation links."
```

### 3. Fix Kaufland source URL

Update `jobs_list_url` for Kaufland to the actual Kaufland careers domain, and update `website_domain` for link matching:
- Kaufland currently points to `kariera.kaufland.bg/svobodni-pozitsii` which is correct, but the discovered links go to `karieri.bg` (a different domain/aggregator). Need to ensure links from `karieri.bg` are blocked or the Kaufland domain includes `kariera.kaufland.bg`.

### 4. Clean up garbage data (SQL)

- Mark all Mondelez non-job entries as INACTIVE (108 entries that are corporate pages)
- Mark all Endava blog posts as INACTIVE 
- Mark all DXC non-Bulgaria jobs as INACTIVE
- Mark Kaufland `karieri.bg` entries as INACTIVE

### 5. Remove overly permissive `looksLikeJobPath`

Since Phase 1 now uses LLM extraction, the `looksLikeJobPath` function is no longer needed for discovery. Keep `passesBasicFilters` for a basic sanity check on extracted URLs only.

### 6. Add `karieri.bg` to BLOCKED_AGGREGATORS

It's a job board/aggregator, not an employer site.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/crawl-source/index.ts` | Replace Phase 1 link-scraping with LLM extract; add `karieri.bg` to blocked aggregators; add extract prompt; remove `looksLikeJobPath` |
| SQL migration | Clean up ~160 garbage job entries; fix Kaufland domain |

