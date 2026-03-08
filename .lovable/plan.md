

## Render **bold** markdown in job detail text

**Problem**: Job descriptions, requirements, and benefits contain `**bold**` markdown syntax that displays as raw asterisks instead of bold text.

**Solution**: Create a shared `renderInlineMarkdown` utility (similar to the one already in `PreviewRefineView.tsx`) and use it in `JobDetail.tsx` to render description, requirements, and benefits text.

### Changes

1. **Create `src/lib/renderInlineMarkdown.tsx`** — Extract the inline markdown renderer into a shared utility that converts `**bold**` to `<strong>` tags, splitting on newlines to preserve `whitespace-pre-line` behavior.

2. **Update `src/pages/JobDetail.tsx`** — Replace the plain text rendering of `job.description`, `job.requirements`, and `job.benefits` with the shared `renderInlineMarkdown` function. Change from:
   ```tsx
   <p className="... whitespace-pre-line">{job.description}</p>
   ```
   To:
   ```tsx
   <p className="... whitespace-pre-line">{renderInlineMarkdown(job.description)}</p>
   ```

