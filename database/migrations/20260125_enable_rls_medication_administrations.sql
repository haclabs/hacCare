-- =====================================================
-- ENABLE RLS FOR MEDICATION_ADMINISTRATIONS
-- =====================================================
-- Issue: Supabase security alerts - RLS policies exist but RLS is disabled
-- Critical: Medication administration records contain PHI/PII
-- =====================================================

-- Enable RLS on medication_administrations table
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (clean slate)
DROP POLICY IF EXISTS medication_administrations_tenant_isolation ON medication_administrations;
DROP POLICY IF EXISTS medication_administrations_select ON medication_administrations;
DROP POLICY IF EXISTS medication_administrations_insert ON medication_administrations;
DROP POLICY IF EXISTS medication_administrations_update ON medication_administrations;
DROP POLICY IF EXISTS medication_administrations_delete ON medication_administrations;

-- Create comprehensive tenant isolation policy
CREATE POLICY medication_administrations_tenant_isolation
  ON medication_administrations
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Add comment
COMMENT ON POLICY medication_administrations_tenant_isolation ON medication_administrations IS 
'Multi-tenant isolation policy. Enforces tenant_id filtering for all operations (SELECT, INSERT, UPDATE, DELETE). USING clause for reads, WITH CHECK for writes.';

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'medication_administrations') THEN
    RAISE EXCEPTION 'RLS failed to enable on medication_administrations';
  END IF;
  RAISE NOTICE 'RLS successfully enabled on medication_administrations';
END $$;

-- Verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual IS NOT NULL as has_using,
    with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'medication_administrations'
ORDER BY policyname;
