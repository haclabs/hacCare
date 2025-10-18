-- Check simulation_participants table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'simulation_participants'
ORDER BY ordinal_position;
