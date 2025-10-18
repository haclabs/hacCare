-- Check patient_medications table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'patient_medications'
ORDER BY ordinal_position;
