-- Check the structure of patient_vitals table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_vitals'
ORDER BY ordinal_position;
