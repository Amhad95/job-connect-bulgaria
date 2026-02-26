

## Problem Analysis

**Data state**: 538 active jobs. 188 have been scraped, 350 have not. 179 have descriptions. 166 have cities, 187 have work modes, 159 have posted_at dates.

Three issues to fix:

### Issue 1: Preview panel shows "View full details" instead of description
Line 207 in Jobs.tsx shows a static placeholder instead of fetching the job's content. The `useJobs` hook only fetches listing-level data (no description). The preview panel needs to fetch content for the selected job.

**Fix**: Use `useJob(selectedJobId)` in Jobs.tsx to fetch full details (including description, requirements, benefits) for the preview panel. Display actual content in the preview.

### Issue 2: Sorting by crawl date instead of posted_at  
The `useJobs` hook already sorts by `posted_at` DESC nulls last, but 350/538 jobs have no `posted_at` (never scraped). Those null-posted_at jobs fall to the bottom, but among scraped jobs the sorting should be correct. The real fix is extracting more jobs.

**Fix**: 
- Run extraction for the remaining 350 unscraped jobs (will need multiple crawl runs since cap is 20/run)
- In the UI, ensure the fallback sort for null `posted_at` uses `first_seen_at`

### Issue 3: Filters should be location/salary/work mode, not company
Currently filters only show employer checkboxes.

**Fix**: Replace company filter with:
- **Location** (city) filter — checkboxes from distinct cities
- **Work mode** filter — remote/hybrid/onsite checkboxes  
- **Employment type** filter — full-time/part-time/contract checkboxes
- **Salary range** filter — min salary slider or checkbox for "has salary info"

---

## Implementation Steps

### 1. Update `src/pages/Jobs.tsx`
- Add `useJob(selectedJob?.id)` to fetch full content for the preview panel
- Replace preview placeholder with actual description/requirements/benefits text
- Replace `selectedCompany` filter state with `selectedCities`, `selectedWorkModes`, `selectedEmploymentTypes`
- Build filter sections from distinct values derived from jobs data
- Apply all filters in `filteredJobs` memo

### 2. Update `src/hooks/useJobs.ts`
- No structural changes needed — it already sorts by `posted_at` DESC nulls last
- The `useJob` hook already fetches content

### 3. Trigger extraction for unscraped jobs
- Run `crawl-source` for each active employer source to extract the remaining 350 jobs
- This is a data operation, not a code change

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Jobs.tsx` | Replace company filter with location/workMode/employmentType filters; show job content in preview panel using `useJob` |

