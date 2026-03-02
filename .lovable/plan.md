

## Fix: Prefill moderation modal with crawled data

**File**: `src/pages/admin/AdminDashboard.tsx`

### Changes

1. **Fix `jobToForm` title fallback** (lines 57-59): Prefill `title_en` from `job.title_en || job.title` and `title_bg` from `job.title_bg || ""` so the main crawled title always appears.

2. **Fix `job_posting_content` array handling** (lines 70-72): The Supabase join returns an array. Change to:
   ```typescript
   const content = Array.isArray(job.job_posting_content) 
     ? job.job_posting_content[0] 
     : job.job_posting_content;
   ```
   Then read `content?.description_text`, etc.

3. **Fix city matching** (line 60): Try matching crawled `location_city` against canonical names (case-insensitive, partial match). If no match, try `location_slug`. Fallback to raw value so it at least displays:
   ```typescript
   const cityMatch = CANONICAL_CITIES.find(c => 
     c.name_en.toLowerCase() === (job.location_city || "").toLowerCase()
     || c.slug === job.location_slug
   );
   location_city: cityMatch?.name_en || ""
   ```

4. **Update `formToUpdate` to write `title`** (line 78-93): Add `title: form.title_en || form.title_bg || null` so the main title field gets updated when the admin edits.

5. **Update `Job` type for `job_posting_content`** (line 35): Change to accept array or object:
   ```typescript
   job_posting_content: Array<{...}> | {...} | null;
   ```

These are all small fixes within `jobToForm`, `formToUpdate`, and the `Job` type — no new UI or database changes needed.

