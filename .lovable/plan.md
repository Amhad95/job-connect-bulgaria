

## Plan: Fix "Create your profile" button for logged-in users

### Problem
When a signed-in user clicks "Create your profile" on the home page, they go to `/auth`, which redirects them to `/tracker` (line 39 of `Auth.tsx`). But `/tracker` doesn't exist — the correct route is `/dashboard/tracker`. This causes a 404.

### Fix

**Two changes needed:**

1. **`src/pages/Index.tsx`** — Make the "Create your profile" button context-aware:
   - If user is logged in: link to `/dashboard` instead of `/auth`
   - If not logged in: keep linking to `/auth`
   - Import `useAuth` and conditionally set the `to` prop and button label

2. **`src/pages/Auth.tsx`** (line 39) — Fix the redirect from `/tracker` to `/dashboard/tracker` so any other path that hits Auth while logged in also works correctly.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Import `useAuth`, conditionally link "Create your profile" to `/dashboard` when logged in |
| `src/pages/Auth.tsx` | Fix redirect from `/tracker` → `/dashboard/tracker` |

