-- ============================================
-- DCreators Database Schema
-- Run this ENTIRE file in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  pin TEXT,
  avatar_url TEXT,
  has_consultant_profile BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONSULTANT PROFILES
CREATE TABLE IF NOT EXISTS consultant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('photographer', 'designer', 'sculptor', 'artisan')),
  subtitle TEXT,
  experience TEXT,
  expertise TEXT,
  bio TEXT,
  avatar_url TEXT,
  portfolio_images TEXT[],
  base_price DECIMAL(10,2),
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- Seed default categories
INSERT INTO categories (name, display_name, sort_order) VALUES
  ('photographer', 'Photographer', 1),
  ('designer', 'Designer', 2),
  ('sculptor', 'Sculptor', 3),
  ('artisan', 'Artisan', 4)
ON CONFLICT (name) DO NOTHING;

-- 4. PROJECTS (assignments)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  consultant_id UUID REFERENCES consultant_profiles(id),
  assignment_type TEXT NOT NULL,
  assignment_details TEXT[],
  assignment_brief TEXT NOT NULL,
  deadline DATE,
  budget DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'advance_paid', 'in_progress',
    'review_1', 'review_2', 'final_review',
    'approved', 'balance_paid', 'completed',
    'cancelled', 'rejected', 'expired'
  )),
  progress_percent INTEGER DEFAULT 0,
  milestone_1_date DATE,
  milestone_2_date DATE,
  final_date DATE,
  final_offer DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FLOATING QUERIES
CREATE TABLE IF NOT EXISTS floating_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  assignment_type TEXT NOT NULL,
  assignment_brief TEXT NOT NULL,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  deadline DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FLOATING QUERY RESPONSES
CREATE TABLE IF NOT EXISTS floating_query_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES floating_queries(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES consultant_profiles(id),
  proposed_price DECIMAL(10,2),
  proposed_timeline TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUBMISSIONS (design uploads per review round)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  round TEXT NOT NULL CHECK (round IN ('review_1', 'review_2', 'final')),
  files TEXT[] NOT NULL,
  consultant_note TEXT,
  selected_option INTEGER,
  feedback_colour BOOLEAN DEFAULT FALSE,
  feedback_concept BOOLEAN DEFAULT FALSE,
  feedback_design_look BOOLEAN DEFAULT FALSE,
  feedback_text TEXT,
  client_action TEXT CHECK (client_action IN ('approve', 'revert', 'hold', 'cancel')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  payer_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'balance', 'shop_purchase')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('assignment', 'payment', 'review', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SHOP PRODUCTS
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  images TEXT[],
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MESSAGES (project chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CONSULTANT PROFILES
ALTER TABLE consultant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved consultants" ON consultant_profiles
  FOR SELECT USING (is_approved = true AND is_active = true);
CREATE POLICY "Own consultant read" ON consultant_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own consultant insert" ON consultant_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own consultant update" ON consultant_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);

-- PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client reads own projects" ON projects
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Consultant reads assigned projects" ON projects
  FOR SELECT USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Client creates projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Involved parties update projects" ON projects
  FOR UPDATE USING (
    auth.uid() = client_id OR
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

-- FLOATING QUERIES
ALTER TABLE floating_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client reads own queries" ON floating_queries
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Consultants read open queries" ON floating_queries
  FOR SELECT USING (status = 'open');
CREATE POLICY "Client creates queries" ON floating_queries
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- FLOATING QUERY RESPONSES
ALTER TABLE floating_query_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Query owner reads responses" ON floating_query_responses
  FOR SELECT USING (
    query_id IN (SELECT id FROM floating_queries WHERE client_id = auth.uid())
  );
CREATE POLICY "Consultant reads own responses" ON floating_query_responses
  FOR SELECT USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Consultant creates responses" ON floating_query_responses
  FOR INSERT WITH CHECK (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

-- SUBMISSIONS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project parties read submissions" ON submissions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE
        client_id = auth.uid() OR
        consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Consultant creates submissions" ON submissions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE
        consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Client updates submissions (feedback)" ON submissions
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE client_id = auth.uid())
  );

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payer reads own payments" ON payments
  FOR SELECT USING (auth.uid() = payer_id);
CREATE POLICY "Payer creates payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User updates own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- SHOP PRODUCTS
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active products" ON shop_products
  FOR SELECT USING (is_active = true);
CREATE POLICY "Consultant manages own products" ON shop_products
  FOR ALL USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE! All 10 tables + RLS + trigger created.
-- ============================================
