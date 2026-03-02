

## Make Moderation Queue Edit Modal Read-Only for Crawled Job Details

The edit modal in `AdminDashboard.tsx` (lines 319-371) currently lets you edit title translations (EN/BG), city, and work mode for crawled PENDING jobs. You want these fields to be view-only since the data comes from the crawler and shouldn't be manually altered.

### Changes to `src/pages/admin/AdminDashboard.tsx`

1. **Convert the edit modal into a read-only detail view**: Replace the editable Input/Select fields with static text displays showing the crawled values (title, title_bg, city, work mode).

2. **Remove "Save draft" button**: Since nothing is editable, the only actions should be "Cancel", "Reject", and "Approve" (which just sets `approval_status`/`status` without patching any job fields).

3. **Rename the modal** from "Edit Job" to "Review Job" to reflect its purpose.

4. **Remove the `editForm` state and `saveEdit` function** — replace with a simpler `reviewApprove` / `reviewReject` that only updates `approval_status` and `status`.

5. **Show additional crawled metadata** as read-only info: canonical URL (already there as a link), company name, crawl date — making the review more informative without being editable.

### What stays the same
- Bulk approve/reject from the table
- Individual approve/reject buttons in the table rows
- Search and filter functionality

