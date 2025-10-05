-- Check patient_vitals table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'patient_vitals'
ORDER BY ordinal_position;
