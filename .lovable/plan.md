

## Update Sitemap Base URL to Production Domain

The sitemap function currently generates all URLs with `https://bachkam-jobs.lovable.app`. Since the production domain is `www.bachkam.com`, the base URL needs updating.

### Changes

**1. Update `supabase/functions/generate-sitemap/index.ts`**
- Change `BASE_URL` from `https://bachkam-jobs.lovable.app` to `https://www.bachkam.com`

**2. Update `public/robots.txt`**  
- Optionally update the `Sitemap:` directive — though the current absolute URL to the backend function works fine across domains.

### Files changed
1. `supabase/functions/generate-sitemap/index.ts` — update `BASE_URL` constant

