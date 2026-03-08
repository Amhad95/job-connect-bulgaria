

## Plan: Fix Moderation Queue & Import Pipeline

### Problem 1: Unapproved API jobs appear on public jobs page
In `src/hooks/useJobs.ts` line 52, the filter `isDirect || isApproved || isApi` lets API-imported jobs bypass the approval check. Jobs with `ingestion_channel === 'api'` and `approval_status: 'PENDING'` show publicly.

**Fix**: Remove `isApi` from the bypass condition. API jobs should still require `isApproved` to display. Change line 52 from:
```ts
if (isDirect || isApproved || isApi) {
```
to:
```ts
if (isDirect || isApproved) {
```

### Problem 2: `posted_at` not editable in moderation dialog
The edit form in `AdminDashboard.tsx` has no `posted_at` field. The date shown is read-only (`first_seen_at`).

**Fix**: Add `posted_at` to `EditForm` type, `jobToForm`, `formToUpdate`, and add a date input in the dialog (between company header and titles).

### Problem 3: Edge function should store correct posting date
The edge function uses `job.date_posted` which is just TheirStack's discovery date. This is the best date available from the API — there's no separate "original posting date" field. However, the function should also try `job.discovered_at` as a fallback with full timestamp precision. The current logic is correct for what TheirStack provides.

**Fix**: Keep `job.date_posted` as primary, but use `job.discovered_at` as fallback since it has timestamp precision. The admin can correct dates manually via the new editable field.

### Problem 4: Admin should edit approved/live jobs too
Currently `fetchJobs` filters `.eq("approval_status", "PENDING")`. Admin can't re-edit live jobs.

**Fix**: Add an "Approved Jobs" tab or a status filter dropdown that lets the admin view and edit APPROVED jobs too. Add a simple tab bar: "Pending" | "Approved" | "Rejected", replacing the hardcoded filter. The dialog actions will adapt based on the job's current status (e.g. no "Approve" button for already-approved jobs, but "Save" still works).

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useJobs.ts` | Remove `isApi` from bypass condition (1 line) |
| `src/pages/admin/AdminDashboard.tsx` | Add `posted_at` input to edit form; add status tab filter for Pending/Approved/Rejected; adapt dialog buttons per status |
| `supabase/functions/import-theirstack/index.ts` | Add `discovered_at` fallback for `posted_at` |

