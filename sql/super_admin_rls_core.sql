-- Super Simple Super Admin Setup (Core Tables Only)
-- This version only sets up RLS for the essential tables we know exist

-- Clean up any existing functions
DROP FUNCTION IF EXISTS public.current_user_is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_tenant(uuid) CASCADE;

-- Create super admin check function
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  -- Check if user has super_admin role in user_profiles table
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) INTO is_admin;
  
  -- If user_profiles doesn't exist or no record found, check auth metadata
  IF NOT is_admin THEN
    SELECT COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    ) INTO is_admin;
  END IF;
  
  RETURN is_admin;
EXCEPTION 
  WHEN OTHERS THEN
    -- Fallback to auth metadata if user_profiles table doesn't exist
    RETURN COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    );
END;
$$;

-- Create simple tenant access function for patients table only
CREATE OR REPLACE FUNCTION public.user_has_patient_access(patient_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Super admin can access all patients
  IF public.current_user_is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Regular users can only access patients from their assigned tenants
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = patient_tenant_id 
    AND is_active = true
  ) INTO has_access;
  
  RETURN has_access;
EXCEPTION
  WHEN OTHERS THEN
    -- If tenant_users doesn't exist, allow access (single tenant mode)
    RETURN true;
END;
$$;

-- Apply RLS to patients table (the core table we know exists)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin_patient_access" ON patients;
CREATE POLICY "super_admin_patient_access" ON patients
  FOR ALL 
  USING (
    CASE 
      WHEN tenant_id IS NULL THEN true  -- Allow access if no tenant_id (single tenant)
      ELSE public.user_has_patient_access(tenant_id)
    END
  );

-- Apply RLS to patient_medications if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_medications') THEN
    ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_medication_access" ON patient_medications;
    CREATE POLICY "super_admin_medication_access" ON patient_medications
      FOR ALL USING (
        CASE 
          WHEN tenant_id IS NULL THEN true
          ELSE public.user_has_patient_access(tenant_id)
        END
      );
    RAISE NOTICE '✅ Applied RLS to patient_medications';
  ELSE
    RAISE NOTICE '⚠️ patient_medications table not found, skipping';
  END IF;
END $$;

-- Apply RLS to patient_alerts if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_alerts') THEN
    ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_alert_access" ON patient_alerts;
    CREATE POLICY "super_admin_alert_access" ON patient_alerts
      FOR ALL USING (
        CASE 
          WHEN tenant_id IS NULL THEN true
          ELSE public.user_has_patient_access(tenant_id)
        END
      );
    RAISE NOTICE '✅ Applied RLS to patient_alerts';
  ELSE
    RAISE NOTICE '⚠️ patient_alerts table not found, skipping';
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
  
  -- Validate tenant exists if target_tenant_id provided
  IF target_tenant_id IS NOT NULL THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id::uuid) THEN
        RAISE EXCEPTION 'Invalid tenant ID: %', target_tenant_id;
      END IF;
    EXCEPTION 
      WHEN OTHERS THEN
        -- If tenants table doesn't exist, just accept any tenant_id
        NULL;
    END;
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
GRANT EXECUTE ON FUNCTION public.user_has_patient_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_super_admin_tenant_context(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_tenant_context() TO authenticated;

-- Test the setup
DO $$
DECLARE
  is_admin boolean;
  patient_count integer;
BEGIN
  SELECT public.current_user_is_super_admin() INTO is_admin;
  SELECT COUNT(*) FROM patients INTO patient_count;
  
  RAISE NOTICE '🔧 Super Admin Setup Complete!';
  RAISE NOTICE 'Current user is super admin: %', is_admin;
  RAISE NOTICE 'Total accessible patients: %', patient_count;
  
  IF is_admin THEN
    RAISE NOTICE '🎉 Super admin detected - you have access to all tenant data!';
  ELSE
    RAISE NOTICE 'ℹ️ Regular user detected - RLS restrictions apply';
  END IF;
END $$;