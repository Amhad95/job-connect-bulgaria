-- Add ATS JSON blocks securely to the user profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS education_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skills_json JSONB DEFAULT '[]'::jsonb;
