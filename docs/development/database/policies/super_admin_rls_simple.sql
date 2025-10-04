-- Alternative Super Admin RLS Setup (Permission-Safe)
-- Execute this if you get permission errors with the main SQL file

-- Clean up any existing functions first
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.get_accessible_tenants();

-- Step 1: Create helper functions in public schema
CREATE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  );
$$;

-- Step 2: Create tenant access function
CREATE FUNCTION public.get_accessible_tenants()
RETURNS TABLE(tenant_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Return all tenants for super admin
  SELECT id FROM tenants WHERE public.is_super_admin() = true
  UNION ALL
  -- Return assigned tenants for regular users
  SELECT tu.tenant_id FROM tenant_users tu
  WHERE tu.user_id = auth.uid() 
    AND tu.is_active = true 
    AND public.is_super_admin() = false;
$$;

-- Step 3: Update RLS policies (drop existing first)
DROP POLICY IF EXISTS "tenant_isolation" ON patients;
CREATE POLICY "tenant_isolation" ON patients
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.get_accessible_tenants()));

DROP POLICY IF EXISTS "tenant_isolation" ON patient_medications;  
CREATE POLICY "tenant_isolation" ON patient_medications
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.get_accessible_tenants()));

DROP POLICY IF EXISTS "tenant_isolation" ON patient_alerts;
CREATE POLICY "tenant_isolation" ON patient_alerts
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.get_accessible_tenants()));

DROP POLICY IF EXISTS "tenant_isolation" ON patient_assessments;
CREATE POLICY "tenant_isolation" ON patient_assessments
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.get_accessible_tenants()));

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_tenants() TO authenticated;

-- Step 5: Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Super Admin RLS Setup Complete!';
  RAISE NOTICE 'Test with: SELECT public.is_super_admin();';
END $$;