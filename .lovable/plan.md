

## Fixing Employer Workspace Issues

Four distinct bugs identified after investigating the code and database schema.

---

### Issue 1: Cannot save/publish jobs — `canonical_url` NOT NULL violation

**Root cause**: `JobEditorDialog.tsx` never sets `canonical_url` in the insert payload. The column has a NOT NULL constraint in the actual database (despite schema metadata suggesting otherwise).

**Fix**: 
- **DB migration**: `ALTER TABLE job_postings ALTER COLUMN canonical_url DROP NOT NULL;` to allow null for employer-posted (DIRECT) jobs that don't have an external URL.
- **Code** (`JobEditorDialog.tsx`): Optionally set `canonical_url` to null explicitly in the jobRow object for clarity.

---

### Issue 2: Team invitations — RPC return type mismatch + email never sent

**Root cause**: The `create_employer_invite` RPC returns a plain **text** string (the token), not a JSON object. But `TeamSettings.tsx` line 133 checks `data?.ok` (always undefined on a string) and line 150 sends `data.invite_id` (also undefined). So:
- The code falls into the error branch incorrectly ("Invite failed") even though the invite was created successfully — OR it passes but sends a bad payload to the edge function.
- The edge function receives `{ invite_id: undefined }`, so the email is never sent.

**Fix** (`TeamSettings.tsx`):
- After the RPC call, treat `data` as a string token (the return value).
- If `error` is null and `data` is truthy, the invite succeeded.
- To call `send-invite`, we need the invite ID. Query `employer_invites` by token to get the ID, or change the approach: look up the most recent pending invite for that email, or modify the RPC to return jsonb. The simplest client-side fix: query the invite by token after creation.

Alternatively, **update the RPC** `create_employer_invite` to return `jsonb` containing `{ ok: true, token, invite_id }` instead of just the token text. This is cleaner.

---

### Issue 3: Revoking invitations fails silently

**Root cause**: The RLS policy `invite: deny user mutate` is a **restrictive ALL** policy with `WITH CHECK (false)`. This blocks all INSERT/UPDATE/DELETE from the client, including the revoke UPDATE at line 164-167.

**Fix**: Create a new **security definer RPC** `revoke_employer_invite(p_invite_id uuid)` that:
- Verifies the caller is owner/admin of the invite's employer.
- Updates the invite status to `'revoked'`.
- Call this RPC from `TeamSettings.tsx` instead of a direct `.update()`.

---

### Issue 4: Employer-posted jobs don't appear on /jobs page

**Root cause**: This is a downstream effect of Issue 1 — jobs can't be created at all due to the NOT NULL constraint. Once Issue 1 is fixed, the `useJobs.ts` filter already handles `DIRECT` source_type correctly (lines 48-53: bypasses scraping heuristics, only requires title length >= 3).

No additional code change needed for this once Issue 1 is resolved.

---

### Summary of changes

| File / Layer | Change |
|---|---|
| **DB migration** | 1. `ALTER TABLE job_postings ALTER COLUMN canonical_url DROP NOT NULL` |
| **DB migration** | 2. Alter `create_employer_invite` RPC to return `jsonb` with `ok`, `token`, `invite_id` |
| **DB migration** | 3. Create `revoke_employer_invite(p_invite_id uuid)` security definer RPC |
| `src/pages/employer/TeamSettings.tsx` | Fix `handleInvite` to use new jsonb return; fix `revokeInvite` to call new RPC |
| `src/components/employer/JobEditorDialog.tsx` | Minor: explicitly set `canonical_url: null` in jobRow for DIRECT jobs |

