

## Plan: Fix hero section sizing and spacing

Looking at the screenshot reference and current code, three issues:

1. **SVG too small** — `max-w-[200px]` is tiny. Increase to `max-w-[320px]` to match the reference screenshot proportions.
2. **Too much top padding** — `py-16 md:py-24` creates excessive vertical space. Reduce to `py-8 md:py-14`.
3. **Too much gap** — `gap-8` between the grid row and search area is large. Reduce to `gap-6`.

### Changes (single file: `src/pages/Index.tsx`)

**Line 24:** Change `py-16 md:py-24` → `py-8 md:py-14` and `gap-8` → `gap-6`

**Line 36:** Change `max-w-[200px]` → `max-w-[320px]`

