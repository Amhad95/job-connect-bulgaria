CREATE TYPE public.job_source_type AS ENUM ('EXTERNAL', 'DIRECT');

CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR NOT NULL UNIQUE,
    name_en VARCHAR NOT NULL,
    name_bg VARCHAR NOT NULL
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR NOT NULL UNIQUE,
    name_en VARCHAR NOT NULL,
    name_bg VARCHAR NOT NULL
);

CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR NOT NULL UNIQUE,
    name_en VARCHAR NOT NULL,
    name_bg VARCHAR NOT NULL
);

CREATE TABLE public.job_locations (
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, location_id)
);

CREATE TABLE public.job_categories (
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, category_id)
);

CREATE TABLE public.job_tags (
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, tag_id)
);

ALTER TABLE public.job_postings 
    ADD COLUMN title_en VARCHAR,
    ADD COLUMN title_bg VARCHAR,
    ADD COLUMN source_type public.job_source_type DEFAULT 'EXTERNAL',
    ADD COLUMN external_url VARCHAR;

ALTER TABLE public.job_posting_content
    ADD COLUMN description_en TEXT,
    ADD COLUMN description_bg TEXT;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read locations" ON public.locations FOR SELECT USING (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tags" ON public.tags FOR SELECT USING (true);

ALTER TABLE public.job_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read job locations" ON public.job_locations FOR SELECT USING (true);

ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read job categories" ON public.job_categories FOR SELECT USING (true);

ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read job tags" ON public.job_tags FOR SELECT USING (true);
