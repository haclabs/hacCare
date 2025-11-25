-- ============================================================================
-- FIX: Drop the duplicate-causing trigger
-- ============================================================================
-- Problem: Trigger auto-inserts to simulation_history when status changes
--          This conflicts with the complete_simulation() function
-- Solution: Drop the trigger - the function handles history insertion
-- ============================================================================

-- Find the trigger
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'simulation_active'
  AND trigger_name ILIKE '%complete%';

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS archive_completed_simulation_with_categories ON simulation_active;
DROP TRIGGER IF EXISTS archive_completed_simulation ON simulation_active;

-- Verify it's gone
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'simulation_active';
