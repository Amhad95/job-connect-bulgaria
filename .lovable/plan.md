

## Fix: Job cards overflowing on mobile in homepage

The trending jobs section container at line 106 (`<section className="bg-surface">`) and/or the inner `container` div lack `overflow-hidden`. On mobile, long text in job cards can push beyond the viewport width.

### Changes

**`src/pages/Index.tsx`** — Add `overflow-hidden` to the trending jobs section wrapper:
- Line 106: Change `<section className="bg-surface">` to `<section className="bg-surface overflow-hidden">`
- Line 117: Add `overflow-hidden` to the grid div: `className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden"`

These two additions, combined with the already-applied `overflow-hidden min-w-0` on the `JobCard` component itself, will prevent any card content from extending beyond the screen width on mobile.

