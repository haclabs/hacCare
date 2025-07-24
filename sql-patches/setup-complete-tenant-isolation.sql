-- Complete Multi-Tenant Setup with RLS Policies
-- Run these commands in your Supabase SQL Editor after deleting patient data

-- 1. Enable RLS on all multi-tenant tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for patients table
CREATE POLICY "Users can only see patients from their tenant"
  ON patients FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 3. Create RLS policies for patient_vitals table
CREATE POLICY "Users can only see vitals from their tenant"
  ON patient_vitals FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Create RLS policies for patient_notes table
CREATE POLICY "Users can only see notes from their tenant"
  ON patient_notes FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 5. Create RLS policies for patient_medications table
CREATE POLICY "Users can only see medications from their tenant"
  ON patient_medications FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 6. Create RLS policies for medication_administrations table
CREATE POLICY "Users can only see med administrations from their tenant"
  ON medication_administrations FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 7. Create RLS policies for patient_images table
CREATE POLICY "Users can only see images from their tenant"
  ON patient_images FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 8. Create RLS policies for tenant_users table
CREATE POLICY "Users can only see tenant_users from their tenant"
  ON tenant_users FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 9. Create triggers to automatically set tenant_id on new records
-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  -- Get the tenant_id for the current user
  SELECT tenant_id INTO user_tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  RETURN user_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to set tenant_id automatically
CREATE OR REPLACE FUNCTION set_tenant_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set tenant_id if it's not already provided and user is not super_admin
  IF NEW.tenant_id IS NULL THEN
    -- Check if user is super_admin
    IF EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      -- Super admin must explicitly set tenant_id
      RAISE EXCEPTION 'Super admin must explicitly set tenant_id';
    ELSE
      -- Regular user - auto-assign their tenant
      NEW.tenant_id := get_user_tenant_id();
      
      -- Validate that user has a tenant
      IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'User must be assigned to a tenant to create records';
      END IF;
    END IF;
  ELSE
    -- If tenant_id is provided, validate user has access to it
    IF NOT EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
        AND tenant_id = NEW.tenant_id 
        AND is_active = true
    ) AND NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'User does not have access to specified tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to all tables
CREATE TRIGGER patients_tenant_trigger
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_trigger();

CREATE TRIGGER patient_vitals_tenant_trigger
  BEFORE INSERT OR UPDATE ON patient_vitals
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_trigger();

CREATE TRIGGER patient_notes_tenant_trigger
  BEFORE INSERT OR UPDATE ON patient_notes
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_trigger();

CREATE TRIGGER patient_medications_tenant_trigger
  BEFORE INSERT OR UPDATE ON patient_medications
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_trigger();

CREATE TRIGGER medication_administrations_tenant_trigger
  BEFORE INSERT OR UPDATE ON medication_administrations
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_trigger();

CREATE TRIGGER patient_images_tenant_trigger
  BEFORE INSERT OR UPDATE ON patient_images
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_trigger();

-- 10. Verify the setup
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN (
  'patients', 
  'patient_vitals', 
  'patient_notes', 
  'patient_medications', 
  'medication_administrations', 
  'patient_images',
  'tenant_users'
)
ORDER BY tablename;
