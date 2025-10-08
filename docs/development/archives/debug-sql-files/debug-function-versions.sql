-- Check for ALL versions of create_patient_alert function
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_patient_alert';

-- Also check what PostgREST might be seeing
SELECT 
  routine_schema,
  routine_name,
  specific_name,
  external_language,
  security_type
FROM information_schema.routines
WHERE routine_name = 'create_patient_alert';
