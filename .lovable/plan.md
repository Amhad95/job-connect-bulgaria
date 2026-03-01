
You’re right to call this out — the previous fix targeted clipping, but not the actual mobile layout behavior on Home.

## What is actually wrong

On Home (`Index.tsx`), the “Latest from employers / Trending Jobs” list is rendered in a CSS grid with:

- `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`

On **mobile**, there is no explicit `grid-cols-1`, so the implicit column sizing can behave like `auto` and expand to fit long unbreakable content (badges/salary text), which makes cards push wider than the viewport.

Why it looks fine on `/jobs`:
- `/jobs` does **not** use this grid card layout; it uses a vertical list container (`space-y-2`), so no implicit grid column expansion issue.

`overflow-hidden` on section/grid only masks overflow visually; it does not fix the root sizing behavior of the grid track itself.

## Implementation plan

1. Update Home jobs grid to force one constrained column on mobile.
   - In `src/pages/Index.tsx`, change:
   - `grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ...`
   - to:
   - `grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ...`

2. Ensure each grid item can shrink within track width.
   - Add `className="block min-w-0"` to the wrapping `<Link>` around each `JobCard` in the Home trending section.

3. Keep `JobCard` as shrink-safe (already has `overflow-hidden min-w-0`), and if needed harden further:
   - add `w-full` on the card root so the card always fills the constrained track instead of sizing by content.

4. Validate where overflow actually appears.
   - Test Home on mobile width (320–390px), specifically jobs with long city/work mode/salary labels.
   - Confirm no horizontal scroll and no card extension beyond viewport.

## Technical details (concise)

Files to update:
- `src/pages/Index.tsx`
  - Grid classes: add `grid-cols-1`
  - Card link wrapper: add `block min-w-0`
- `src/components/JobCard.tsx` (optional hardening)
  - Root class: include `w-full`

Why this works:
- Explicit `grid-cols-1` uses `minmax(0,1fr)` behavior for small screens, preventing content-driven widening.
- `min-w-0` on grid item wrappers allows child truncation/shrinking.
- `w-full` on the card prevents intrinsic content width from dictating outer width.

```text
Mobile before:
grid (implicit auto column) + long badge text
→ column grows beyond viewport
→ card extends off-screen

Mobile after:
grid-cols-1 (fixed fractional track) + link min-w-0 + card w-full
→ track stays within container
→ card content truncates/wraps instead of widening layout
```
