-- PRODUCTION SECURITY TIGHTENING: Ensure only super admins can access cross-tenant data
-- This script enforces strict tenant isolation for production deployment
-- Run this in your Supabase SQL Editor

-- Step 1: Verify and tighten RLS policies on all tenant-sensitive tables

-- Patient Alerts: Only super admins and tenant users can see alerts
DROP POLICY IF EXISTS "Users can only see alerts from their tenant" ON patient_alerts;
CREATE POLICY "Strict tenant isolation for patient_alerts" ON patient_alerts
  FOR ALL USING (
    -- Super admins can see all alerts (but only confirmed super admins)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
    OR
    -- Regular users can only see alerts from their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id 
        FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      AND 
      -- Ensure user has an active profile
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- Patients: Enforce strict tenant isolation
DROP POLICY IF EXISTS "Users can only access patients from their tenant" ON patients;
CREATE POLICY "Strict tenant isolation for patients" ON patients
  FOR ALL USING (
    -- Super admins can see all patients
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
    OR
    -- Regular users can only see patients from their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id 
        FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      AND 
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- Patient Vitals: Enforce strict tenant isolation
DROP POLICY IF EXISTS "Users can only access vitals from their tenant" ON patient_vitals;
CREATE POLICY "Strict tenant isolation for patient_vitals" ON patient_vitals
  FOR ALL USING (
    -- Super admins can see all vitals
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
    OR
    -- Regular users can only see vitals from their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id 
        FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      AND 
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- Patient Medications: Enforce strict tenant isolation
DROP POLICY IF EXISTS "Users can only access medications from their tenant" ON patient_medications;
CREATE POLICY "Strict tenant isolation for patient_medications" ON patient_medications
  FOR ALL USING (
    -- Super admins can see all medications
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
    OR
    -- Regular users can only see medications from their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id 
        FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      AND 
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- Step 2: Create a function to verify user has proper tenant assignment
CREATE OR REPLACE FUNCTION user_has_tenant_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  tenant_count INTEGER;
BEGIN
  -- Check if user exists and is active
  SELECT role INTO user_role
  FROM user_profiles 
  WHERE id = auth.uid() AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Super admins always have access
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Regular users must have at least one active tenant assignment
  SELECT COUNT(*) INTO tenant_count
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true;
  
  RETURN tenant_count > 0;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_has_tenant_access() TO authenticated;

-- Step 3: Create a view for production-safe alert access
CREATE OR REPLACE VIEW secure_patient_alerts AS
SELECT 
  pa.id,
  pa.patient_id,
  pa.patient_name,
  pa.alert_type,
  pa.message,
  pa.priority,
  pa.acknowledged,
  pa.acknowledged_by,
  pa.acknowledged_at,
  pa.created_at,
  pa.tenant_id,
  t.name as tenant_name
FROM patient_alerts pa
JOIN tenants t ON pa.tenant_id = t.id
WHERE (
  -- Super admins can see all alerts
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
  OR
  -- Regular users can only see alerts from their assigned tenants
  (
    pa.tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    AND 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  )
);

-- Step 4: Update the alert fetching function to use secure access
CREATE OR REPLACE FUNCTION get_secure_alerts()
RETURNS TABLE(
  id UUID,
  patient_id UUID,
  patient_name TEXT,
  alert_type TEXT,
  message TEXT,
  priority TEXT,
  acknowledged BOOLEAN,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  tenant_id UUID,
  tenant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has proper tenant access
  IF NOT user_has_tenant_access() THEN
    RAISE EXCEPTION 'Access denied: User not properly assigned to any tenant';
  END IF;
  
  -- Return alerts based on secure view
  RETURN QUERY
  SELECT * FROM secure_patient_alerts
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_secure_alerts() TO authenticated;

-- Step 5: Revoke direct access to patient_alerts for additional security
-- Comment this out if you need direct table access for admin tools
-- REVOKE ALL ON patient_alerts FROM authenticated;
-- GRANT SELECT ON secure_patient_alerts TO authenticated;

-- Step 6: Audit current system for users without proper tenant assignments
SELECT 'SECURITY AUDIT: Users without tenant assignments' as audit_type;
SELECT 
  up.id,
  up.email,
  up.role,
  up.is_active,
  COUNT(tu.tenant_id) as tenant_count
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
WHERE up.is_active = true
GROUP BY up.id, up.email, up.role, up.is_active
HAVING COUNT(tu.tenant_id) = 0 AND up.role != 'super_admin'
ORDER BY up.email;

-- Step 7: Show super admin users (should be minimal)
SELECT 'SECURITY AUDIT: Super admin users' as audit_type;
SELECT 
  id,
  email,
  first_name,
  last_name,
  created_at,
  is_active
FROM user_profiles 
WHERE role = 'super_admin'
ORDER BY created_at;

-- Step 8: Verify RLS is enabled on all critical tables
SELECT 
  'RLS Status Check' as audit_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE tablename IN ('patients', 'patient_alerts', 'patient_vitals', 'patient_medications', 'tenant_users')
AND schemaname = 'public'
ORDER BY tablename;

SELECT 'Production security tightening completed!' as status;
