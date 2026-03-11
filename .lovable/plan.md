

## Plan: Add Credit Protection to LinkedIn RapidAPI Import

### Problem
The LinkedIn RapidAPI import function has the same vulnerability as TheirStack had — no protection against 429 (quota exceeded) errors propagating across sources, no duplicate circuit breaker, and all 4 LinkedIn sources fire concurrently against the same 250-job monthly quota. The quota is now at -50 remaining.

### Changes

**`supabase/functions/import-linkedin-rapidapi/index.ts`**:

1. **Global abort on 429/402**: When a rate-limit or quota error is received, immediately stop all remaining sources (they share the same API key). Currently the error is thrown and caught per-source, but the loop continues to the next source which also fails.

2. **Duplicate circuit breaker**: After processing each page, if >80% of results are duplicates, stop paginating that source.

3. **Read rate-limit headers**: Parse `x-ratelimit-jobs-remaining` from the response headers. If remaining ≤ 0, abort immediately before processing more sources.

4. **Inter-source delay**: Add a 3-second delay between sources to avoid hammering the API.

### Key Code Additions

```typescript
// Top-level flag shared across sources
let globalAbort = false;

// Before each source
if (globalAbort) { /* skip, log as aborted */ continue; }

// After fetch response
if (resp.status === 429 || resp.status === 402) {
  globalAbort = true;
  // update run as failed, break
}

// Check remaining quota from headers
const remaining = parseInt(resp.headers.get('x-ratelimit-jobs-remaining') || '999');
if (remaining <= 0) {
  globalAbort = true;
}

// After processing page jobs — duplicate ratio check
const dupeRatio = pageSkipped / jobs.length;
if (dupeRatio > 0.8) {
  hasMore = false;
  break;
}

// Delay between sources
await delay(3000);
```

| File | Change |
|------|--------|
| `supabase/functions/import-linkedin-rapidapi/index.ts` | Add globalAbort flag, 429/402 abort, header-based quota check, duplicate circuit breaker, inter-source delay |

