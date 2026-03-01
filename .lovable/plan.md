

## Problem Diagnosis

I found three distinct issues causing the employer signup to fail:

### Issue 1: Database function/schema mismatch
The `provision_employer_workspace` (7-arg version) tries to insert into `signup_requests` using columns that **don't exist** in the actual table:
- `submitted_by_email` → actual column is `contact_email`
- `proposed_plan` → doesn't exist
- `domain` → doesn't exist
- `about` → doesn't exist

This causes the RPC to fail silently — no `employer_profiles` row is created, so the user gets "Employer access required" after login.

### Issue 2: Missing `contact_name` (NOT NULL)
The `signup_requests` table has `contact_name text NOT NULL` but the function never provides it, which would also cause an insert failure.

### Issue 3: Email auto-confirm is enabled
The user `itachi55uchiha@gmail.com` was auto-confirmed instantly (no email sent). This allowed signing in without verification, but the workspace was never provisioned because the RPC failed.

---

## Plan

### Step 1: Add missing columns to `signup_requests` + fix the RPC function
Run a migration that:
- Adds `proposed_plan`, `domain`, `about` columns to `signup_requests` (nullable)
- Makes `contact_name` nullable (or default to empty string) since employer signup doesn't collect it separately
- Drops and recreates the 7-arg `provision_employer_workspace` function to use the correct column names (`contact_email` instead of `submitted_by_email`, plus the new columns)

### Step 2: Fix the client-side code
Update `provisionEmployerWorkspace` in `src/lib/employerAuth.ts` — the function signature passes `p_email` but the DB function should map it to `contact_email`.

### Step 3: Fix the test user
Manually provision the workspace for `itachi55uchiha@gmail.com` (user `7d7a366d`) by running the corrected RPC or direct inserts so they can access their workspace.

### Step 4: Disable email auto-confirm (optional)
If you want employers to verify their email before accessing the workspace, I can disable auto-confirm. However, since the workspace is already gated by admin approval, auto-confirm may be acceptable. Your call.

