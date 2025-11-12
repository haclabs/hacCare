-- ===============================================
-- CLEANUP: Remove Old Broken Simulation System
-- ===============================================
-- This removes all the old simulation tables, functions, and policies
-- that were causing reset issues. We'll rebuild with a clean architecture.

-- Drop old simulation functions (in dependency order)
DROP FUNCTION IF EXISTS check_expired_simulations() CASCADE;
DROP FUNCTION IF EXISTS calculate_simulation_metrics(uuid) CASCADE; 
DROP FUNCTION IF EXISTS complete_simulation(uuid) CASCADE;
DROP FUNCTION IF EXISTS delete_simulation(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_simulation_label_data(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS generate_simulation_id_sets(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE; -- The broken one!
DROP FUNCTION IF EXISTS launch_simulation(uuid, text, integer, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS create_simulation_template(text, text, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS has_simulation_tenant_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_simulation_ends_at() CASCADE;

-- Drop old simulation tables (in dependency order)
DROP TABLE IF EXISTS simulation_activity_log CASCADE;
DROP TABLE IF EXISTS simulation_history CASCADE; 
DROP TABLE IF EXISTS simulation_participants CASCADE;
DROP TABLE IF EXISTS simulation_active CASCADE;
DROP TABLE IF EXISTS simulation_templates CASCADE;

-- Drop any simulation-related views
DROP VIEW IF EXISTS simulation_overview CASCADE;
DROP VIEW IF EXISTS active_simulations CASCADE;

-- Drop old simulation policies (they'll be recreated for new tables)
-- Note: Policies are automatically dropped when tables are dropped

-- Drop any old simulation types
DROP TYPE IF EXISTS simulation_status CASCADE;
DROP TYPE IF EXISTS simulation_participant_role CASCADE;

-- Verify cleanup (this query should return 0 rows)
DO $$
DECLARE
    sim_table_count INTEGER;
    sim_function_count INTEGER;
BEGIN
    -- Count remaining simulation tables
    SELECT COUNT(*) INTO sim_table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%simulation%';
    
    -- Count remaining simulation functions  
    SELECT COUNT(*) INTO sim_function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name LIKE '%simulation%';
    
    -- Report results
    RAISE NOTICE 'Cleanup complete: % simulation tables remaining, % simulation functions remaining', 
                 sim_table_count, sim_function_count;
    
    IF sim_table_count > 0 OR sim_function_count > 0 THEN
        RAISE WARNING 'Some simulation objects may still exist. Manual cleanup may be required.';
    END IF;
END $$;

-- Comment for migration tracking
COMMENT ON SCHEMA public IS 'Old simulation system cleaned up - ready for new implementation';