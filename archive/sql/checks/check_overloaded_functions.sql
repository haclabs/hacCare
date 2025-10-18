-- Find overloaded function signatures for move_patient_to_tenant
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_identity_arguments(p.oid) as identity_arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'move_patient_to_tenant'
ORDER BY pg_get_function_arguments(p.oid);