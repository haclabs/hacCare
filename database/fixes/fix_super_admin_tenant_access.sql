-- ============================================================================
-- FIX: Ensure Super Admins Can See All Tenants
-- ============================================================================

-- Check current user and their role
SELECT 
  'Current Auth User' as check_name,
  auth.uid() as user_id,
  (SELECT role FROM user_profiles WHERE id = auth.uid()) as role;

-- Check if super admins have a policy to see all tenants
SELECT 
  'Tenant Policies for Super Admin' as check_name,
  policyname,
  cmd,
  pg_get_expr(qual, 'tenants'::regclass) as using_clause
FROM pg_policies
WHERE tablename = 'tenants'
  AND schemaname = 'public'
ORDER BY policyname;

-- Grant super admins full access to tenants table
DROP POLICY IF EXISTS tenants_super_admin_full_access ON tenants;

CREATE POLICY tenants_super_admin_full_access
  ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- Verify policy was created
SELECT 
  'New Policy Created' as check_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'tenants'
  AND policyname = 'tenants_super_admin_full_access';

-- Test query: What can the current user see?
SELECT 
  'Tenants Visible to Current User' as check_name,
  id,
  name,
  tenant_type,
  status
FROM tenants
WHERE status = 'active'
ORDER BY created_at;
