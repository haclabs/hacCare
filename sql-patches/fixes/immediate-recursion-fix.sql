-- IMMEDIATE FIX: Stop infinite recursion completely
-- Copy and paste this into Supabase SQL Editor

-- Step 1: Disable RLS on tenant_users temporarily to break the cycle
ALTER TABLE tenant_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on tenant_users (this will stop the recursion immediately)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename = 'tenant_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Step 3: Drop any problematic functions that might reference tenant_users
DROP FUNCTION IF EXISTS get_user_tenant_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin_direct(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin_secure(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_tenant_secure(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;

-- Step 4: Create a simple function that bypasses RLS completely
CREATE OR REPLACE FUNCTION get_user_tenant_direct(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users 
  WHERE user_id = user_uuid 
  AND is_active = true
  LIMIT 1;
$$;

-- Step 5: Create a function to check super admin status without RLS
CREATE OR REPLACE FUNCTION is_super_admin_direct(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = user_uuid 
    AND role = 'super_admin'
    AND is_active = true
  );
$$;

-- Step 6: Re-enable RLS on tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Step 7: Create the SIMPLEST possible policy that cannot cause recursion
CREATE POLICY "simple_tenant_users_access" ON tenant_users
  FOR ALL USING (
    -- Allow access if user owns the record OR if called by service role
    user_id = auth.uid() OR auth.role() = 'service_role'
  );

-- Step 8: Update other table policies to use the direct functions
-- Patients table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_policy" ON patients';
    EXECUTE 'DROP POLICY IF EXISTS "patients_tenant_isolation" ON patients';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_users_can_access_patients" ON patients';
    
    -- Create simple policy using direct function
    EXECUTE 'CREATE POLICY "patients_simple_access" ON patients 
             FOR ALL USING (
               is_super_admin_direct() OR 
               tenant_id = get_user_tenant_direct() OR
               auth.role() = ''service_role''
             )';
  END IF;
END $$;

-- Step 9: Fix profiles policies
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON profiles;
DROP POLICY IF EXISTS "profiles_secure_update" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

-- Simple profiles policy
CREATE POLICY "profiles_simple_access" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    is_super_admin_direct() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "profiles_simple_update" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR 
    is_super_admin_direct() OR
    auth.role() = 'service_role'
  );

-- Step 10: Fix tenants policies
DROP POLICY IF EXISTS "tenants_secure_select" ON tenants;
DROP POLICY IF EXISTS "tenants_super_admin_manage" ON tenants;
DROP POLICY IF EXISTS "Users can view tenants" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can view tenants" ON tenants;

CREATE POLICY "tenants_simple_access" ON tenants
  FOR SELECT USING (
    is_super_admin_direct() OR
    id = get_user_tenant_direct() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "tenants_admin_manage" ON tenants
  FOR ALL USING (
    is_super_admin_direct() OR
    auth.role() = 'service_role'
  );

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_tenant_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin_direct(UUID) TO authenticated;

-- Step 12: Apply to alerts table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alerts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_policy" ON alerts';
    EXECUTE 'CREATE POLICY "alerts_simple_access" ON alerts 
             FOR ALL USING (
               is_super_admin_direct() OR 
               tenant_id = get_user_tenant_direct() OR
               auth.role() = ''service_role''
             )';
  END IF;
END $$;

-- Step 13: Apply to patient_medications table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_medications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "patient_medications_tenant_isolation" ON patient_medications';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_policy" ON patient_medications';
    EXECUTE 'CREATE POLICY "patient_medications_simple_access" ON patient_medications 
             FOR ALL USING (
               is_super_admin_direct() OR 
               EXISTS (
                 SELECT 1 FROM patients p 
                 WHERE p.id = patient_medications.patient_id 
                 AND p.tenant_id = get_user_tenant_direct()
               ) OR
               auth.role() = ''service_role''
             )';
  END IF;
END $$;
