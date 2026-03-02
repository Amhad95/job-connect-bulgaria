

## Database Cleanup: Purge Stale Jobs and Stuck Crawl Runs

### Problem
843 job_postings rows but only 27 visible. Hundreds of INACTIVE/stale rows and 50+ stuck crawl_runs are never cleaned up. The existing `auto_archive_expired_jobs` cron targets the wrong column (`approval_status` instead of `status`).

### Plan

**Single database migration** that:

1. **Drops the broken archiver** — unschedule `auto-archive-expired-jobs-cron` and drop the function
2. **Adds CASCADE delete** on `job_posting_content.job_id` so content rows are auto-removed with their parent job
3. **Creates `cleanup_stale_data()` function** that:
   - Deactivates EXTERNAL jobs older than `max_job_age_days` (from `system_settings`, default 30)
   - **Hard-deletes** INACTIVE jobs older than 90 days (with cascaded content)
   - Marks RUNNING crawl_runs older than 2 hours as FAILED
   - Returns a JSON summary of rows affected
4. **Schedules nightly cron** at 01:00 UTC via `pg_cron`

### Technical Detail

```sql
-- Core cleanup logic
UPDATE job_postings SET status = 'INACTIVE'
WHERE source_type = 'EXTERNAL' AND status = 'ACTIVE'
  AND posted_at < now() - (max_days || ' days')::interval;

DELETE FROM job_postings
WHERE status = 'INACTIVE'
  AND last_seen_at < now() - interval '90 days';

UPDATE crawl_runs SET status = 'FAILED', finished_at = now()
WHERE status = 'RUNNING'
  AND started_at < now() - interval '2 hours';
```

No frontend changes needed — purely backend housekeeping.

