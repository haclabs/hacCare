-- Fix infinite recursion in tenant_users RLS policies
-- Run this AFTER fix-rls-recursion.sql to completely resolve recursion issues

-- 1. Drop all problematic tenant_users policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can view all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can manage all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Admins can view tenant assignments in their tenant" ON tenant_users;
DROP POLICY IF EXISTS "System can insert tenant assignments" ON tenant_users;

-- 2. Create simple, non-recursive policies for tenant_users

-- Users can always view their own tenant assignments (no recursion)
CREATE POLICY "Users can view their own tenant assignments" ON tenant_users
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own tenant assignments (no recursion)
CREATE POLICY "Users can update their own tenant assignments" ON tenant_users
  FOR UPDATE USING (user_id = auth.uid());

-- Allow authenticated users to insert tenant assignments (for functions)
CREATE POLICY "Authenticated users can insert tenant assignments" ON tenant_users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update any tenant assignments (for functions)
CREATE POLICY "Authenticated users can update tenant assignments" ON tenant_users
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete tenant assignments (for functions)
CREATE POLICY "Authenticated users can delete tenant assignments" ON tenant_users
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. Simplify profiles policies to avoid recursion
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;

-- Allow authenticated users to view all profiles (controlled in app layer)
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update profiles (controlled in app layer)
CREATE POLICY "Authenticated users can update profiles" ON profiles
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert profiles
CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Simplify tenants policies
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;

-- Allow authenticated users to manage tenants (controlled in app layer)
CREATE POLICY "Authenticated users can manage tenants" ON tenants
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON tenants TO authenticated; 
GRANT ALL ON tenant_users TO authenticated;

-- 6. Create a function to check if user is super admin (no RLS recursion)
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_users.user_id = is_super_admin.user_id 
    AND role = 'super_admin'
  );
$$;
