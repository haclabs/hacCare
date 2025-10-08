-- ============================================================================
-- FIND THE PROBLEMATIC TRIGGER
-- ============================================================================

-- Find all triggers on patient_alerts
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'patient_alerts'
ORDER BY trigger_name;

-- Get the full definition of auto_set_tenant_id function
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'auto_set_tenant_id';

-- Find which tables have this trigger
SELECT 
  event_object_table AS table_name,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE action_statement LIKE '%auto_set_tenant_id%'
ORDER BY event_object_table;
