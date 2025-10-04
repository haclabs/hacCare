-- Minimal Super Admin RLS Setup (Conflict-Free)
-- Use this version if you encounter function conflicts

-- Clean slate - remove any existing functions
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_accessible_tenants() CASCADE;
DROP FUNCTION IF EXISTS public.user_accessible_tenants() CASCADE;

-- Simple super admin check
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Simple tenant access check
CREATE OR REPLACE FUNCTION public.user_can_access_tenant(check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  can_access boolean := false;
BEGIN
  -- Super admin can access all tenants
  IF public.current_user_is_super_admin() THEN
    SELECT EXISTS (SELECT 1 FROM tenants WHERE id = check_tenant_id AND status = 'active') 
    INTO can_access;
  ELSE
    -- Regular user can only access assigned tenants
    SELECT EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = check_tenant_id 
      AND is_active = true
    ) INTO can_access;
  END IF;
  
  RETURN can_access;
END;
$$;

-- Update RLS policies with simple function calls (only for existing tables)

-- Patients table (main patient records)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_tenant_access" ON patients;
    CREATE POLICY "super_admin_tenant_access" ON patients
      FOR ALL USING (public.user_can_access_tenant(tenant_id));
    RAISE NOTICE 'RLS policy applied to patients table';
  END IF;
END $$;

-- Patient medications table  
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_medications') THEN
    ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_tenant_access" ON patient_medications;
    CREATE POLICY "super_admin_tenant_access" ON patient_medications
      FOR ALL USING (public.user_can_access_tenant(tenant_id));
    RAISE NOTICE 'RLS policy applied to patient_medications table';
  END IF;
END $$;

-- Patient alerts table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_alerts') THEN
    ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_tenant_access" ON patient_alerts;
    CREATE POLICY "super_admin_tenant_access" ON patient_alerts
      FOR ALL USING (public.user_can_access_tenant(tenant_id));
    RAISE NOTICE 'RLS policy applied to patient_alerts table';
  END IF;
END $$;

-- Patient notes table (used for assessments)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_notes') THEN
    ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_tenant_access" ON patient_notes;
    CREATE POLICY "super_admin_tenant_access" ON patient_notes
      FOR ALL USING (
        patient_id IN (
          SELECT id FROM patients WHERE public.user_can_access_tenant(tenant_id)
        )
      );
    RAISE NOTICE 'RLS policy applied to patient_notes table';
  END IF;
END $$;

-- Wound assessments table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wound_assessments') THEN
    ALTER TABLE wound_assessments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_tenant_access" ON wound_assessments;
    CREATE POLICY "super_admin_tenant_access" ON wound_assessments
      FOR ALL USING (public.user_can_access_tenant(tenant_id));
    RAISE NOTICE 'RLS policy applied to wound_assessments table';
  END IF;
END $$;

-- Tenants table (for super admin management)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenants') THEN
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_tenant_management" ON tenants;
    CREATE POLICY "super_admin_tenant_management" ON tenants
      FOR ALL USING (
        public.current_user_is_super_admin() OR 
        id::text = ANY(
          SELECT tenant_id::text FROM tenant_users WHERE user_id = auth.uid() AND is_active = true
        )
      );
    RAISE NOTICE 'RLS policy applied to tenants table';
  END IF;
END $$;

-- User profiles table (for super admin user management)  
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_user_access" ON user_profiles;
    CREATE POLICY "super_admin_user_access" ON user_profiles
      FOR ALL USING (
        public.current_user_is_super_admin() OR 
        id = auth.uid()
      );
    RAISE NOTICE 'RLS policy applied to user_profiles table';
  END IF;
END $$;

-- Super Admin Context Functions (Required by the application)
CREATE OR REPLACE FUNCTION public.set_super_admin_tenant_context(target_tenant_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can set tenant context
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can set tenant context';
  END IF;
  
  -- Validate tenant exists and is active (if tenant_id provided)
  IF target_tenant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id::uuid AND status = 'active') THEN
      RAISE EXCEPTION 'Invalid or inactive tenant ID: %', target_tenant_id;
    END IF;
  END IF;
  
  -- Set the context (stored in session) 
  IF target_tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', target_tenant_id, false);
  ELSE
    PERFORM set_config('app.current_tenant_id', '', false);
  END IF;
  
  RAISE NOTICE 'Super admin tenant context set to: %', COALESCE(target_tenant_id, 'ALL_TENANTS');
END;
$$;

-- Function to get current tenant context for super admin
CREATE OR REPLACE FUNCTION public.get_super_admin_tenant_context()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_context text;
BEGIN
  -- Only super admins can get tenant context
  IF NOT public.current_user_is_super_admin() THEN
    RETURN NULL;
  END IF;
  
  -- Get current tenant context from session
  SELECT current_setting('app.current_tenant_id', true) INTO tenant_context;
  
  -- Return NULL if empty string (represents ALL_TENANTS mode)
  IF tenant_context = '' OR tenant_context IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN tenant_context;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_super_admin_tenant_context(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_tenant_context() TO authenticated;

-- Test the setup
DO $$
DECLARE
  is_admin boolean;
  test_tenant uuid;
BEGIN
  -- Test super admin function
  SELECT public.current_user_is_super_admin() INTO is_admin;
  RAISE NOTICE 'Current user is super admin: %', is_admin;
  
  -- Test with a sample tenant (if any exist)
  SELECT id INTO test_tenant FROM tenants LIMIT 1;
  IF test_tenant IS NOT NULL THEN
    RAISE NOTICE 'Can access tenant %: %', test_tenant, public.user_can_access_tenant(test_tenant);
  END IF;
  
  RAISE NOTICE 'Super Admin RLS setup complete!';
END $$;