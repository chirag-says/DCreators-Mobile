-- ================================================================
-- SEED: Full test@gmail.com Profile (Photographer)
-- Run in Supabase Dashboard → SQL Editor
-- ================================================================
-- This script creates a complete end-to-end profile for the
-- test@gmail.com dev account. It handles both the auth user
-- lookup AND the profile + consultant_profile rows safely.
-- ================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_profile_exists BOOLEAN;
  v_consultant_exists BOOLEAN;
BEGIN

  -- ── Step 1: Find the auth user by email ──────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'test@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for test@gmail.com. Please log in once via the app first, then re-run this script.';
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- ── Step 2: Upsert into profiles ─────────────────────────────
  INSERT INTO profiles (
    id,
    name,
    email,
    phone,
    has_consultant_profile,
    is_banned,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'Aryan Mehta',
    'test@gmail.com',
    '+91 98765 43210',
    true,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name                  = 'Aryan Mehta',
    email                 = 'test@gmail.com',
    phone                 = '+91 98765 43210',
    has_consultant_profile = true,
    updated_at            = now();

  RAISE NOTICE 'Profile upserted ✅';

  -- ── Step 3: Upsert into consultant_profiles ───────────────────
  INSERT INTO consultant_profiles (
    user_id,
    display_name,
    code,
    category,
    subtitle,
    experience,
    expertise,
    bio,
    avatar_url,
    portfolio_images,
    base_price,
    is_approved,
    is_active,
    updated_at
  ) VALUES (
    v_user_id,
    'Aryan Mehta',
    'DAM001',
    'photographer',
    'BFA Photography, Sir J.J. School of Art, Mumbai',
    '5-10 years',
    'Photography, Videography',
    'Award-winning landscape and travel photographer with 7+ years of experience. Specializing in natural light photography, conceptual compositions, and visual storytelling. My work has been featured in National Geographic India and leading travel publications.',
    'https://res.cloudinary.com/dduxexiye/image/upload/v1781541244/dcreators/profiles/lxavd5xft79kbskor6b5.jpg',
    ARRAY[
      'https://res.cloudinary.com/dduxexiye/image/upload/v1781541245/dcreators/submissions/xihvdp2ltnnunaflj5zw.jpg',
      'https://res.cloudinary.com/dduxexiye/image/upload/v1781541247/dcreators/submissions/gxeibj4dfzlkph5pccyd.jpg'
    ],
    4900.00,
    true,
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name     = 'Aryan Mehta',
    code             = 'DAM001',
    category         = 'photographer',
    subtitle         = 'BFA Photography, Sir J.J. School of Art, Mumbai',
    experience       = '5-10 years',
    expertise        = 'Photography, Videography',
    bio              = 'Award-winning landscape and travel photographer with 7+ years of experience. Specializing in natural light photography, conceptual compositions, and visual storytelling. My work has been featured in National Geographic India and leading travel publications.',
    avatar_url       = 'https://res.cloudinary.com/dduxexiye/image/upload/v1781541244/dcreators/profiles/lxavd5xft79kbskor6b5.jpg',
    portfolio_images = ARRAY[
      'https://res.cloudinary.com/dduxexiye/image/upload/v1781541245/dcreators/submissions/xihvdp2ltnnunaflj5zw.jpg',
      'https://res.cloudinary.com/dduxexiye/image/upload/v1781541247/dcreators/submissions/gxeibj4dfzlkph5pccyd.jpg'
    ],
    base_price       = 4900.00,
    is_approved      = true,
    is_active        = true,
    updated_at       = now();

  RAISE NOTICE 'Consultant profile upserted ✅';
  RAISE NOTICE '=== DONE. test@gmail.com is fully set up as Aryan Mehta (Photographer, DAM001) ===';

END $$;

-- ── Verify: Run this SELECT to confirm the data ─────────────────
SELECT
  p.id,
  p.name,
  p.email,
  p.has_consultant_profile,
  cp.display_name,
  cp.code,
  cp.category,
  cp.experience,
  cp.base_price,
  cp.is_approved,
  cp.is_active,
  LEFT(cp.avatar_url, 60) AS avatar_preview
FROM profiles p
LEFT JOIN consultant_profiles cp ON cp.user_id = p.id
WHERE p.email = 'test@gmail.com';
