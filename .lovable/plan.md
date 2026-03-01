

## Problem

The `approve_employer_workspace` RPC contains this line:

```sql
UPDATE signup_requests
SET status = 'APPROVED', reviewed_at = now(), reviewed_by = p_reviewer_uid, review_notes = p_review_notes
WHERE employer_id = p_employer_id AND status = 'PENDING';
```

The `signup_requests` table has `reviewed_at` and `review_notes` columns but **no `reviewed_by` column**. Same issue exists in `reject_employer_workspace`.

## Fix

Single migration to add the missing column:

```sql
ALTER TABLE signup_requests ADD COLUMN IF NOT EXISTS reviewed_by uuid;
```

No code file changes needed.

