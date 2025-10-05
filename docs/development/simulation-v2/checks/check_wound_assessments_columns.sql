-- Check the actual columns in wound_assessments table
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'wound_assessments'
ORDER BY ordinal_position;
