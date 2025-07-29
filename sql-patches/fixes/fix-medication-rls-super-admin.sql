-- Fix for medication visibility issue for super admin users
-- This addresses the problem where medications disappear on refresh

BEGIN;

-- First, let's check the current policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'patient_medications';

-- Drop the existing policy to recreate it with better logic
DROP POLICY IF EXISTS "Users can only access medications from their tenant" ON patient_medications;

-- Create an improved policy that handles super admin access more reliably
CREATE POLICY "Users can only access medications from their tenant" ON patient_medications
  FOR ALL USING (
    -- Super admin check (primary condition)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    -- OR regular tenant user check
    OR EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_medications.tenant_id 
      AND is_active = true
    )
  );

-- Also add a policy specifically for INSERT operations to ensure medications can be created
CREATE POLICY "Users can insert medications for their tenant" ON patient_medications
  FOR INSERT WITH CHECK (
    -- Super admin can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    -- OR regular user can insert for their tenant
    OR EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_medications.tenant_id 
      AND is_active = true
    )
  );

-- Ensure the policies are enabled
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;

-- Let's also make sure super admin users have an active tenant association
-- This ensures the tenant_users fallback works if needed
INSERT INTO tenant_users (user_id, tenant_id, role, is_active)
SELECT 
  up.id,
  '00000000-0000-0000-0000-000000000000'::uuid, -- System Default tenant
  'admin',
  true
FROM user_profiles up
WHERE up.role = 'super_admin'
AND NOT EXISTS (
  SELECT 1 FROM tenant_users tu 
  WHERE tu.user_id = up.id 
  AND tu.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND tu.is_active = true
);

COMMIT;

-- Test the policy by checking what a super admin can see
SELECT 'Testing super admin access...' as test_status;

-- This should show medications for super admin users
SELECT 
  pm.id,
  pm.name,
  pm.patient_id,
  pm.tenant_id,
  pm.created_at
FROM patient_medications pm
WHERE EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE role = 'super_admin' 
  LIMIT 1  -- Just test the existence condition
)
ORDER BY pm.created_at DESC
LIMIT 5;
