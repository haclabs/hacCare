-- Complete Database Setup for hacCare Multi-Tenant System
-- This script creates the entire database structure with empty data
-- Includes a default super admin user that must change password on first login
-- 
-- Usage: Run this on a fresh PostgreSQL database with Supabase extensions
-- Requirements: Supabase (or PostgreSQL with auth extensions)

-- =============================================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security helpers (Supabase specific)
-- Note: For non-Supabase PostgreSQL, you may need to adapt auth functions

-- =============================================================================
-- STEP 2: CREATE CORE TABLES
-- =============================================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'nurse' CHECK (role IN ('nurse', 'doctor', 'admin', 'super_admin')),
  department TEXT,
  license_number TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  admin_user_id UUID REFERENCES user_profiles(id),
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
  max_users INTEGER DEFAULT 10,
  max_patients INTEGER DEFAULT 100,
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant users junction table
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'nurse' CHECK (role IN ('nurse', 'doctor', 'admin', 'super_admin')),
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  room_number TEXT,
  admission_date DATE,
  discharge_date DATE,
  medical_record_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  allergies TEXT[],
  medical_conditions TEXT[],
  current_medications TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient alerts table (with tenant_id for proper isolation)
CREATE TABLE IF NOT EXISTS patient_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('vital_signs', 'medication', 'wound_care', 'general')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  vital_signs JSONB,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Patient vitals table
CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES user_profiles(id),
  temperature DECIMAL(4,1),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  oxygen_saturation DECIMAL(5,2),
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient medications table
CREATE TABLE IF NOT EXISTS patient_medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT,
  prescribed_by UUID REFERENCES user_profiles(id),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient notes table
CREATE TABLE IF NOT EXISTS patient_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id),
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'nursing', 'medical', 'discharge')),
  title TEXT,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_tenant_id ON patient_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_patient_id ON patient_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_tenant_id ON patient_vitals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient_id ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_tenant_id ON patient_medications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_patient_id ON patient_medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_tenant_id ON patient_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);

-- =============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: CREATE RLS POLICIES
-- =============================================================================

-- User profiles policies
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Tenants policies
CREATE POLICY "Super admins can manage all tenants" ON tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Tenant admins can read their tenant" ON tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() AND tenant_id = tenants.id AND is_active = true
    )
  );

-- Tenant users policies
CREATE POLICY "Users can see tenant_users from their tenant" ON tenant_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu_check
      WHERE tu_check.user_id = auth.uid() 
      AND tu_check.tenant_id = tenant_users.tenant_id 
      AND tu_check.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Patients policies
CREATE POLICY "Users can only access patients from their tenant" ON patients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patients.tenant_id 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Patient alerts policies
CREATE POLICY "Users can only access alerts from their tenant" ON patient_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_alerts.tenant_id 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Patient vitals policies
CREATE POLICY "Users can only access vitals from their tenant" ON patient_vitals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_vitals.tenant_id 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Patient medications policies
CREATE POLICY "Users can only access medications from their tenant" ON patient_medications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_medications.tenant_id 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Patient notes policies
CREATE POLICY "Users can only access notes from their tenant" ON patient_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_notes.tenant_id 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =============================================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to get current user's tenant ID
CREATE OR REPLACE FUNCTION get_current_user_tenant()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant users (fixed version)
CREATE OR REPLACE FUNCTION get_tenant_users(target_tenant_id UUID)
RETURNS TABLE(
  user_id UUID, 
  tenant_id UUID, 
  role VARCHAR(20),
  permissions TEXT[], 
  is_active BOOLEAN,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  license_number TEXT,
  phone TEXT,
  user_is_active BOOLEAN
) AS $$
DECLARE
  current_user_role TEXT;
  user_can_access BOOLEAN := FALSE;
BEGIN
  -- Get current user's role
  SELECT up.role INTO current_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Check if user has permission to view tenant users
  IF current_user_role = 'super_admin' THEN
    user_can_access := TRUE;
  ELSIF current_user_role = 'admin' THEN
    SELECT EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid() 
      AND tu.tenant_id = target_tenant_id 
      AND tu.is_active = true
    ) INTO user_can_access;
  END IF;
  
  IF NOT user_can_access THEN
    RAISE EXCEPTION 'Insufficient permissions to view tenant users';
  END IF;
  
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role::VARCHAR(20),
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name,
    up.department,
    up.license_number,
    up.phone,
    up.is_active as user_is_active
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id
  AND tu.is_active = true
  ORDER BY up.first_name, up.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'nurse')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update user profile timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to tables with updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_medications_updated_at BEFORE UPDATE ON patient_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_notes_updated_at BEFORE UPDATE ON patient_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: GRANT PERMISSIONS
-- =============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant specific function permissions
GRANT EXECUTE ON FUNCTION get_current_user_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;

-- =============================================================================
-- STEP 8: INSERT DEFAULT SUPER ADMIN USER
-- =============================================================================

-- Note: This requires manual intervention for password setup
-- The super admin will need to be created through Supabase Auth UI or API
-- This is just the profile setup

DO $$
DECLARE
  default_admin_id UUID;
BEGIN
  -- Check if we're in a Supabase environment or need to create auth user differently
  -- In Supabase, you'll need to create the auth user first, then run this
  
  -- For now, we'll create a placeholder that can be updated
  -- Replace 'your-admin-email@domain.com' with your actual admin email
  
  -- This assumes the auth.users record already exists
  -- You'll need to create it via Supabase dashboard or auth API first
  
  RAISE NOTICE 'Database setup complete!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create super admin user in Supabase Auth (or your auth system)';
  RAISE NOTICE '2. Update the user_profiles table with the correct admin user ID';
  RAISE NOTICE '3. Force password change on first login';
  
END $$;

-- =============================================================================
-- STEP 9: SETUP COMPLETE MESSAGE
-- =============================================================================

SELECT 
  'hacCare Database Setup Complete!' as status,
  'Remember to create your super admin user via Supabase Auth' as next_step;
