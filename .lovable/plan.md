

## Serve Sitemap at `www.bachkam.com/sitemap.xml`

### Problem
The dynamic sitemap lives at a backend function URL, not on the domain itself. Google Search Console expects a URL on your own domain.

### Solution
Create a **sitemap index file** at `public/sitemap.xml` that references the edge function as a sub-sitemap. Google fully supports this pattern — it reads the index, follows the link, and processes the dynamic sitemap.

### Changes

**1. Create `public/sitemap.xml`** — Static sitemap index file:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://aqspxvcgmvflbvpionnj.supabase.co/functions/v1/generate-sitemap</loc>
  </sitemap>
</sitemapindex>
```

**2. Update `public/robots.txt`** — Point sitemap directive to the domain path:
```
Sitemap: https://www.bachkam.com/sitemap.xml
```

### Result
Submit `https://www.bachkam.com/sitemap.xml` to Google Search Console. Google reads the index → follows the link to the dynamic function → indexes all your jobs and blog posts.

