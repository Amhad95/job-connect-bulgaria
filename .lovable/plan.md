

## Issues to Fix

### 1. Remove the "20+ Search Jobs" badge from the home hero
- Delete lines 24-27 in `Index.tsx` (the `<div>` with `mockJobs.length+ searchJobs` badge)

### 2. Job detail page + scroll fix

**Problem A: No full job detail page.** Clicking a job only shows a sidebar preview with no path to further actions (tailor CV, generate cover letter, add to tracker).

**Solution:** Create a dedicated `/jobs/:id` route (`JobDetail.tsx`) with:
- Full job description, requirements, benefits, company info
- Company logo (see point 3)
- Primary "Apply on {source}" CTA
- Secondary action buttons: Save, Add to Tracker, Generate Cover Letter, Tailor CV
- Source attribution + last checked
- "Back to results" link
- Add a "View full details" link/button in the sidebar preview panel and on the job card (on mobile) that navigates to `/jobs/:id`

**Problem B: Scroll behavior is broken.** The job list and preview panel scroll together as one page, instead of each scrolling independently.

**Solution:** Make the jobs page use a fixed-height layout where:
- The main content area below the search bar fills the remaining viewport height (`calc(100vh - header - searchbar)`)
- The filter sidebar, job list, and preview panel each scroll independently with `overflow-y-auto`
- Remove the outer page scroll entirely for the jobs page

### 3. Company logos on job cards

**Problem:** No company logo/image is shown on job cards.

**Solution:**
- Add a `companyLogo` field to the `Job` interface in `mockJobs.ts`
- For mock data, use placeholder logos (e.g., `https://logo.clearbit.com/{domain}` or `https://ui-avatars.com/api/?name={company}&background=random` as fallback)
- Show the logo as a small avatar (32x32) on each `JobCard` next to the company name
- Show a larger logo on `JobDetail.tsx` and in the sidebar preview
- Note: Real crawling of logos from source sites will be implemented in the backend ingestion phase; for now, use generated avatars from the company name

### Implementation Steps

1. **Remove hero badge** — delete the badge `<div>` from `Index.tsx`
2. **Add `companyLogo` to Job interface** — update `mockJobs.ts` with `companyLogo?: string` and populate with `ui-avatars.com` URLs using each company name
3. **Update `JobCard`** — add a small company avatar/logo on the left side of the card
4. **Fix scroll behavior in `Jobs.tsx`** — restructure the 3-column layout to use independent scrolling columns with a fixed viewport height
5. **Add "Open full details" link** in the sidebar preview panel
6. **Create `JobDetail.tsx`** — full page for `/jobs/:id` with all job info, company logo, and action buttons (Apply, Save, Tracker, Cover Letter, Tailor CV)
7. **Register `/jobs/:id` route** in `App.tsx`

