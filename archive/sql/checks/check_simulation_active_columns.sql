-- Check columns in simulation_active table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'simulation_active'
ORDER BY ordinal_position;
