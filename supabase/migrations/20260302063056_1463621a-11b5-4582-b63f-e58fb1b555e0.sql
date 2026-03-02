
-- 1. Drop the old archiver function if it exists
DROP FUNCTION IF EXISTS public.auto_archive_expired_jobs();

-- 2. Add CASCADE delete on job_posting_content.job_id
ALTER TABLE job_posting_content
  DROP CONSTRAINT IF EXISTS job_posting_content_job_id_fkey,
  ADD CONSTRAINT job_posting_content_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE;

-- 3. Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
RETURNS jsonb AS $$
DECLARE
  max_days int;
  v_deactivated int;
  v_deleted int;
  v_runs_failed int;
BEGIN
  SELECT max_job_age_days INTO max_days FROM system_settings LIMIT 1;
  max_days := COALESCE(max_days, 30);

  UPDATE job_postings
  SET status = 'INACTIVE'
  WHERE source_type = 'EXTERNAL'
    AND status = 'ACTIVE'
    AND posted_at < now() - (max_days || ' days')::interval;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  DELETE FROM job_postings
  WHERE status = 'INACTIVE'
    AND last_seen_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  UPDATE crawl_runs
  SET status = 'FAILED', finished_at = now(),
      errors_json = '{"error":"auto-closed: stuck > 2h"}'::jsonb
  WHERE status = 'RUNNING'
    AND started_at < now() - interval '2 hours';
  GET DIAGNOSTICS v_runs_failed = ROW_COUNT;

  RETURN jsonb_build_object(
    'deactivated', v_deactivated,
    'deleted', v_deleted,
    'runs_failed', v_runs_failed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 4. Schedule nightly cleanup at 01:00 UTC
SELECT cron.schedule('cleanup-stale-data', '0 1 * * *', 'SELECT public.cleanup_stale_data()');
