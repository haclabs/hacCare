-- ============================================================================
-- COMPREHENSIVE CHECK: Find ALL triggers on simulation_active
-- ============================================================================

-- 1. Find ALL triggers on simulation_active
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'simulation_active'
ORDER BY trigger_name;

-- 2. Find all trigger functions that might insert into simulation_history
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%complete%'
  AND pg_get_functiondef(p.oid) ILIKE '%simulation_history%';

-- 3. Check if there's a trigger that fires BEFORE the function updates status
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_order
FROM information_schema.triggers
WHERE event_object_table = 'simulation_active'
  AND event_manipulation = 'UPDATE';
