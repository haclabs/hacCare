-- Verify the exact signature of create_patient_alert function
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  type_udt_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_patient_alert';

-- Get the parameters
SELECT 
  parameter_name,
  data_type,
  parameter_mode,
  ordinal_position
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND specific_name LIKE '%create_patient_alert%'
ORDER BY ordinal_position;
