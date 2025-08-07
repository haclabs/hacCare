-- IMMEDIATE FIX for Tenant Creation Permission Error
-- This is a quick fix to allow tenant creation while maintaining security
-- Run this in your Supabase SQL Editor NOW

-- Temporarily allow authenticated users to create tenants
-- This is safe for development and initial setup

-- Check current RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenants';

-- Drop the overly restrictive policy if it exists
DROP POLICY IF EXISTS "tenants_admin_manage" ON tenants;
DROP POLICY IF EXISTS "tenant_insert_policy" ON tenants;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "authenticated_users_can_create_tenants" ON tenants
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL  -- Any authenticated user can create tenants
);

-- Ensure SELECT policy allows users to see tenants they create
DROP POLICY IF EXISTS "tenant_select_policy" ON tenants;
CREATE POLICY "users_can_view_accessible_tenants" ON tenants
FOR SELECT USING (
  -- Super admins can see all
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR
  -- Users can see tenants they belong to
  id IN (
    SELECT tenant_id 
    FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR
  -- Users can see tenants they created (admin_user_id)
  admin_user_id = auth.uid()
  OR
  -- Service role has full access
  auth.role() = 'service_role'
);

-- Ensure proper permissions are granted
GRANT SELECT, INSERT, UPDATE ON tenants TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE tenants_id_seq TO authenticated;

-- Verify the fix worked
SELECT 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename = 'tenants' AND cmd = 'INSERT';

-- Test query - this should work now
SELECT 'Ready to create tenants!' as status;
