-- Check for triggers or rules on tables that might reference tenant_id
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('simulation_active', 'simulation_participants', 'simulation_activity_log')
ORDER BY event_object_table, trigger_name;
