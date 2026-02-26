
-- Add parent_source_id to link ATS child sources to their parent career-page source
ALTER TABLE public.employer_sources
ADD COLUMN parent_source_id uuid REFERENCES public.employer_sources(id);

-- Drop the existing unique constraint on employer_id (one employer can now have multiple sources)
ALTER TABLE public.employer_sources
DROP CONSTRAINT IF EXISTS employer_sources_employer_id_key;

-- Add index for looking up child sources by parent
CREATE INDEX idx_employer_sources_parent ON public.employer_sources(parent_source_id) WHERE parent_source_id IS NOT NULL;

-- Add index for looking up sources by employer_id + ats_type
CREATE INDEX idx_employer_sources_employer_ats ON public.employer_sources(employer_id, ats_type);
