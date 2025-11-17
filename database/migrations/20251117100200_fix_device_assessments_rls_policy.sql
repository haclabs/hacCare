-- =====================================================
-- FIX DEVICE ASSESSMENTS RLS POLICY
-- =====================================================
-- Add WITH CHECK clause to allow INSERT/UPDATE operations
-- Original policy only had USING (SELECT only)
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS device_assessments_tenant_isolation ON device_assessments;

-- Recreate with WITH CHECK clause
CREATE POLICY device_assessments_tenant_isolation
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

COMMENT ON POLICY device_assessments_tenant_isolation ON device_assessments IS 
'Multi-tenant isolation - users can only access device_assessments for their current tenant. WITH CHECK ensures inserts/updates also enforce tenant isolation.';
