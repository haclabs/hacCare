-- ============================================================================
-- VERIFY LAUNCH_SIMULATION FUNCTION VERSION
-- ============================================================================
-- Check if the function has the tenant_users INSERT code
-- ============================================================================

SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'launch_simulation';
