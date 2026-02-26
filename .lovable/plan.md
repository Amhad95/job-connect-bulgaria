

## Tracker & Apply Kit Upgrade Plan

This plan adds four major features: drag-and-drop Kanban tracker, notes/timeline per application, AI cover letter generation, and AI CV tailoring suggestions. All features require authentication and persist data in the cloud.

---

### Phase 1: Database & Auth Setup

**Database tables** (via migration):

1. **`profiles`** — `id (uuid, FK auth.users)`, `full_name`, `email`, `avatar_url`, `created_at`
   - Trigger to auto-create on signup
   - RLS: users read/update own profile only

2. **`tracker_items`** — `id`, `user_id (FK profiles)`, `job_title`, `company`, `company_logo`, `source_url`, `stage` (enum: saved/applying/applied/interview/offer/rejected), `position` (int, for ordering within stage), `added_at`, `updated_at`
   - RLS: users CRUD own items only

3. **`tracker_notes`** — `id`, `tracker_item_id (FK tracker_items)`, `user_id`, `content` (text), `note_type` (enum: note/interview_date/contact/status_change), `created_at`
   - RLS: users CRUD own notes only

4. **`cv_files`** — `id`, `user_id`, `file_name`, `storage_path`, `is_primary` (bool), `uploaded_at`
   - RLS: users CRUD own files only
   - Storage bucket `cv-uploads` with 5MB limit, PDF/DOCX only

5. **`cover_letters`** — `id`, `user_id`, `tracker_item_id` (nullable FK), `job_title`, `company`, `tone`, `content` (text), `created_at`
   - RLS: users CRUD own letters only

**Auth**: Implement email/password signup + login on the existing Auth page. Add protected route wrapper. Do not enable auto-confirm (users verify email first).

---

### Phase 2: Tracker — Drag-and-Drop Kanban

- Install a lightweight drag library (use native HTML5 drag-and-drop to avoid extra deps, or `@dnd-kit/core` + `@dnd-kit/sortable` for polished UX)
- Replace static mock data with real data from `tracker_items` table
- Dragging a card between columns updates `stage` and `position` via Supabase
- "Add to Tracker" button on JobDetail page creates a new `tracker_items` row in "saved" stage
- Each card shows company logo, title, company, date added, and small action icons

---

### Phase 3: Tracker — Notes & Timeline per Job

- Clicking a tracker card opens a slide-out sheet/dialog with:
  - **Timeline view**: chronological list of all notes, stage changes, interview dates
  - **Add note form**: text input + note type selector (General note, Interview scheduled, Contact info, Follow-up reminder)
  - **Interview date picker**: select date/time, shown as a highlighted timeline entry
  - **Contact info**: name, email, phone for the recruiter/hiring manager
  - Stage change history is auto-logged (when card is dragged to a new column, a `status_change` note is created automatically)
- Notes are stored in `tracker_notes` and fetched per item

---

### Phase 4: Apply Kit — AI Cover Letter Generation

- Create edge function `generate-cover-letter` that:
  - Receives job title, company, job description, user's CV text (extracted on upload), and selected tone
  - Calls Lovable AI (`google/gemini-3-flash-preview`) with a tailored system prompt per tone (Direct, Warm-professional, Minimal)
  - Streams the response back via SSE
- Frontend flow:
  - From JobDetail "Generate Cover Letter" button → opens a dialog/page
  - User selects tone, sees streaming output
  - "Save" stores the letter in `cover_letters` table
  - Saved letters are listed in the Apply Kit cover letter tab, linked to the tracker item if applicable
  - Fact-check section runs a second quick AI call to verify company name, role title, and key claims match the job description

---

### Phase 5: Apply Kit — CV Tailoring Suggestions

- Create edge function `tailor-cv` that:
  - Receives the job description text and the user's uploaded CV text
  - Calls Lovable AI to analyze keyword gaps, missing skills, and suggests bullet-point improvements
  - Returns structured output via tool calling (list of suggestions with category: "missing keyword", "rephrase", "add experience")
- Frontend flow:
  - From JobDetail "Tailor CV" button → opens a panel showing side-by-side: job requirements vs. CV highlights
  - AI suggestions appear as actionable cards: "Add keyword: Agile methodology", "Rephrase: Your project management bullet could mention team size"
  - Each suggestion has a copy button so users can paste improvements into their CV
  - CV upload in Apply Kit extracts text (via edge function using document parsing) and stores it for reuse

---

### Implementation Order

1. Database migration (all tables + RLS + storage bucket)
2. Auth implementation (signup/login/protected routes)
3. Tracker: wire to real data + drag-and-drop
4. Tracker: notes/timeline sheet
5. Edge function: `generate-cover-letter` + frontend UI
6. Edge function: `tailor-cv` + frontend UI
7. Update all i18n strings (EN + BG)

