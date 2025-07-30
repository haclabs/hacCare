-- Security Fix: Address Supabase Security Linter Issues
-- Description: Fix SECURITY DEFINER views and enable RLS on diabetic_records table
-- Date: 2025-07-30
-- Issues Fixed:
--   1. Remove SECURITY DEFINER from user_tenant_access view
--   2. Remove SECURITY DEFINER from user_roles view (if exists)
--   3. Remove SECURITY DEFINER from tenant_statistics view (if exists)
--   4. Enable RLS on diabetic_records table and add appropriate policies

BEGIN;

-- =============================================================================
-- 1. Fix SECURITY DEFINER Views
-- =============================================================================

-- Drop and recreate user_tenant_access view without SECURITY DEFINER
DROP VIEW IF EXISTS user_tenant_access CASCADE;

CREATE VIEW user_tenant_access AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id;

-- Grant appropriate permissions
GRANT SELECT ON user_tenant_access TO authenticated;

-- Drop and recreate user_roles view without SECURITY DEFINER (if it exists)
DROP VIEW IF EXISTS user_roles CASCADE;

-- Create user_roles view as a simple view without SECURITY DEFINER
CREATE VIEW user_roles AS
SELECT 
    up.id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    up.created_at
FROM user_profiles up;

-- Grant appropriate permissions
GRANT SELECT ON user_roles TO authenticated;

-- Drop and recreate tenant_statistics view without SECURITY DEFINER (if it exists)
DROP VIEW IF EXISTS tenant_statistics CASCADE;

-- Create tenant_statistics view as a simple view without SECURITY DEFINER
CREATE VIEW tenant_statistics AS
SELECT 
    t.id,
    t.name,
    t.created_at,
    COUNT(DISTINCT tu.user_id) as user_count,
    COUNT(DISTINCT p.id) as patient_count
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.is_active = true
LEFT JOIN patients p ON t.id = p.tenant_id
GROUP BY t.id, t.name, t.created_at;

-- Grant appropriate permissions
GRANT SELECT ON tenant_statistics TO authenticated;

-- =============================================================================
-- 2. Enable RLS on diabetic_records table and create policies
-- =============================================================================

-- Enable Row Level Security on diabetic_records table
ALTER TABLE diabetic_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view diabetic_records in their tenant" ON diabetic_records;
DROP POLICY IF EXISTS "Users can insert diabetic_records in their tenant" ON diabetic_records;
DROP POLICY IF EXISTS "Users can update diabetic_records in their tenant" ON diabetic_records;
DROP POLICY IF EXISTS "Users can delete diabetic_records in their tenant" ON diabetic_records;

-- Policy 1: SELECT - Users can view diabetic records in their tenant
CREATE POLICY "Users can view diabetic_records in their tenant"
  ON diabetic_records FOR SELECT
  USING (
    -- Super admins can see everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can see records in their tenant
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.is_active = true
    )
  );

-- Policy 2: INSERT - Users can create diabetic records in their tenant
CREATE POLICY "Users can insert diabetic_records in their tenant"
  ON diabetic_records FOR INSERT
  WITH CHECK (
    -- Super admins can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can insert records in their tenant
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.is_active = true
    )
  );

-- Policy 3: UPDATE - Users can update diabetic records in their tenant
CREATE POLICY "Users can update diabetic_records in their tenant"
  ON diabetic_records FOR UPDATE
  USING (
    -- Super admins can update everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can update records in their tenant
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.is_active = true
    )
  )
  WITH CHECK (
    -- Ensure updated records still belong to user's tenant
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.is_active = true
    )
  );

-- Policy 4: DELETE - Users can delete diabetic records in their tenant (admin/super_admin only)
CREATE POLICY "Users can delete diabetic_records in their tenant"
  ON diabetic_records FOR DELETE
  USING (
    -- Super admins can delete everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Admins can delete records in their tenant
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      tenant_id IN (
        SELECT tu.tenant_id 
        FROM tenant_users tu
        WHERE tu.user_id = auth.uid() AND tu.is_active = true
      )
    )
  );

-- =============================================================================
-- 3. Grant necessary permissions
-- =============================================================================

-- Grant permissions on diabetic_records table
GRANT SELECT, INSERT, UPDATE ON diabetic_records TO authenticated;
GRANT DELETE ON diabetic_records TO authenticated; -- Will be restricted by RLS policy

-- =============================================================================
-- 4. Verification and documentation
-- =============================================================================

-- Add comment documenting the security fixes
COMMENT ON TABLE diabetic_records IS 'Blood glucose and subcutaneous insulin administration records for diabetic patients - RLS enabled for multi-tenant security';

-- Log successful completion
SELECT 'Security linter issues fixed successfully' as status,
       'RLS enabled on diabetic_records, SECURITY DEFINER removed from views' as details;

COMMIT;
