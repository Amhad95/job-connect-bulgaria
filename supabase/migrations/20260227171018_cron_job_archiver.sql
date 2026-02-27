-- Enable the pg_cron extension (This must be done in the Supabase Dashboard if blocked by permissions, but we attempt it here)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the robust Auto-Archiving function
CREATE OR REPLACE FUNCTION public.auto_archive_expired_jobs()
RETURNS void AS $$
DECLARE
    max_days INTEGER;
BEGIN
    -- Dynamically fetch the configured threshold from System Settings
    SELECT max_job_age_days INTO max_days FROM public.system_settings LIMIT 1;
    
    -- Safety Fallback defaults
    IF max_days IS NULL THEN
        max_days := 30;
    END IF;

    -- Update expired approved jobs directly in the database
    UPDATE public.job_postings 
    SET approval_status = 'ARCHIVED'
    WHERE approval_status = 'APPROVED' 
      AND posted_at < NOW() - (max_days || ' days')::interval;
END;
$$ LANGUAGE plpgsql;

-- Remove any existing cron named identically before applying
SELECT cron.unschedule('auto-archive-expired-jobs-cron');

-- Schedule the job to sweep the DB every night exactly at Midnight UTC
SELECT cron.schedule('auto-archive-expired-jobs-cron', '0 0 * * *', 'SELECT public.auto_archive_expired_jobs()');
