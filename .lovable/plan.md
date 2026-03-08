

## Plan: Employer Mode — Translation + Language Toggle + Remove Dashboard Link

### Issues

1. **Header "Workspace" button is hardcoded English** (line 90 of `Header.tsx`) — not using `t()`.
2. **EmployerLayout has no language toggle** — all sidebar labels are hardcoded English strings.
3. **Header shows "Dashboard" link to employer users** — employers shouldn't access the applicant dashboard.

### Changes

#### 1. `src/i18n/en.ts` & `src/i18n/bg.ts` — Add translation keys

Add keys for employer workspace button, sidebar nav labels, and other hardcoded strings:
- `nav.workspace` — "Workspace" / "Работно място"
- `employer.jobPostings` — "Job Postings" / "Обяви за работа"
- `employer.applicants` — "Applicants" / "Кандидати"
- `employer.analytics` — "Analytics" / "Анализи"
- `employer.settings` — "Settings" / "Настройки"
- `employer.team` — "Team" / "Екип"
- `employer.backToWebsite` — "Back to website" / "Обратно към сайта"
- `employer.myAccount` — "My Account" / "Моят акаунт"
- `employer.workspaceSettings` — "Workspace Settings" / "Настройки на работното място"
- `employer.signOut` — "Sign Out" / "Излизане"
- Trial/status strings as needed

#### 2. `src/components/Header.tsx`

- Line 90: Replace hardcoded `Workspace` with `t("nav.workspace", "Workspace")`
- Lines 94-98: When `isEmployer` is true, **hide** the Dashboard button entirely (employer users shouldn't access the applicant dashboard)

#### 3. `src/layouts/EmployerLayout.tsx`

- Import `useTranslation` and use `t()` for all sidebar labels (`NAV_BASE`, `NAV_OWNER_ADMIN`, "Back to website", dropdown items)
- Add a **language toggle** in the sidebar bottom area (above "Back to website"), matching the compact style used in the main Header's mobile menu
- Since `NAV_BASE` uses hardcoded labels, convert them to use translation keys (either make NAV items use keys resolved inside the component, or move NAV definition inside the component)

### Files Changed

| File | Change |
|------|--------|
| `src/i18n/en.ts` | Add employer namespace translation keys |
| `src/i18n/bg.ts` | Add Bulgarian translations for employer namespace |
| `src/components/Header.tsx` | Translate "Workspace" button; hide Dashboard link for employer users |
| `src/layouts/EmployerLayout.tsx` | Import `useTranslation`; translate all labels; add language toggle to sidebar |

