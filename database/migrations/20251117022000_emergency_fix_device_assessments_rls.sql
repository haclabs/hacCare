-- =====================================================
-- EMERGENCY FIX: DEVICE ASSESSMENTS RLS POLICY
-- =====================================================
-- Applied: November 17, 2025 - 02:20
-- Issue: RLS policy missing WITH CHECK clause
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS device_assessments_tenant_isolation ON device_assessments;

-- Recreate with BOTH USING and WITH CHECK clauses
CREATE POLICY device_assessments_tenant_isolation
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Verify RLS is enabled
ALTER TABLE device_assessments ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON POLICY device_assessments_tenant_isolation ON device_assessments IS 
'Multi-tenant isolation policy. USING clause allows SELECT for current tenant. WITH CHECK clause allows INSERT/UPDATE for current tenant only.';

-- Verify the policy
SELECT 
    policyname,
    cmd,
    qual IS NOT NULL as has_using,
    with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'device_assessments';
