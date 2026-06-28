-- DCreators Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  pin TEXT,
  address TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'creator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  subtitle TEXT,
  experience TEXT,
  expertise TEXT,
  avatar_public_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('photographer', 'designer', 'sculptor', 'artisan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creators" ON public.creators
  FOR SELECT USING (true);

-- 3. Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  image_public_id TEXT NOT NULL,
  title TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolios" ON public.portfolios
  FOR SELECT USING (true);

-- 4. Seed creator data
-- (public IDs match the Cloudinary upload: dcreators/filename)

INSERT INTO public.creators (name, code, subtitle, experience, expertise, avatar_public_id, category) VALUES
  ('Shoumik Sen',   'D101', 'BA Fine Arts, University of Calcutta',     '8 years',  'Photography, Portraiture',     'dcreators/photographer',   'photographer'),
  ('Rajdeep Das',   'D207', 'BDes NID, Ahmedabad',                     '6 years',  'UI/UX Design, Branding',       'dcreators/designer',       'designer'),
  ('Amit Ghosh',    'D305', 'Diploma in Sculpture, Govt. Art College',  '15 years', 'Sculpture, Installation Art',  'dcreators/sculptor',       'sculptor'),
  ('Ravi Kumar',    'D30',  'Traditional Crafts, Self-taught Artisan',  '20 years', 'Handicrafts, Pottery, Weaving','dcreators/artisan',        'artisan'),
  ('Sudip Paul',    'D105', 'MVA Applied Art Dept. of Visual Arts AUS', '12 years', 'Photography, Art Direction',   'dcreators/photo_archive_1','photographer'),
  ('Rahul Dey',     'D103', 'BA Photography, Jadavpur University',      '5 years',  'Wildlife Photography, Editing','dcreators/photo_archive_3','photographer'),
  ('Suita Roy',     'D207', 'MDes IIT Bombay, Industrial Design',       '4 years',  'Product Design, 3D Modeling',  'dcreators/design_hub_2',   'designer'),
  ('Rajib Sarkar',  'D207', 'BFA Applied Arts, Kala Bhavan',            '7 years',  'Graphic Design, Typography',   'dcreators/design_hub_3',   'designer');

-- 5. Seed portfolio images for each creator
-- Get the creator IDs and insert portfolio items
DO $$
DECLARE
  cid UUID;
BEGIN
  -- Shoumik
  SELECT id INTO cid FROM public.creators WHERE code = 'D101' AND name = 'Shoumik Sen';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/photo_archive_1', 1),
    (cid, 'dcreators/photo_archive_2', 2),
    (cid, 'dcreators/photo_archive_3', 3);

  -- Rajdeep
  SELECT id INTO cid FROM public.creators WHERE code = 'D207' AND name = 'Rajdeep Das';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/design_hub_1', 1),
    (cid, 'dcreators/design_hub_2', 2),
    (cid, 'dcreators/design_hub_3', 3);

  -- Amit
  SELECT id INTO cid FROM public.creators WHERE code = 'D305' AND name = 'Amit Ghosh';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/photo_archive_3', 1),
    (cid, 'dcreators/design_hub_1', 2),
    (cid, 'dcreators/photo_archive_1', 3);

  -- Ravi
  SELECT id INTO cid FROM public.creators WHERE code = 'D30' AND name = 'Ravi Kumar';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/design_hub_2', 1),
    (cid, 'dcreators/design_hub_3', 2),
    (cid, 'dcreators/photo_archive_2', 3);

  -- Sudip
  SELECT id INTO cid FROM public.creators WHERE code = 'D105' AND name = 'Sudip Paul';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/photo_archive_1', 1),
    (cid, 'dcreators/photo_archive_2', 2),
    (cid, 'dcreators/photo_archive_3', 3);

  -- Rahul
  SELECT id INTO cid FROM public.creators WHERE code = 'D103' AND name = 'Rahul Dey';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/photo_archive_3', 1),
    (cid, 'dcreators/photo_archive_1', 2),
    (cid, 'dcreators/photo_archive_2', 3);

  -- Suita
  SELECT id INTO cid FROM public.creators WHERE code = 'D207' AND name = 'Suita Roy';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/design_hub_2', 1),
    (cid, 'dcreators/design_hub_1', 2),
    (cid, 'dcreators/design_hub_3', 3);

  -- Rajib
  SELECT id INTO cid FROM public.creators WHERE code = 'D207' AND name = 'Rajib Sarkar';
  INSERT INTO public.portfolios (creator_id, image_public_id, sort_order) VALUES
    (cid, 'dcreators/design_hub_3', 1),
    (cid, 'dcreators/design_hub_2', 2),
    (cid, 'dcreators/design_hub_1', 3);
END $$;
