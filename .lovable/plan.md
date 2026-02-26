

# Bachkam.com — Implementation Plan

## Phase 1: Foundation & Design System
- Set up i18n system (EN/BG) with language toggle and consistent key structure
- Define design tokens: colors (neutral, modern palette), typography (H1 32px, H2 24px, H3 18px, Body 16px), spacing (4px base), radii (12px cards, 10px inputs, 999px pills)
- Implement dark/light mode theming
- Build core UI components: global header (logo, search, language/theme toggle, auth menu), footer, badge system (neutral/success/warning/info), job card component, skeleton loaders

## Phase 2: Enable Lovable Cloud & Database
- Enable Lovable Cloud for auth, database, and edge functions
- Create database schema: `jobs` table (matching the strict JSON schema), `sources` table (with policy mode), `profiles` table, `saved_jobs`, `saved_searches`, `alerts`, `tracker_items`, `cover_letters`, `cv_versions`, `removal_requests`
- Set up RLS policies for user data (profiles, saved items, tracker, documents)
- Set up Supabase Auth (email + password)

## Phase 3: Home Page
- Hero block with search bar, tagline "Faster job search. Cleaner listings. One place." (EN/BG)
- Primary CTA "Search jobs" / Secondary CTA "Upload CV for matches"
- Trust strip: "Direct links to originals" | "Source shown on every listing" | "Delete your data anytime"
- How it works (3 steps)
- Popular searches chips
- Feature sections (Find roles faster, Apply Kit, Track everything)

## Phase 4: Jobs Search & Browse
- 3-column desktop layout: sticky filters (left), infinite scroll job cards (center), sticky preview panel (right)
- Mobile: 1-column with pinned search bar, bottom sheet filters, full-page job detail
- Search bar with keyword, location typeahead, work mode quick toggles
- All filter groups: city, work mode, employment type, seniority, category, salary range, language, date posted, source
- Active filter chips with clear all
- Job cards: title, company, badges row, salary badge, source + last checked, save/share actions
- Card states: default, hover, selected, new (24h), inactive
- Sorting: newest, best match, salary high→low, recently checked
- Empty states with recovery actions
- Skeleton loading states

## Phase 5: Job Detail Page
- Full job detail with sections: overview, requirements, benefits, company info, source info
- Sticky "Apply on {source}" CTA (opens new tab)
- Secondary actions: save, add to tracker, generate cover letter, copy link
- Source attribution + last checked
- Similar jobs carousel
- Report/Removal request link
- Mobile: sticky bottom bar with Apply CTA

## Phase 6: Auth & User Profiles
- Login/signup pages with email/password
- Profile page with settings
- Account deletion flow (deletes all user data)
- Data export (JSON/CSV)
- "Disable AI processing" toggle

## Phase 7: Saved Jobs & Alerts
- Saved jobs list page
- Saved searches with alert frequency (daily/weekly)
- Alerts settings with unsubscribe option
- Sign-in prompts for anonymous users trying to save

## Phase 8: Application Tracker
- Kanban board with columns: Saved, Applying, Applied, Interview, Offer, Rejected
- Drag-and-drop on desktop, tap-to-move on mobile
- Card fields: job title, company, date added, next reminder, status badge
- Quick actions: open job, add notes, set reminder, move stage
- Empty state with "Browse jobs" CTA

## Phase 9: Apply Kit
- CV upload with consent gating (PDF/DOCX)
- CV versions management
- Cover letter generator with tone presets (Direct, Warm-professional, Minimal) and language choice (EN/BG)
- Fact-check checklist before download
- CV tailoring suggestions (non-destructive, approve each change)
- Download as PDF pack
- "Do not store my documents" ephemeral processing option

## Phase 10: Sources & Legal Pages
- Sources page: table with source name, policy mode, last checked, what we store, removal link
- Removal request form (URL, reason, email, company name)
- Privacy Policy (EN + BG)
- Terms of Service (EN + BG)

## Phase 11: Mock Data & Polish
- Seed realistic Bulgarian job data (50+ listings across multiple sources and cities)
- Wire all pages together with proper routing and navigation
- Responsive testing across all breakpoints (360px–1440+)
- WCAG 2.1 AA: keyboard nav, focus rings, ARIA labels, reduced motion

**Note:** The Firecrawl ingestion pipeline, AI features (cover letter generation, job fit scoring), and email alerts will use edge functions connected to Lovable Cloud. Initially all pages will use mock data, with real data sources connected incrementally after the UI is complete.

