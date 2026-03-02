

## Add Job Description Editing + City Dropdown to Moderation Modal

Two issues to fix in `src/pages/admin/AdminDashboard.tsx`:

### 1. Add editable job description field

- Expand the `Job` type to include `job_posting_content` (with `description_text`, `requirements_text`, `benefits_text`) in the fetch query via a join
- Add `description`, `requirements`, `benefits` fields to `EditForm`
- Add `Textarea` fields in the modal for description, requirements, and benefits
- On save/approve, update `job_posting_content` separately (it's a different table linked by `job_id`)

### 2. Replace city text input with a dropdown from CANONICAL_CITIES

- Replace the free-text `<Input>` for city with a `<select>` populated from `CANONICAL_CITIES` (already imported)
- Options: "— Not set —" + all 10 canonical cities showing `name_en (name_bg)` format
- Store the `location_city` as the English name and also set `location_slug` in the update payload

### Changes (single file: `src/pages/admin/AdminDashboard.tsx`)

1. Import `Textarea` from `@/components/ui/textarea`
2. Add `description`, `requirements`, `benefits` to `EditForm` type
3. Update fetch query to join `job_posting_content(description_text, requirements_text, benefits_text)`
4. Update `Job` type to include content fields
5. Update `jobToForm` to populate description/requirements/benefits
6. Replace city `<Input>` with `<select>` using `CANONICAL_CITIES`
7. Add three `Textarea` blocks in the modal body for description, requirements, benefits
8. Update `formToUpdate` to include `location_slug` derived from selected city
9. In `saveDraft` and `saveAndApprove`, after updating `job_postings`, also upsert `job_posting_content` with the text fields

