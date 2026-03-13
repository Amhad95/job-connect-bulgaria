

## Diagnosis

The JSearch API calls succeed (HTTP 200) but consistently return **0 results** for Bulgaria. Here's why:

1. **`country` defaults to `"bg"`** — Line 176 in the edge function: `const country = config.country || "bg"`. Since your source configs don't include a `country` field, it always sends `country=bg`.
2. **Google Jobs coverage in Bulgaria is extremely limited** — JSearch is powered by Google Jobs, which has minimal indexing for Bulgaria. Setting `country=bg` restricts results to the Bulgarian Google Jobs index, which is nearly empty for these roles.
3. **One prior run actually worked** — Run `3e3b50a1` on Mar 12 fetched 10 results and inserted 9. That was likely before the `country` parameter was being sent (or when a US-based test query was used).

## Plan

### Fix: Remove `country` default and let query location do the work

1. **Update edge function** (`supabase/functions/import-jsearch/index.ts`):
   - Change line 176 from `const country = config.country || "bg"` to `const country = config.country || null`
   - This way, if no `country` is set in config, the parameter is omitted entirely
   - The location context ("in bulgaria") in the query string itself is sufficient for JSearch to return geographically relevant results

2. **Optionally update source configs** to explicitly set `country` to empty/null, or add a note that country should only be set if results are too broad.

This is a one-line change in the edge function. The query "marketing jobs in bulgaria" already contains the location — adding `country=bg` over-constrains it to a sparse Google Jobs regional index.

