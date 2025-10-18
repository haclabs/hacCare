-- Enhanced RLS Policies for Super Admin Multi-Tenant Access
-- This creates secure bypass policies for super admins while maintaining tenant isolation

-- Function to check if current user is super admin (moved to public schema)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  );
END;
$$;

-- Function to get user's accessible tenant IDs (moved to public schema)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins can access all tenants
  IF public.is_super_admin() THEN
    RETURN ARRAY(SELECT id::text FROM tenants WHERE status = 'active');
  END IF;
  
  -- Regular users only access their assigned tenants
  RETURN ARRAY(
    SELECT tenant_id::text 
    FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
END;
$$;

-- Enhanced RLS Policy for patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enhanced patients access policy" ON patients
  FOR ALL
  USING (
    tenant_id::text = ANY(public.get_user_tenant_ids())
  );

-- Enhanced RLS Policy for Medications
DROP POLICY IF EXISTS "Users can access medications in their tenants" ON patient_medications;
CREATE POLICY "Users can access medications in their tenants" ON patient_medications
  FOR ALL USING (
    tenant_id = ANY(public.get_user_tenant_ids())
  );

-- Enhanced RLS Policy for Alerts
DROP POLICY IF EXISTS "Users can access alerts in their tenants" ON patient_alerts;
CREATE POLICY "Users can access alerts in their tenants" ON patient_alerts
  FOR ALL USING (
    tenant_id = ANY(public.get_user_tenant_ids())
  );

-- Enhanced RLS Policy for Assessments
DROP POLICY IF EXISTS "Users can access assessments in their tenants" ON patient_assessments;
CREATE POLICY "Users can access assessments in their tenants" ON patient_assessments
  FOR ALL USING (
    tenant_id = ANY(public.get_user_tenant_ids())
  );

-- Super Admin Context Function for Tenant Switching
CREATE OR REPLACE FUNCTION public.set_super_admin_tenant_context(target_tenant_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can set tenant context
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can set tenant context';
  END IF;
  
  -- Validate tenant exists and is active
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id::uuid AND status = 'active') THEN
    RAISE EXCEPTION 'Invalid or inactive tenant ID: %', target_tenant_id;
  END IF;
  
  -- Set the context (stored in session)
  PERFORM set_config('app.current_tenant_id', target_tenant_id, false);
END;
$$;

-- Function to get current tenant context for super admin
CREATE OR REPLACE FUNCTION public.get_super_admin_tenant_context()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can get tenant context
  IF NOT public.is_super_admin() THEN
    RETURN NULL;
  END IF;
  
  RETURN current_setting('app.current_tenant_id', true);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_super_admin_tenant_context(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_tenant_context() TO authenticated;