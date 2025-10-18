-- Check columns in simulation_activity_log
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'simulation_activity_log'
ORDER BY ordinal_position;
