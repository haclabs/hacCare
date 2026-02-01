-- ============================================================================
-- EMERGENCY FIX: Remove Infinite Recursion RLS Policy
-- ============================================================================

-- Drop ALL RLS policies on tenants table to stop the recursion
DROP POLICY IF EXISTS tenants_super_admin_full_access ON tenants;
DROP POLICY IF EXISTS tenants_instructors_see_program_tenants ON tenants;
DROP POLICY IF EXISTS tenants_select_own ON tenants;
DROP POLICY IF EXISTS tenants_select_all ON tenants;
DROP POLICY IF EXISTS tenants_admin_all ON tenants;
DROP POLICY IF EXISTS tenants_user_access ON tenants;

-- Show remaining policies (should be empty or only safe ones)
SELECT 
  'Remaining Policies After Drop' as check_name,
  policyname
FROM pg_policies
WHERE tablename = 'tenants';

-- Create simple, non-recursive policies

-- 1. Super admins can see and modify all tenants
CREATE POLICY tenants_super_admin_access
  ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );

-- 2. Coordinators can see all tenants in their organization
CREATE POLICY tenants_coordinator_access
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'coordinator'
    )
  );

-- 3. Regular users can see tenants they have access to via tenant_users
CREATE POLICY tenants_user_access_via_junction
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- Verify new policies
SELECT 
  'New Policies Created' as check_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;

-- Test: Can we query tenants now?
SELECT 
  'Test Query' as check_name,
  COUNT(*) as tenant_count
FROM tenants;
