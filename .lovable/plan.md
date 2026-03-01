

## Standardize City Tags Across the Stack

### Current state
- `location_city` on `job_postings` is free-text, filled by the LLM scraper with messy values like "Various locations worldwide", "Bitola, Burgas, Istanbul, Plovdiv...", "Not specified", etc.
- The `locations` table migration exists in code but was **never applied** — the table doesn't exist in the database.
- The admin moderation edit modal has a free-text input for city — no dropdown, no standardization.
- The Jobs page filter derives city options directly from the raw `location_city` values.
- The employer job editor also uses a free-text city input.

### Plan

#### 1. Database migration
- **Create the `locations` table** (slug, name_en, name_bg) and **seed the 10 canonical cities**.
- **Add a `location_slug` column** to `job_postings` (nullable, text) that references the standardized slug (e.g. `sofia`, `plovdiv`, `remote`). Keep `location_city` for raw scraped data / backwards compat.
- Create a helper SQL function `normalize_city(raw_text)` that maps common Bulgarian/English city names to their slug (case-insensitive matching). Returns null for unrecognized values.
- Run a one-time data UPDATE to populate `location_slug` for all existing jobs using `normalize_city(location_city)`.

Seed data:
| slug | name_en | name_bg |
|---|---|---|
| sofia | Sofia | София |
| plovdiv | Plovdiv | Пловдив |
| varna | Varna | Варна |
| burgas | Burgas | Бургас |
| ruse | Ruse | Русе |
| stara-zagora | Stara Zagora | Стара Загора |
| veliko-tarnovo | Veliko Tarnovo | Велико Търново |
| pleven | Pleven | Плевен |
| blagoevgrad | Blagoevgrad | Благоевград |
| gabrovo | Gabrovo | Габрово |

#### 2. Scraper update (`crawl-source/index.ts`)
- Update the `location_city` schema description to instruct the LLM: "Must be one of: Sofia, Plovdiv, Varna, Burgas, Ruse, Stara Zagora, Veliko Tarnovo, Pleven, Blagoevgrad, Gabrovo. Use null if not in Bulgaria or unclear."
- After extraction, run a server-side normalization map (same logic as `normalize_city`) to set `location_slug` alongside the raw `location_city`.

#### 3. Frontend: Shared city constants
- Create `src/lib/cities.ts` exporting the canonical city list with slug, name_en, name_bg.
- The display function picks `name_en` or `name_bg` based on current i18n language.

#### 4. Jobs page filter + display (`useJobs.ts`, `Jobs.tsx`, `JobCard.tsx`)
- `useJobs.ts`: Fetch `location_slug` alongside `location_city`. Map to `DbJob.citySlug`.
- `Jobs.tsx` filters: Instead of deriving cities from raw data, use the canonical city list. Filter by `citySlug`.
- `JobCard.tsx` + `JobPreviewContent`: Display the localized city name using the slug → city map, falling back to raw `location_city`.

#### 5. Admin moderation queue (`AdminDashboard.tsx`)
- Replace the free-text city input in the edit modal with a `<Select>` dropdown listing the 10 standardized cities + an "Other / Unknown" option.
- Saving writes both `location_city` (display name) and `location_slug` (canonical slug).
- Add more editable fields: employment_type, seniority, salary_min/max, description — so admins can fully fix scraped job data.

#### 6. Employer job editor (`JobEditorDialog.tsx`)
- Replace the free-text city input with the same standardized `<Select>` dropdown.

### Files to change
| File | Change |
|---|---|
| DB migration | Create `locations` table, add `location_slug` column, seed cities, backfill data |
| `supabase/functions/crawl-source/index.ts` | Constrain LLM city extraction + normalize slug post-extraction |
| `src/lib/cities.ts` | New shared constants file |
| `src/hooks/useJobs.ts` | Fetch + expose `citySlug`, use for display |
| `src/pages/Jobs.tsx` | Filter by canonical slugs, show localized names |
| `src/components/JobCard.tsx` | Show localized city name |
| `src/pages/admin/AdminDashboard.tsx` | City dropdown + more editable fields in edit modal |
| `src/components/employer/JobEditorDialog.tsx` | City dropdown |

