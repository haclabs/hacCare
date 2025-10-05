-- Check patients table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
