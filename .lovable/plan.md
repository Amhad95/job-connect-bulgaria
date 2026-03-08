

## Plan: Fix Admin API Sources — RLS Policies and Query Bug

Two issues are blocking the Admin API Sources page:

### Issue 1: RLS enabled with no policies (tables return empty)

`job_api_sources`, `job_import_runs`, and `job_import_items` all have RLS enabled but zero policies. This means all client-side queries return empty arrays, even for authenticated admins.

**Fix**: Add RLS policies allowing admin users (via `has_role()`) to read all rows. The edge functions use the service role key so they bypass RLS automatically.

```sql
-- job_api_sources: admin can read/update
CREATE POLICY "Admins can manage api sources"
  ON public.job_api_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- job_import_runs: admin can read
CREATE POLICY "Admins can view import runs"
  ON public.job_import_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- job_import_items: admin can read
CREATE POLICY "Admins can view import items"
  ON public.job_import_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

### Issue 2: Query references non-existent `company_name` column

In `AdminApiSources.tsx`, the "Imported Jobs" query does:
```
job_postings(title, company_name)
```
But `job_postings` has no `company_name` column. The company name comes from the `employers` table via `employer_id`.

**Fix**: Update the query to join through `employers` instead:
```typescript
job_postings(title, employers(name))
```
And update the rendering to use `item.job_postings?.employers?.name` instead of `item.job_postings?.company_name`.

### Files Changed

| File | Change |
|------|--------|
| Database migration | Add RLS policies for the 3 import tables |
| `src/pages/admin/AdminApiSources.tsx` | Fix imported jobs query to not reference `company_name` |

