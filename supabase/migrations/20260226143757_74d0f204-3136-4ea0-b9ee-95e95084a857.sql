
-- Add unique constraint on employer_id for upsert support in seed function
ALTER TABLE public.employer_sources ADD CONSTRAINT employer_sources_employer_id_unique UNIQUE (employer_id);
