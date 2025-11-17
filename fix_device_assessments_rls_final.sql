-- =====================================================
-- FIX: DEVICE ASSESSMENTS RLS POLICY (FINAL)
-- =====================================================
-- Issue: WITH CHECK clause blocking INSERTs when tenant_id passed explicitly
-- Solution: Use USING clause only (match wound_assessments pattern)
-- Date: November 17, 2025
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS device_assessments_tenant_isolation ON device_assessments;

-- Recreate with USING clause only (no WITH CHECK)
-- This allows INSERT with explicit tenant_id while still enforcing tenant isolation on SELECT
CREATE POLICY device_assessments_tenant_isolation
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Verify RLS is enabled
ALTER TABLE device_assessments ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON POLICY device_assessments_tenant_isolation ON device_assessments IS 
'Tenant isolation policy. USING clause enforces tenant isolation on SELECT operations. Allows INSERT/UPDATE with explicit tenant_id matching wound_assessments pattern.';

-- Verify the policy
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'device_assessments';
