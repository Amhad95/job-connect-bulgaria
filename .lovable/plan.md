

## Diagnosis

The notification chain is broken at **three points**:

1. **`notification_events` table doesn't exist** — The `dispatch-notification` edge function reads/writes this table, but it was never created.

2. **`notifications` table doesn't exist** — The edge function inserts in-app notifications here, but this table doesn't exist either.

3. **`queue_notification()` is a stub** — The trigger `trg_notify_employer_approval` fires correctly on `employers` and calls `queue_notification()`, but that function is just a stub that logs to `partner_events`. It never inserts into `notification_events` or calls the edge function.

**Result:** The trigger fires → stub does nothing useful → no notification event queued → edge function never invoked → no email or in-app notification.

## Fix (single migration)

### 1. Create `notification_events` table
Outbox table for all notification events with columns: `id`, `event_type`, `channel` (email/in_app/both), `recipient_email`, `recipient_user_id`, `employer_id`, `payload` (jsonb), `idempotency_key`, `status` (queued/sent/failed/skipped), `error_message`, `sent_at`, `created_at`. RLS: service-role only (no client access).

### 2. Create `notifications` table
In-app notifications with columns: `id`, `user_id`, `title`, `body`, `link`, `is_read`, `created_at`. RLS: users read/update own notifications only.

### 3. Replace `queue_notification()` stub
The real implementation will:
- Insert a row into `notification_events` with status `'queued'`
- Use `pg_net` (`net.http_post`) to asynchronously call the `dispatch-notification` edge function with the `event_id`
- Respect the `idempotency_key` to avoid duplicate events

### 4. Deploy `dispatch-notification` edge function
The function code already exists but has no logs, suggesting it may not be deployed. The migration + deploy together complete the chain.

### Technical detail: notification flow after fix

```text
Admin clicks Approve
  → approve_employer_workspace() updates employers.approval_status
  → trg_notify_employer_approval trigger fires
  → calls queue_notification() [now real, not stub]
  → INSERT into notification_events (status=queued)
  → pg_net.http_post → dispatch-notification edge function
  → edge function reads event, sends email via Resend, creates in-app notification
  → marks event as sent
```

