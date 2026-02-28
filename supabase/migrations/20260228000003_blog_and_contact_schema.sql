-- Blog Posts & Contact Messages schema
-- Apply via: Supabase Dashboard → SQL Editor  OR  supabase db push

-- ── blog_posts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  slug             TEXT        UNIQUE NOT NULL,          -- SEO-friendly URL segment
  excerpt          TEXT,                                 -- card preview / meta description
  content          TEXT        NOT NULL,                 -- markdown or HTML body
  cover_image_url  TEXT,
  author_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at     TIMESTAMPTZ,                          -- NULL = draft, past date = live
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts (published_at is not null and in the past)
CREATE POLICY "Public read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

-- Authors can insert their own posts
CREATE POLICY "Authors can insert own blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their own posts
CREATE POLICY "Authors can update own blog posts"
  ON public.blog_posts
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own blog posts"
  ON public.blog_posts
  FOR DELETE
  USING (auth.uid() = author_id);

-- ── contact_messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'unread',  -- unread | read | replied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit a contact message
CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read messages
-- (tighten to admin role check once your roles system is in place)
CREATE POLICY "Authenticated users can read contact messages"
  ON public.contact_messages
  FOR SELECT
  USING (auth.role() = 'authenticated');
