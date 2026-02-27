
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='is_verified') THEN
    ALTER TABLE public.employers ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='about_text') THEN
    ALTER TABLE public.employers ADD COLUMN about_text text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='admin_notes') THEN
    ALTER TABLE public.employers ADD COLUMN admin_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='billing_status') THEN
    ALTER TABLE public.employers ADD COLUMN billing_status text DEFAULT 'unset';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='renewal_date') THEN
    ALTER TABLE public.employers ADD COLUMN renewal_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='max_active_roles') THEN
    ALTER TABLE public.employers ADD COLUMN max_active_roles integer NOT NULL DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='max_seats') THEN
    ALTER TABLE public.employers ADD COLUMN max_seats integer NOT NULL DEFAULT 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='feature_direct_apply') THEN
    ALTER TABLE public.employers ADD COLUMN feature_direct_apply boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='feature_ai_ranking') THEN
    ALTER TABLE public.employers ADD COLUMN feature_ai_ranking boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='feature_ai_cv') THEN
    ALTER TABLE public.employers ADD COLUMN feature_ai_cv boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='feature_ai_cover') THEN
    ALTER TABLE public.employers ADD COLUMN feature_ai_cover boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employers' AND column_name='feature_ai_suggestions') THEN
    ALTER TABLE public.employers ADD COLUMN feature_ai_suggestions boolean NOT NULL DEFAULT false;
  END IF;
END $$;
