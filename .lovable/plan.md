## Plan: Refactor Bachkam.com to Employer-First Tier 2 Model

### Status: ✅ IMPLEMENTED

All 4 phases completed:

1. **Phase 1: Database Migration** ✅ — Tier 2 schema with employers, employer_sources, policy_checks, crawl_runs, job_postings, job_posting_content, saved_jobs, removal_requests, blocked_urls. RLS policies applied.

2. **Phase 2: Edge Functions** ✅ — seed-employers (49 employers seeded), policy-check-source, crawl-source (Firecrawl), process-removal deployed.

3. **Phase 3: i18n & Copy** ✅ — EN/BG updated to employer-first language. index.html SEO updated. No "all jobs" or job-board references.

4. **Phase 4: UI Components** ✅ — Sources page now queries employers DB. JobCard, Jobs, JobDetail use employer attribution. Mock data stripped of job-board domains.

### Next steps
- Connect Firecrawl connector to enable crawl-source
- Run policy-check-source for each employer to set ACTIVE/BLOCKED
- After policy checks pass, run crawl-source to populate job_postings
