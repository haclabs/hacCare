-- Drop Debug/Test Database Functions
-- Date: November 30, 2025
-- Related PR: feature/security-performance-fixes
--
-- Context: These 4 functions were used for debugging/testing during development
-- and are no longer needed in production. They're clearly marked with "debug" or "test"
-- in their names and have no references in the active codebase.
--
-- Risk Level: VERY LOW - These are clearly debug/test functions
-- Verification: grep search found zero usage in src/ directory
--
-- WARNING: This is a DESTRUCTIVE operation. Backup your database first!
-- Test in staging before running in production.

BEGIN;

-- ============================================================
-- Debug Functions (4 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.debug_check_simulation_access(
  p_simulation_id uuid,
  p_user_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.debug_get_user_simulations(
  p_user_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.debug_list_all_simulations() CASCADE;

DROP FUNCTION IF EXISTS public.test_rls_policies() CASCADE;

COMMIT;

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this after the drop to verify functions are gone:
--
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
--   AND routine_name IN (
--     'debug_check_simulation_access',
--     'debug_get_user_simulations',
--     'debug_list_all_simulations',
--     'test_rls_policies'
--   );
--
-- Expected result: 0 rows (all functions dropped)

-- ============================================================
-- Notes
-- ============================================================
-- These functions were development/debugging tools and should never have been
-- in production. Removing them improves security by reducing attack surface
-- and simplifies database maintenance.
