

## Plan: Comprehensive SEO Overhaul

The site is a client-side SPA with **zero per-page SEO**. Every page serves the same `<title>`, `<meta description>`, no canonical URL, and no structured data. Google sees every page as identical. Here's the fix:

### 1. Create a `useSEO` hook

A reusable hook that sets `document.title`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:url">`, `<link rel="canonical">`, and optionally `<meta property="og:image">` — all cleaned up on unmount/change.

**New file**: `src/hooks/useSEO.ts`

### 2. Add per-page SEO to all public pages

Call `useSEO()` in each public page with appropriate Bulgarian title + description:

| Page | Title (example) | Description |
|------|--------|-------------|
| `Index.tsx` | бачкам — Намери работа в България | Бачкам събира топ обяви от работодатели... |
| `Jobs.tsx` | Обяви за работа — бачкам | Разгледай стотици обяви за работа... |
| `JobDetail.tsx` | {job.title} @ {job.company} — бачкам | Dynamic from job data |
| `BlogPost.tsx` | {post.title} — бачкам блог | Dynamic from post data |
| `Blog.tsx` | Блог — бачкам | Съвети за кариера, CV, интервюта... |
| `About.tsx` | За нас — бачкам | ... |
| `Contact.tsx` | Контакти — бачкам | ... |
| `Employers.tsx` | За работодатели — бачкам | ... |
| `Privacy.tsx` | Поверителност — бачкам | ... |
| `Terms.tsx` | Условия за ползване — бачкам | ... |
| `OptOut.tsx` | Премахване на обява — бачкам | ... |

### 3. Add JSON-LD structured data

- **Index.tsx**: `WebSite` schema with `potentialAction` SearchAction
- **JobDetail.tsx**: `JobPosting` schema (title, company, location, salary, datePosted) — this is the single most impactful change for Google Jobs
- **BlogPost.tsx**: `Article` schema (headline, datePublished, author)
- **Employers.tsx**: `Organization` schema

### 4. Add `<html lang="bg">` dynamically

Update `index.html` to `lang="bg"` (primary audience is Bulgarian) and sync via i18n language changes.

### 5. Fix `index.html` default lang

Change `<html lang="en">` to `<html lang="bg">` since the site is primarily Bulgarian.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSEO.ts` | New — reusable SEO hook |
| `index.html` | Change `lang="en"` to `lang="bg"` |
| `src/pages/Index.tsx` | Add useSEO + WebSite JSON-LD |
| `src/pages/Jobs.tsx` | Add useSEO |
| `src/pages/JobDetail.tsx` | Add useSEO + JobPosting JSON-LD |
| `src/pages/BlogPost.tsx` | Add useSEO + Article JSON-LD |
| `src/pages/Blog.tsx` | Add useSEO |
| `src/pages/About.tsx` | Add useSEO |
| `src/pages/Contact.tsx` | Add useSEO |
| `src/pages/Employers.tsx` | Add useSEO + Organization JSON-LD |
| `src/pages/Privacy.tsx` | Add useSEO |
| `src/pages/Terms.tsx` | Add useSEO |
| `src/pages/OptOut.tsx` | Add useSEO |

