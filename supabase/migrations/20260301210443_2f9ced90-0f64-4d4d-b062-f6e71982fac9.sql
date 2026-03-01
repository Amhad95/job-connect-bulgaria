
-- 1. Create locations lookup table
CREATE TABLE IF NOT EXISTS public.locations (
  slug text PRIMARY KEY,
  name_en text NOT NULL,
  name_bg text NOT NULL
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read locations" ON public.locations FOR SELECT USING (true);

-- 2. Seed 10 canonical Bulgarian cities
INSERT INTO public.locations (slug, name_en, name_bg) VALUES
  ('sofia',          'Sofia',          'София'),
  ('plovdiv',        'Plovdiv',        'Пловдив'),
  ('varna',          'Varna',          'Варна'),
  ('burgas',         'Burgas',         'Бургас'),
  ('ruse',           'Ruse',           'Русе'),
  ('stara-zagora',   'Stara Zagora',   'Стара Загора'),
  ('veliko-tarnovo', 'Veliko Tarnovo', 'Велико Търново'),
  ('pleven',         'Pleven',         'Плевен'),
  ('blagoevgrad',    'Blagoevgrad',    'Благоевград'),
  ('gabrovo',        'Gabrovo',        'Габрово')
ON CONFLICT (slug) DO NOTHING;

-- 3. Add location_slug column to job_postings
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS location_slug text;

-- 4. Create normalize_city function for mapping raw text to slug
CREATE OR REPLACE FUNCTION public.normalize_city(raw_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(raw_text))
    WHEN 'sofia' THEN 'sofia'
    WHEN 'софия' THEN 'sofia'
    WHEN 'plovdiv' THEN 'plovdiv'
    WHEN 'пловдив' THEN 'plovdiv'
    WHEN 'varna' THEN 'varna'
    WHEN 'варна' THEN 'varna'
    WHEN 'burgas' THEN 'burgas'
    WHEN 'бургас' THEN 'burgas'
    WHEN 'ruse' THEN 'ruse'
    WHEN 'русе' THEN 'ruse'
    WHEN 'rousse' THEN 'ruse'
    WHEN 'stara zagora' THEN 'stara-zagora'
    WHEN 'стара загора' THEN 'stara-zagora'
    WHEN 'veliko tarnovo' THEN 'veliko-tarnovo'
    WHEN 'велико търново' THEN 'veliko-tarnovo'
    WHEN 'veliko turnovo' THEN 'veliko-tarnovo'
    WHEN 'pleven' THEN 'pleven'
    WHEN 'плевен' THEN 'pleven'
    WHEN 'blagoevgrad' THEN 'blagoevgrad'
    WHEN 'благоевград' THEN 'blagoevgrad'
    WHEN 'gabrovo' THEN 'gabrovo'
    WHEN 'габрово' THEN 'gabrovo'
    ELSE NULL
  END;
$$;

-- 5. Backfill existing jobs
UPDATE public.job_postings
SET location_slug = public.normalize_city(location_city)
WHERE location_city IS NOT NULL AND location_slug IS NULL;
