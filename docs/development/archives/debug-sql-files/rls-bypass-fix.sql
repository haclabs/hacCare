-- ============================================================================
-- ULTIMATE FIX: Disable RLS temporarily on patient_alerts for SECURITY DEFINER function
-- ============================================================================

-- The issue might be that RLS policies are using an outdated schema cache
-- and blocking the SECURITY DEFINER function

-- OPTION 1: Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'patient_alerts';

-- OPTION 2: If RLS is enabled, check the policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'patient_alerts';

-- OPTION 3: NUCLEAR - Temporarily disable RLS on patient_alerts
-- (Only if other options don't work)
-- ALTER TABLE patient_alerts DISABLE ROW LEVEL SECURITY;

-- OPTION 4: Better approach - ensure SECURITY DEFINER functions bypass RLS
-- by granting BYPASSRLS to the function owner

-- First, check who owns the function
SELECT 
  p.proname,
  r.rolname AS owner,
  r.rolbypassrls AS has_bypass_rls
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname LIKE '%create_patient_alert%';

-- OPTION 5: Grant BYPASSRLS to postgres role (if needed)
-- This would be done by superuser:
-- ALTER ROLE postgres BYPASSRLS;
