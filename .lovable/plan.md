

## Problem

When approving a signup request, the `approve_employer_workspace` RPC updates `employers.approval_status` from `'pending'` to `'approved'`. This fires the `trg_employer_approval_notification` trigger, which calls `get_employer_owner_email(uuid)` — a function that was defined in a migration file but never actually deployed to the database.

## Fix

Run a single migration that creates the missing `get_employer_owner_email` function:

```sql
CREATE OR REPLACE FUNCTION public.get_employer_owner_email(p_employer_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT u.email
  FROM employer_profiles ep
  JOIN auth.users u ON u.id = ep.user_id
  WHERE ep.employer_id = p_employer_id AND ep.role = 'owner'
  LIMIT 1;
$$;
```

This is the only change needed — one migration, no code file changes.

