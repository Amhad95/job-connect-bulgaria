

## Plan: Fix Favicon & Social Preview for Google Search

### Problem 1: Favicon not showing in Google results

The `index.html` has **no `<link rel="icon">` tag**. Browsers find `favicon.ico` by convention, but Google Search requires an explicit link tag. The project already has `public/favicon.ico` and `public/favicon.svg`.

**Fix**: Add explicit favicon link tags to `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

Google requires favicons to be at least 48×48px. The existing SVG scales fine. The ICO file should also work if it meets the size requirement.

### Problem 2: No preview image in search results

The OG image URL points to a Lovable storage bucket (`storage.googleapis.com/gpt-engineer-file-uploads/...`). This is fine for social media cards (Twitter, Facebook), but Google Search "preview images" are not driven by OG tags — they're auto-generated from page content.

However, for **social sharing** and **Google Discover**, the current OG image setup has issues:
- The `og:url` tag is missing (Google recommends it)
- The `twitter:site` says `@Lovable` instead of your brand

**Fix**: Add `og:url` and fix `twitter:site` in `index.html`:
```html
<meta property="og:url" content="https://www.bachkam.com" />
<meta name="twitter:site" content="@bachkam" />
```

### Files Changed

| File | Change |
|------|--------|
| `index.html` | Add favicon `<link>` tags, add `og:url`, fix `twitter:site` |

