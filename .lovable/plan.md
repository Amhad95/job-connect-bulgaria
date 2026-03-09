

## Plan: Prevent TheirStack Credit Waste

### Root Cause
When import was triggered, **4 TheirStack sources ran concurrently**, each paginating independently. Source `d4314563` alone consumed all 200 credits across 8 pages (5 + 3), mostly on duplicate results. The code lacked:
1. **Early stop on duplicates** — kept paginating even when most results were already in the database
2. **No credit awareness** — no way to cap total API calls across sources
3. **Concurrent source execution** — all sources fire simultaneously against the same quota

### Changes

#### 1. `supabase/functions/import-theirstack/index.ts`

- **Add duplicate-ratio circuit breaker**: If >80% of a page's results are duplicates, stop paginating that source immediately. This alone would have saved ~75 credits.
- **Reduce page safety cap** from 10 to 5 (matching TheirStack's free plan limit).
- **Stop on 402/429 errors immediately** instead of continuing to the next source (they share the same API key/quota).
- **Add a short delay between sources** to avoid rate-limit (429) errors.

#### 2. No other files need changes.

### Key Code Changes

```typescript
// After processing each page, check duplicate ratio
const dupeRatio = pageSkipped / jobs.length;
if (dupeRatio > 0.8) {
  console.log(`High duplicate ratio (${dupeRatio}), stopping pagination`);
  hasMore = false;
  break;
}

// On 402 (no credits) or 429, abort ALL remaining sources
if (tsResp.status === 402 || tsResp.status === 429) {
  // ... update run as failed, then return early from the entire function
}
```

### Credit Math (if this had been in place)
- Run 2 page 1: 25 jobs, ~15 new → continue
- Run 2 page 2-3: increasingly duplicate → would have tripped 80% threshold
- **Estimated savings: ~100-125 credits**

| File | Change |
|------|--------|
| `supabase/functions/import-theirstack/index.ts` | Add duplicate circuit breaker, reduce page cap, abort on 402/429 across all sources |

