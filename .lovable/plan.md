

## Add per-job interactive actions (Cover Letter + Tailor CV)

### 1. Add action buttons to JobDetail page
Add two new buttons to the actions bar (lines 93-108 of `JobDetail.tsx`):
- **"Generate cover letter"** — links to `/apply-kit?tab=cover&jobId={id}` (or opens a dialog)
- **"Tailor CV"** — links to `/apply-kit?tab=cv&jobId={id}`

Both use `FileText` and `PenLine` icons already imported.

### 2. Add action buttons to Jobs preview panel
Add the same two buttons to the preview panel footer in `Jobs.tsx` (lines 281-297), below the "Apply" button.

### 3. Update ApplyKit to accept job context via URL params
- Read `jobId` from search params in `ApplyKit.tsx`
- Fetch job details with `useJob(jobId)` 
- Pre-fill the cover letter tab with job title, company name, and description
- Pre-fill the CV tab with job requirements for keyword gap analysis
- Auto-select the correct tab based on `tab` param

### 4. Add i18n keys
Add translation keys for the new buttons: `jobDetail.generateCover`, `jobDetail.tailorCV` in both `en.ts` and `bg.ts`.

### Files changed

| File | Change |
|------|--------|
| `src/pages/JobDetail.tsx` | Add "Generate cover letter" and "Tailor CV" buttons |
| `src/pages/Jobs.tsx` | Add same buttons to preview panel footer |
| `src/pages/ApplyKit.tsx` | Accept `jobId` and `tab` query params, fetch and display job context |
| `src/i18n/en.ts` | Add new translation keys |
| `src/i18n/bg.ts` | Add new translation keys |

