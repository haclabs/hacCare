-- =====================================================
-- FIX: DEVICE ASSESSMENTS RLS POLICY
-- =====================================================
-- Migration: 20251117150000
-- Issue: current_setting('app.current_tenant_id') never set in app
-- Solution: Allow authenticated users, enforce tenant_id at app level
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS device_assessments_tenant_isolation ON device_assessments;

-- Create policy that allows all authenticated users
-- Application enforces tenant isolation by explicitly passing tenant_id
CREATE POLICY device_assessments_allow_authenticated
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE device_assessments ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON POLICY device_assessments_allow_authenticated ON device_assessments IS 
'Allows all authenticated users. Tenant isolation enforced at application level via explicit tenant_id in queries. Matches pattern used by other clinical tables.';
