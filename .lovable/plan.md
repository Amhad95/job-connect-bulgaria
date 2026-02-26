

## Plan: Refactor Bachkam.com to Employer-First Tier 2 Model

This is a large-scale refactoring. The plan is organized into 4 phases that should be implemented sequentially.

---

### Phase 1: Database Migration — Tier 2 Schema

Create a single Supabase migration adding all new tables and modifying existing ones.

**New tables:**
- `employers` — id, name, slug, website_domain, logo_url, industry_tags (text[]), hq_city, is_featured, created_at
- `employer_sources` — id, employer_id (FK), careers_home_url, jobs_list_url, ats_type, policy_status (enum: PENDING/ACTIVE/BLOCKED), policy_mode (enum: OFF/METADATA_ONLY/FULL_TEXT_ALLOWED/FEED_ONLY), robots_url, terms_url, robots_last_checked_at, terms_last_checked_at, policy_reason, last_crawl_at
- `policy_checks` — id, employer_source_id (FK), checked_at, robots_snapshot_hash, terms_snapshot_hash, allowed_paths_json, blocked_paths_json, result (PASS/FAIL), notes
- `crawl_runs` — id, employer_source_id (FK), started_at, finished_at, jobs_found, jobs_added, jobs_updated, jobs_removed, errors_json, status
- `job_postings` — id, employer_id (FK), employer_source_id (FK), canonical_url (unique), apply_url, title, location_city, location_region, location_country, work_mode, employment_type, seniority, department, category, salary_min, salary_max, currency, salary_period, language, posted_at, first_seen_at, last_seen_at, last_scraped_at, status (ACTIVE/INACTIVE), content_hash, extraction_method
- `job_posting_content` — id, job_id (FK unique), description_text, requirements_text, benefits_text, store_mode (METADATA_ONLY/FULL_TEXT)
- `saved_jobs` — id, user_id, job_id (FK), created_at (unique on user_id+job_id)
- `removal_requests` — id, url, requester_email, company_name, reason, status (PENDING/REVIEWED/ACTIONED/REJECTED), created_at, processed_at
- `blocked_urls` — id, url_pattern, domain, reason, created_at

**Modify existing:**
- `tracker_items`: add nullable `job_id` (uuid), `canonical_url` (text), `apply_url` (text)

**RLS policies:**
- `employers`, `employer_sources`, `job_postings`, `job_posting_content`: public SELECT, no public INSERT/UPDATE/DELETE (admin via service role)
- `saved_jobs`: authenticated users CRUD own rows
- `removal_requests`: public INSERT (anyone can submit), no public SELECT/UPDATE/DELETE
- `blocked_urls`, `policy_checks`, `crawl_runs`: no public access (service role only)

**Enums to create:**
- `policy_status_enum`: PENDING, ACTIVE, BLOCKED
- `policy_mode_enum`: OFF, METADATA_ONLY, FULL_TEXT_ALLOWED, FEED_ONLY
- `job_status_enum`: ACTIVE, INACTIVE
- `store_mode_enum`: METADATA_ONLY, FULL_TEXT
- `removal_status_enum`: PENDING, REVIEWED, ACTIONED, REJECTED

---

### Phase 2: Seed Employer Data + Edge Functions

**2a) Seed Edge Function** (`seed-employers`)
- One-time function that upserts the 50 employers from the attached list into `employers` and `employer_sources`
- Uses service role key; extracts domain from URL; sets all policy_status to PENDING
- Data source: hardcoded array built from the parsed employer list document

**2b) Policy Check Edge Function** (`policy-check-source`)
- Accepts `employer_source_id`
- Fetches robots.txt from employer domain, parses allow/disallow for configured paths
- Optionally fetches terms URL and stores hash
- Updates `policy_status` to ACTIVE or BLOCKED
- Inserts a `policy_checks` record
- Runs with service role; verify_jwt = false with manual auth check

**2c) Crawl Source Edge Function** (`crawl-source`)
- Accepts `employer_source_id`
- Only proceeds if policy_status = ACTIVE
- Uses Firecrawl (server-side, via FIRECRAWL_API_KEY secret) to scrape jobs list page
- Extracts job postings using schema.org JobPosting or HTML parsing
- Upserts into `job_postings` and `job_posting_content`
- Records `crawl_runs` entry
- Rate-limited per source; kill switch via policy_status

