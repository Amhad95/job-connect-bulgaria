

## Make Crawled Jobs Editable in the Moderation Queue

Currently the "Review Job" modal shows static text for all fields. We'll convert it into an editable form so admins can fix crawled data before approving.

### Changes to `src/pages/admin/AdminDashboard.tsx`

1. **Expand the `Job` type and query** to include editable fields: `salary_min`, `salary_max`, `salary_period`, `currency`, `employment_type`, `seniority`, `category`, `department`.

2. **Add `editForm` state** initialized from the selected job when the modal opens — covers `title_en`, `title_bg`, `location_city`, `work_mode`, `salary_min`, `salary_max`, `salary_period`, `currency`, `seniority`, `employment_type`.

3. **Replace static text with Input fields** in the modal for all editable properties. Use a two-column grid for compact layout (city + work mode, salary min + max, seniority + employment type, etc.).

4. **Add a `saveAndApprove` function** that patches the edited fields via `supabase.update()` along with `approval_status: APPROVED, status: ACTIVE` in one call. Keep a separate "Save Draft" button that saves edits without changing approval status.

5. **Keep the existing Reject button** unchanged — it only sets status, no field edits needed.

6. **Footer buttons**: Cancel | Reject | Save Draft | Save & Approve (primary green).

### No database or backend changes needed
All fields already exist on `job_postings` and are updatable by authenticated users via existing RLS policies.

