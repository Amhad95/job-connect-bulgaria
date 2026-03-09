

## Capture First Name, Last Name, and Birthdate During Signup

### Overview
Currently the signup form has a single "Full Name" field and no birthdate. OAuth providers (Google/Apple) supply the user's name automatically but never provide birthdate. The plan adds proper name splitting and birthdate capture for all signup paths.

### Database Changes

**Migration: Add columns to `profiles` table**
- Add `first_name TEXT`, `last_name TEXT`, `birth_date DATE` columns to `profiles`
- Update `handle_new_user()` trigger to extract `first_name`, `last_name`, and `birth_date` from `raw_user_meta_data` (Google provides `given_name`/`family_name`; Apple provides `first_name`/`last_name` or `full_name`)
- Keep existing `full_name` column for backward compatibility

### Email Signup Form Changes

**File: `src/pages/Auth.tsx`**
- Replace single `fullName` field with `firstName` and `lastName` inputs (both required)
- Add a date-of-birth input (using a standard date input or the Shadcn date picker popover)
- Pass `first_name`, `last_name`, `birth_date` in `signUp()` options metadata:
  ```typescript
  options: { data: { first_name: firstName, last_name: lastName, birth_date: birthDate } }
  ```

### OAuth Post-Signup: Complete Profile Page

Since Google/Apple do not provide birthdate, OAuth users need a one-time "complete your profile" step.

**New file: `src/pages/CompleteProfile.tsx`**
- A simple form with first name (pre-filled from OAuth metadata), last name (pre-filled), and birthdate (required)
- On submit, updates the `profiles` table row for the current user
- Redirects to `/tracker` after completion

**File: `src/App.tsx`**
- Add `/complete-profile` route (protected, inside AppLayout)

**File: `src/components/ProtectedRoute.tsx`** (or AuthContext)
- After login, check if the user's `profiles.birth_date` is null
- If null, redirect to `/complete-profile` instead of allowing access to dashboard routes
- This ensures OAuth users must fill in their birthdate before proceeding

### Files to Create/Modify
1. **New migration** -- add `first_name`, `last_name`, `birth_date` to `profiles`; update trigger
2. **`src/pages/Auth.tsx`** -- split name fields, add birthdate for email signup
3. **`src/pages/CompleteProfile.tsx`** (new) -- post-OAuth birthdate capture
4. **`src/App.tsx`** -- add complete-profile route
5. **`src/components/ProtectedRoute.tsx`** -- redirect if profile incomplete

