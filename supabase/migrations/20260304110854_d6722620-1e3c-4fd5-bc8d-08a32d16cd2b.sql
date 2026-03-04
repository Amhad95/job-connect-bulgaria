
CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  max_days int;
  v_deactivated int;
  v_deleted_inactive int;
  v_deleted_junk int;
  v_deleted_rejected int;
  v_deleted_runs int;
  v_runs_failed int;
BEGIN
  SELECT max_job_age_days INTO max_days FROM system_settings LIMIT 1;
  max_days := COALESCE(max_days, 30);

  -- Deactivate old EXTERNAL active jobs
  UPDATE job_postings
  SET status = 'INACTIVE'
  WHERE source_type = 'EXTERNAL'
    AND status = 'ACTIVE'
    AND posted_at < now() - (max_days || ' days')::interval;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- Hard-delete INACTIVE + never-approved jobs older than 7 days
  DELETE FROM job_postings
  WHERE status = 'INACTIVE'
    AND approval_status NOT IN ('APPROVED')
    AND last_seen_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted_inactive = ROW_COUNT;

  -- Hard-delete junk extraction methods immediately
  DELETE FROM job_postings
  WHERE extraction_method IN (
    'firecrawl_extract_not_a_job', 'map_discovery',
    'link_discovery', 'firecrawl_extract_empty'
  );
  GET DIAGNOSTICS v_deleted_junk = ROW_COUNT;

  -- Hard-delete REJECTED jobs older than 7 days
  DELETE FROM job_postings
  WHERE approval_status = 'REJECTED'
    AND last_seen_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted_rejected = ROW_COUNT;

  -- Hard-delete crawl_runs older than 14 days
  DELETE FROM crawl_runs
  WHERE started_at < now() - interval '14 days';
  GET DIAGNOSTICS v_deleted_runs = ROW_COUNT;

  -- Auto-close stuck crawl runs
  UPDATE crawl_runs
  SET status = 'FAILED', finished_at = now(),
      errors_json = '{"error":"auto-closed: stuck > 2h"}'::jsonb
  WHERE status = 'RUNNING'
    AND started_at < now() - interval '2 hours';
  GET DIAGNOSTICS v_runs_failed = ROW_COUNT;

  RETURN jsonb_build_object(
    'deactivated', v_deactivated,
    'deleted_inactive', v_deleted_inactive,
    'deleted_junk', v_deleted_junk,
    'deleted_rejected', v_deleted_rejected,
    'deleted_runs', v_deleted_runs,
    'runs_failed', v_runs_failed
  );
END;
$function$;
