-- ============================================================================
-- CHECK ALL VERSIONS OF LAUNCH_SIMULATION
-- ============================================================================
-- Check if there are multiple overloaded versions of the function
-- ============================================================================

SELECT 
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.pronargs as num_args,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'launch_simulation';
