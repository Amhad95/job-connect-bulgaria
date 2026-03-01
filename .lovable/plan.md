

## Show All Cities in Filter

The `activeCitySlugs` memo in `Jobs.tsx` (lines 51-54) filters `CANONICAL_CITIES` to only include cities that have at least one job. This means empty cities are hidden from filters.

### Change

**`src/pages/Jobs.tsx`**: Replace the `activeCitySlugs` derivation so it always returns all 10 canonical cities, regardless of whether jobs exist for them. Specifically, change the `FiltersContent` section to iterate over `CANONICAL_CITIES` directly instead of `activeCitySlugs`, removing the conditional that hides the city filter when no cities have jobs.

