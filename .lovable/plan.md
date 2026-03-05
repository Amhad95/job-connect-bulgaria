

## Fix Three Apply Kit Issues

### Issue 1: PDF download blocked by browser (`ERR_BLOCKED_BY_CLIENT`)

The current download uses `window.open(url, "_blank")` which opens a Supabase signed URL directly. Ad blockers and Chrome's built-in protection block navigations to unfamiliar domains. The fix is to use a programmatic fetch + blob download instead.

**Change in `src/pages/dashboard/DashboardApplyKit.tsx`** (handleDownloadDoc):
- Replace `window.open(url, "_blank")` with `fetch(url)` → create blob → `URL.createObjectURL` → trigger download via hidden `<a>` tag with `download` attribute
- This bypasses ad-blocker domain blocking entirely

### Issue 2: PDF/DOCX template aesthetic improvements

The current `generatePdf` and `generateDocx` in the finalize edge function produce a basic layout. Improvements:

**PDF (`supabase/functions/apply-kit-finalize-generation/index.ts`)**:
- Increase name font size slightly, add more vertical spacing after name/contact
- Add consistent section spacing with proper line-height
- Improve bullet point indentation and spacing
- Add subtle color accent to section headings (dark navy instead of near-black)
- Handle inline bold (`**text**`) within lines by splitting and drawing bold/regular segments
- Better page break logic with more breathing room

**DOCX (same file)**:
- Better paragraph spacing between sections
- Use proper bullet list formatting instead of text bullets
- Handle inline bold markers within item text (not just prefix bold)
- Add slightly more generous margins

### Issue 3: Preview markdown rendering — bold text shows as `**text**`

The `PreviewRefineView` component renders lines as plain text without parsing inline markdown like `**bold**`. 

**Change in `src/components/apply-kit/PreviewRefineView.tsx`**:
- Add a `renderInlineMarkdown(text)` helper function that splits text on `**...**` patterns and wraps matched segments in `<strong>` tags
- Also handle `*italic*` with `<em>` tags
- Apply this helper to all text content (headings, list items, paragraphs)

### Files to modify
1. `src/pages/dashboard/DashboardApplyKit.tsx` — blob-based download
2. `src/components/apply-kit/PreviewRefineView.tsx` — inline markdown rendering
3. `supabase/functions/apply-kit-finalize-generation/index.ts` — template polish

