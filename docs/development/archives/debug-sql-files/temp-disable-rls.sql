-- ============================================================================
-- OPTION: Temporarily disable RLS to test if that's the issue
-- ============================================================================

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'patient_alerts';

-- TEMPORARY: Disable RLS completely on patient_alerts
-- This will help us confirm that RLS policy cache is the issue
ALTER TABLE patient_alerts DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'patient_alerts';

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Now test if alerts can be created
-- After confirming this works, we can re-enable RLS with:
-- ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;
