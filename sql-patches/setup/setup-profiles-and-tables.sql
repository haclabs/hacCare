-- Setup missing profiles table and related functions for remote Supabase
-- Copy and paste this into your Supabase SQL Editor

-- 1. CREATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'nurse' CHECK (role IN ('nurse', 'doctor', 'admin', 'super_admin')),
  department TEXT,
  license_number TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE TENANTS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  domain TEXT,
  admin_user_id UUID REFERENCES auth.users(id), -- Removed NOT NULL constraint
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
  max_users INTEGER DEFAULT 10,
  max_patients INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE TENANT_USERS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'nurse' CHECK (role IN ('nurse', 'doctor', 'admin', 'super_admin')),
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- 4. CREATE FUNCTION TO AUTO-CREATE PROFILE WHEN USER SIGNS UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREATE TRIGGER FOR AUTO-PROFILE CREATION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. CREATE RLS POLICIES FOR PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Super admins can view all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can update all profiles
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
CREATE POLICY "Super admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- System can insert profiles (for the trigger)
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- 7. CREATE RLS POLICIES FOR TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything with tenants
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;
CREATE POLICY "Super admins can manage all tenants" ON tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 8. CREATE RLS POLICIES FOR TENANT_USERS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own tenant assignments
DROP POLICY IF EXISTS "Users can view their own tenant assignments" ON tenant_users;
CREATE POLICY "Users can view their own tenant assignments" ON tenant_users
  FOR SELECT USING (user_id = auth.uid());

-- Super admins can view all tenant assignments
DROP POLICY IF EXISTS "Super admins can view all tenant assignments" ON tenant_users;
CREATE POLICY "Super admins can view all tenant assignments" ON tenant_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can manage all tenant assignments
DROP POLICY IF EXISTS "Super admins can manage all tenant assignments" ON tenant_users;
CREATE POLICY "Super admins can manage all tenant assignments" ON tenant_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- System can insert tenant assignments (for functions)
DROP POLICY IF EXISTS "System can insert tenant assignments" ON tenant_users;
CREATE POLICY "System can insert tenant assignments" ON tenant_users
  FOR INSERT WITH CHECK (true);

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_tenants_admin_user_id ON tenants(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);

-- 10. INSERT DEFAULT SYSTEM TENANT (if not exists)
INSERT INTO tenants (
  id,
  name,
  subdomain,
  admin_user_id,
  subscription_plan,
  max_users,
  max_patients,
  status,
  settings
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System Default',
  'system',
  NULL,
  'enterprise',
  1000,
  10000,
  'active',
  '{
    "timezone": "UTC",
    "date_format": "MM/DD/YYYY",
    "currency": "USD",
    "features": {
      "advanced_analytics": true,
      "medication_management": true,
      "wound_care": true,
      "barcode_scanning": true,
      "mobile_app": true
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON tenant_users TO authenticated;
