

## Cross-Domain ATS Crawling with Per-Employer Allowlisting

### Problem
Most employers host jobs on external ATS platforms (Greenhouse, Lever, Workday, etc.). The current `crawl-source` function drops these links because of the same-domain filter. We need to follow them, but only through a controlled, per-employer policy gate.

### Architecture

```text
employer_sources table (one row per crawlable origin):
┌─────────────────────────────────────────────────────────┐
│ Chaos (V-Ray) — chaos.com careers page                  │
│   policy_status: ACTIVE, ats_type: NULL                 │
│   id: aaa-...                                           │
├─────────────────────────────────────────────────────────┤
│ Chaos (V-Ray) — boards.greenhouse.io/chaosgroup         │
│   policy_status: PENDING → needs own robots check       │
│   ats_type: greenhouse, parent_source_id: aaa-...       │
└─────────────────────────────────────────────────────────┘

crawl-source flow:
1. Scrape employer career page (same-domain source, must be ACTIVE)
2. Partition discovered links into same-domain vs cross-domain
3. Cross-domain links checked against RECOGNIZED_ATS_DOMAINS
4. For each matching ATS domain: look up employer_source for this employer+domain
   - If none exists → auto-create with status PENDING (won't crawl yet)
   - If exists and ACTIVE → include its links in results
   - If exists and BLOCKED/PENDING → skip
5. Non-ATS cross-domain links are always dropped (no aggregators)
```

### Recognized ATS Domains (hardcoded allowlist)

```text
boards.greenhouse.io, jobs.lever.co, jobs.smartrecruiters.com,
*.myworkdayjobs.com, apply.workable.com, jobs.ashbyhq.com,
*.recruitee.com, *.breezy.hr, *.icims.com, *.taleo.net,
*.jobvite.com, *.bamboohr.com, *.personio.de
```

### Implementation Steps

**1. Database migration**
- Add `parent_source_id uuid REFERENCES employer_sources(id)` to `employer_sources` (nullable, links ATS child to parent career-page source)
- No other schema changes needed (`ats_type` column already exists)

**2. Rewrite `crawl-source/index.ts` link filtering**
- Define `RECOGNIZED_ATS_DOMAINS` map (domain pattern → ats_type string)
- After scraping, split links into two buckets:
  - Same-domain links: filter with existing job-path patterns (unchanged)
  - Cross-domain links: match against ATS domain patterns only
- For each matched ATS domain, query `employer_sources` for a row matching this `employer_id` + ATS domain
  - If found and ACTIVE: accept the links, attribute to that `employer_source_id`
  - If found but not ACTIVE: skip, log as "ATS source pending/blocked"
  - If not found: auto-insert a new `employer_source` with `policy_status: PENDING`, `ats_type`, `parent_source_id`, `careers_home_url` set to the ATS board URL, `robots_url` derived from ATS domain
- Insert job postings from accepted ATS links with `employer_source_id` pointing to the ATS source row
- Return summary including `ats_sources_discovered` count in the response

**3. Rate limiting**
- Add 500ms delay between Firecrawl scrape calls within a single crawl run
- Keep the 50-link cap per source per crawl

**4. No changes to `policy-check-source`**
- It already works generically on any `employer_source` row, so newly created ATS sources just need `policy-check-source` called on them before they become crawlable

### Technical Details

The ATS domain matching function:

```text
isRecognizedAts(hostname):
  exact match: "boards.greenhouse.io" → "greenhouse"
  exact match: "jobs.lever.co" → "lever"
  suffix match: ".myworkdayjobs.com" → "workday"
  suffix match: ".recruitee.com" → "recruitee"
  ... etc
  no match → null (link dropped)
```

Cross-domain link filtering adds these guards:
- Link must come from a page on an ACTIVE employer source (origin validation)
- Link hostname must match a recognized ATS pattern (no arbitrary domains)
- Link path must still pass static-asset and blocked-segment filters
- ATS source for this employer must exist and be ACTIVE to accept links
- Job boards (indeed.com, linkedin.com, glassdoor.com, zaplata.bg, jobs.bg) are explicitly blocked

### Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/...` | Add `parent_source_id` column |
| `supabase/functions/crawl-source/index.ts` | ATS domain detection, split filtering, auto-create pending ATS sources, rate limiting |

