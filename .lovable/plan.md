

## Plan: Fix broken CTA links on home page

Three buttons on the home page link to non-existent routes. Here are the fixes:

### Changes in `src/pages/Index.tsx`

| Button | Current Link | Fixed Link | Reason |
|--------|-------------|------------|--------|
| "Create your profile" (line 274) | `/dashboard` | `/auth` | Send unauthenticated users to sign up first; authenticated users can navigate from there |
| "Try AI tailoring" (line 281) | `/tools` | `/dashboard/apply-kit` | The Apply Kit page is where AI CV tailoring lives |
| "View employer packages" (line 326) | `/pricing` | `/employers` | The Employers page contains the pricing/packages info |
| Billboard CTA (line 392) | `/pricing` | `/employers` | Same as above |

All four are simple `to=""` prop changes on existing `<Link>` elements. No new files or components needed.

