

## The Problem

All 39 active sources have `policy_mode = METADATA_ONLY` — a label we assigned ourselves. But robots.txt allows full access to these career pages. The descriptions are on **public web pages** that anyone (including Google) can read. Restricting ourselves to metadata-only makes the job detail page empty and the product worthless.

72 jobs already have descriptions stored. The previous plan proposed deleting them. That was wrong.

## The Fix

### 1. Update `policy-check-source/index.ts`

When robots.txt allows access, set `policy_mode` to `FULL_TEXT_ALLOWED` instead of `METADATA_ONLY`. The logic: if robots.txt permits crawling the page, we can index the publicly visible content.

### 2. Update all active sources in the database

```sql
UPDATE employer_sources 
SET policy_mode = 'FULL_TEXT_ALLOWED' 
WHERE policy_status = 'ACTIVE' AND policy_reason = 'robots.txt allows access';
```

### 3. Update `crawl-source/index.ts` content storage

Change line 417 so that `FULL_TEXT_ALLOWED` sources store content with `store_mode = 'FULL_TEXT'`:

```typescript
store_mode: source.policy_mode === "FULL_TEXT_ALLOWED" ? "FULL_TEXT" : "METADATA_ONLY",
```

This line already exists and will now work correctly once the sources are updated.

### 4. Update existing content records

```sql
UPDATE job_posting_content SET store_mode = 'FULL_TEXT' 
WHERE store_mode = 'METADATA_ONLY' AND description_text IS NOT NULL;
```

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/policy-check-source/index.ts` | Set `policy_mode = 'FULL_TEXT_ALLOWED'` when robots.txt allows access |
| SQL (data update) | Update active sources to `FULL_TEXT_ALLOWED`; update content records to `FULL_TEXT` |

