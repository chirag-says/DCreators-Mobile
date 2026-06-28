-- Run this in Supabase SQL Editor FIRST, then run: node scripts/seed-supabase.js

-- Creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  subtitle TEXT,
  experience TEXT,
  expertise TEXT,
  avatar_public_id TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view creators" ON public.creators FOR SELECT USING (true);
CREATE POLICY "Anyone can insert creators" ON public.creators FOR INSERT WITH CHECK (true);

-- Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  image_public_id TEXT NOT NULL,
  title TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view portfolios" ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "Anyone can insert portfolios" ON public.portfolios FOR INSERT WITH CHECK (true);
