-- Check the actual structure of patient_notes table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_notes'
ORDER BY ordinal_position;
