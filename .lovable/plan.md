

## Fix: Apply bold markdown rendering in Jobs page preview pane

### Problem
The `/jobs` page has a split-pane preview that shows job description, requirements, and benefits as **plain text** (lines 316, 321, 327 in `Jobs.tsx`). The `renderInlineMarkdown` utility is only used in `JobDetail.tsx`, not here.

### Fix
Import `renderInlineMarkdown` in `src/pages/Jobs.tsx` and wrap the three text fields:

- Line 316: `{jobDetail.description}` → `{renderInlineMarkdown(jobDetail.description)}`
- Line 321: `{jobDetail.requirements}` → `{renderInlineMarkdown(jobDetail.requirements)}`
- Line 327: `{jobDetail.benefits}` → `{renderInlineMarkdown(jobDetail.benefits)}`

One file changed, three lines updated.

