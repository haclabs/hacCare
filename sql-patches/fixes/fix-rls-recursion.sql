-- Fix infinite recursion in tenant_users RLS policies - COMPLETE FIX
-- Run this in your Supabase SQL Editor

-- 1. Drop ALL policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;

DROP POLICY IF EXISTS "Users can view their own tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can view all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can manage all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Admins can view tenant assignments in their tenant" ON tenant_users;
DROP POLICY IF EXISTS "System can insert tenant assignments" ON tenant_users;

-- 2. Create SIMPLE policies without recursion

-- PROFILES: Only basic self-access
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- TENANTS: Allow all authenticated users to read (no role checking)
CREATE POLICY "Authenticated users can view tenants" ON tenants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage tenants" ON tenants
  FOR ALL WITH CHECK (true);

-- TENANT_USERS: Only self-access, no cross-referencing
CREATE POLICY "Users can view own assignments" ON tenant_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own assignments" ON tenant_users
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can manage assignments" ON tenant_users
  FOR ALL WITH CHECK (true);

-- 3. Create helper function for super admin checks (bypasses RLS)
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tenant_users 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
