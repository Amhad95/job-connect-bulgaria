

## Three Bugs in Employer Workspace

### Bug 1: Invite emails never received
**Root cause**: The `send-invite` edge function uses `bachkam.com` as the sender domain via Resend, but this domain is not verified in Resend. The logs confirm: `"The bachkam.com domain is not verified"`. The invite record is created successfully in the database, and the UI shows "Sent!" — but the email silently fails.

**Fix**: Update `send-invite/index.ts` to use the verified `FROM_EMAIL` secret (currently set to `noreply@bacham.bg`). The edge function already reads `FROM_EMAIL` from env — the issue is the domain `bachkam.com` vs `bacham.bg`. Since the `FROM_EMAIL` secret is already configured as `noreply@bacham.bg`, the function should work if the `bacham.bg` domain is verified in Resend. If not, we should check the email domain status and potentially use the Lovable Cloud email domain instead. Additionally, the UI should surface email send failures instead of silently catching them.

**Changes**:
- **`src/pages/employer/TeamSettings.tsx`**: Instead of fire-and-forget (`.catch(console.warn)`), await the `send-invite` call and show an error toast if it fails. Only show "Invite sent!" after confirming the email was dispatched.

### Bug 2: Revoking invites doesn't update UI
**Root cause**: The `revokeInvite` function doesn't check the RPC response for errors. If the RPC returns `{ok: false, error: "..."}`, the UI still dismisses the dialog. More importantly, the revoke does work in the database (confirmed), so the real issue is likely a timing/caching problem where `fetchData()` runs before the revoked status is committed, or optimistic UI isn't applied.

**Fix in `src/pages/employer/TeamSettings.tsx`**:
- Check the RPC return value and show an error if `!data.ok`
- Optimistically remove the invite from the local `invites` state immediately, before refetching

### Bug 3: Employer-posted (DIRECT) jobs don't appear on /jobs
**Root cause**: In `useJobs.ts` line 78-87, the URL validation filter runs on ALL jobs including DIRECT ones. DIRECT jobs have `canonical_url: null`, so `new URL(null)` throws an error, the `catch` block returns `false`, and the job is silently filtered out. The DIRECT bypass at line 50-53 returns `true` before reaching this code — BUT wait, looking again, the DIRECT check at line 50 does return early. Let me re-examine...

Actually, the DIRECT check at lines 50-53 should return `true` before reaching line 78. The jobs "test" and "sr" have `source_type: 'DIRECT'` and titles longer than 3 chars. So they should pass. Let me check if there's another issue — the `employers!inner` join. If the employer's `approval_status` is not `approved`, the inner join still works (it joins on `employer_id`). The jobs exist with `status: 'ACTIVE'` and `posted_at` is set. The `or` filter on line 41 should include them since `posted_at` is within the last month.

Wait — the mapping at line 105: `applyUrl: row.apply_url ?? row.canonical_url`. Both are null for DIRECT jobs, so `applyUrl` becomes `undefined`. And `canonicalUrl` at line 106 maps to `row.canonical_url` which is null. The `DbJob` interface says `canonicalUrl: string` (non-optional), so it becomes `null` cast as string. This shouldn't cause filtering issues though.

Actually, re-reading the filter: lines 46-90. For DIRECT jobs (`isDirect = true`), it enters the block at line 50, checks title length >= 3, and returns `true`. "test" is 4 chars, "sr" is 2 chars. **"sr" fails the filter** because `row.title.length < 3` (length is 2). But "test" should pass.

So "test" should appear but doesn't. Let me check if there's a query-level issue. The `.or()` filter: `posted_at.gte.${cutoff},and(posted_at.is.null,first_seen_at.gte.${cutoff})`. The "test" job has `posted_at: 2026-03-01`, which is within the last month. So it should be included in the query results.

Could it be a stale cache? The `useJobs` hook has `staleTime: 5 * 60 * 1000` (5 minutes). If the user created the job and immediately checked, the cached result wouldn't include it.

But more likely — let me check the `employers!inner` join. If the employer doesn't have `approval_status = 'approved'`, the employer still exists, so the inner join works. The query doesn't filter on approval_status.

Actually, looking more carefully — the `canonicalUrl` field in `DbJob` is typed as `string` (required). When it's mapped from `null`, it becomes... still included in the array. The filter at lines 50-53 returns `true` for "test". So "test" should be in `validJobs`.

The issue might genuinely be the 5-minute cache. But the user says they "never appeared" — implying they waited. Let me look at this from another angle: could the query itself be filtering them out? The `.or()` syntax might be incorrect for PostgREST.

Actually, I think I found it. The `.or()` filter: `posted_at.gte.${cutoff},and(posted_at.is.null,first_seen_at.gte.${cutoff})`. In PostgREST, the `and()` inside `or()` needs parentheses. This should work. And DIRECT jobs have `posted_at` set, so they match the first condition.

Let me reconsider — maybe the issue is the query returns the jobs fine, but the mapping fails. At line 95: `company: row.employers.name`. If `employers` is returned as an array (due to the join), this would be `undefined`, and the job card might not render. But `!inner` should return a single object.

I think the most likely culprit is actually the **query cache** combined with potentially the query returning but the filter working correctly for "test" (4 chars passes) but not "sr" (2 chars fails). The user might have only checked immediately after creating.

However, to be safe, the DIRECT job filter should be more lenient — no minimum title length requirement, or at least lower it. And we should also ensure the canonicalUrl handling doesn't break anything.

**Fix in `src/hooks/useJobs.ts`**:
- For DIRECT jobs, remove or reduce the title length check (even 2-char titles should be fine for employer-posted jobs)
- Ensure `canonicalUrl` handles null gracefully for DIRECT jobs
- Consider reducing staleTime or adding a cache invalidation mechanism

### Summary of changes

| File | Change |
|------|--------|
| `src/hooks/useJobs.ts` | Fix DIRECT job filter: allow shorter titles, handle null `canonicalUrl` |
| `src/pages/employer/TeamSettings.tsx` | Handle invite email errors visibly; check revoke RPC response; optimistically remove revoked invites |
| `supabase/functions/send-invite/index.ts` | Verify FROM_EMAIL domain is correct; surface errors properly |

### Technical Details

**useJobs.ts filter fix (lines 50-53)**:
```typescript
if (isDirect) {
  if (!row.title || row.title.trim().length === 0) return false;
  return true;
}
```

**useJobs.ts canonicalUrl mapping (line 106)**:
```typescript
canonicalUrl: row.canonical_url ?? '',
```

**TeamSettings.tsx invite handling (lines 148-151)**: Await the edge function call and surface errors via toast instead of silently catching.

**TeamSettings.tsx revoke handling (lines 163-168)**: Check RPC response, optimistically remove from state, and show error toast on failure.

