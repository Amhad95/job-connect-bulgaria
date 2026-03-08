

## Fix TheirStack Import — Reduce Page Size

The edge function was not deployed (404). I've deployed it and confirmed it's now reachable. However, all 4 sources fail with TheirStack error **E-020**: "Your current plan allows up to 25 results per page."

### Root Cause
Each `job_api_sources` row has a `config_json` with `limit: 100`, but your TheirStack plan caps at 25 per page.

### Fix
Run a single SQL update to set the limit to 25 for all TheirStack sources:

```sql
UPDATE job_api_sources
SET config_json = jsonb_set(config_json, '{limit}', '25')
WHERE provider = 'theirstack';
```

Also update the edge function's fallback default from `100` to `25` (line in `import-theirstack/index.ts`):

```typescript
// Change:
const limit = source.config_json?.limit || 100;
// To:
const limit = source.config_json?.limit || 25;
```

### Summary
1. **Database migration**: Update `config_json.limit` to 25 for all TheirStack sources
2. **Edge function code**: Change fallback limit from 100 to 25

After these changes, retry the import from the admin panel.

