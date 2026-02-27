-- Alter employers to add is_opted_out and careers_url
ALTER TABLE public.employers 
    ADD COLUMN is_opted_out BOOLEAN DEFAULT false,
    ADD COLUMN careers_url VARCHAR;

-- Alter job_postings to add approval_status
CREATE TYPE public.job_approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

ALTER TABLE public.job_postings 
    ADD COLUMN approval_status public.job_approval_status DEFAULT 'PENDING';

-- Set existing valid jobs to APPROVED so the live board doesn't go blank
UPDATE public.job_postings SET approval_status = 'APPROVED' WHERE status = 'ACTIVE';
UPDATE public.job_postings SET approval_status = 'ARCHIVED' WHERE status = 'INACTIVE';

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_job_age_days INTEGER DEFAULT 30,
    auto_crawl_schedule VARCHAR DEFAULT '0 0 * * *'
);

-- Insert default configurations
INSERT INTO public.system_settings (max_job_age_days, auto_crawl_schedule) VALUES (30, '0 0 * * *');

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read system settings" ON public.system_settings FOR SELECT USING (true);