**2d) Process Removal Edge Function** (`process-removal`)
- Accepts removal request ID
- Marks job_postings as INACTIVE
- Adds URL to blocked_urls
- Updates removal_requests status

---

### Phase 3: Copy and i18n Updates (EN + BG)

**3a) `index.html` SEO/meta updates:**
- Title: "Bachkam.com — Jobs from verified employers in Bulgaria"
- meta description: remove "leading Bulgarian job sources", use "official employer career pages"
- og:title, og:description: same treatment
- No "all jobs" language anywhere

**3b) `src/i18n/en.ts` key changes:**
- `hero.subheadline`: employer-first language, remove "job sources"
- `trust.sourceShown` → "Employer shown on every listing"
- `trust.bullet2` → "We respect robots.txt and honor removal requests."
- `howItWorks.step2.description` → "Apply always goes to the employer's original posting or career portal."
- `jobs.source` → `jobs.employer` = "Employer"
- `jobs.applyOn` → "Apply on {{employer}}" (change interpolation variable)
- `jobs.searchPlaceholder` → "Role, skill, or employer"
- `nav.sources` → "Employers"
- `footer.sources` → "Employers & Compliance"
- `home.trendingJobs` → "Latest from employers"
- `sources.*` keys → rename to `employers.*` with employer-first wording
- Add `jobs.redirectNote` = "You will be redirected to the employer's original posting."

**3c) `src/i18n/bg.ts` — mirror all changes in Bulgarian:**
- `nav.sources` → "Работодатели"
- `footer.sources` → "Работодатели и съответствие"
- `trust.sourceShown` → "Работодател на всяка обява"
- All other keys mirrored

---

### Phase 4: UI Component Updates

**4a) `src/components/Header.tsx`:**
- Nav link `/sources` label already uses `t("nav.sources")` — no code change needed (i18n handles it)

**4b) `src/components/Footer.tsx`:**
- Footer link text already uses `t("footer.sources")` — no code change needed

**4c) `src/pages/Sources.tsx` → Employers page:**
- Replace `mockSources` with a query to `employers` + `employer_sources` from the database
- Update table columns: Employer, Careers portal domain, Policy status, Policy mode, Last refreshed, Removal/opt-out
- Update removal form labels to say "Employer posting URL"
- Submit removal form to `removal_requests` table via Supabase insert

**4d) `src/components/JobCard.tsx`:**
- Replace `job.source` display with `job.company` (employer name)
- Change `ExternalLink` label from source to employer

**4e) `src/pages/Jobs.tsx`:**
- Replace `mockJobs` import with a Supabase query to `job_postings` + `job_posting_content`, with `mockJobs` as fallback when DB is empty
- Change `t("jobs.applyOn", { source: ... })` to `t("jobs.applyOn", { employer: previewJob.company })`
- Add redirect note below apply button

**4f) `src/pages/JobDetail.tsx`:**
- Same mock→DB transition
- Source attribution box: show "Employer" instead of "Source"
- Add redirect trust note under Apply CTA
- Change apply button text interpolation to employer

**4g) `src/pages/Index.tsx`:**
- Update search placeholder to `t("jobs.searchPlaceholder")`
- "Trending jobs" heading already uses i18n key (will auto-update)
- Remove job-board brand names from mock data references

**4h) `src/data/mockJobs.ts`:**
- Replace all `source: "jobs.bg"` / `"dev.bg"` / `"linkedin.com"` etc. with employer-branded sources (e.g., `source: "TechCorp Careers"`)
- Replace `mockSources` array entirely — remove job board entries
- Keep file as dev fallback only

**4i) Route rename (optional but clean):**
- `/sources` route in `App.tsx` can stay as-is (URL doesn't need to match label)

---

### Technical notes

- The Firecrawl connector must be connected before crawl-source can work. Will check availability and prompt if needed.
- All edge functions use service role key for writes to admin-only tables.
- The seed function will be called once after deployment to populate the initial employer registry.
- Mock data remains as fallback but strips all job-board domain references.

