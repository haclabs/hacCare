-- Cleanup Script: Remove Old Simulation Tables and Functions
-- This script will clean up the existing broken simulation system

-- ===============================================
-- Drop Old Functions (if they exist)
-- ===============================================
DROP FUNCTION IF EXISTS create_simulation_snapshot(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS launch_simulation(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reset_simulation(UUID);
DROP FUNCTION IF EXISTS restore_snapshot_data(UUID, UUID);
DROP FUNCTION IF EXISTS update_simulation_state(UUID, JSONB);
DROP FUNCTION IF EXISTS end_simulation(UUID);

-- ===============================================
-- Drop Old Tables (in correct order due to dependencies)
-- ===============================================

-- Drop simulation instances and related tables first
DROP TABLE IF EXISTS simulation_instances CASCADE;
DROP TABLE IF EXISTS simulation_sessions CASCADE;
DROP TABLE IF EXISTS simulation_activities CASCADE;
DROP TABLE IF EXISTS simulation_logs CASCADE;

-- Drop snapshots
DROP TABLE IF EXISTS simulation_snapshots CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;

-- Drop templates
DROP TABLE IF EXISTS simulation_templates CASCADE;
DROP TABLE IF EXISTS simulation_template_patients CASCADE;

-- Drop any other simulation-related tables
DROP TABLE IF EXISTS simulation_vitals CASCADE;
DROP TABLE IF EXISTS simulation_medications CASCADE;
DROP TABLE IF EXISTS simulation_alerts CASCADE;
DROP TABLE IF EXISTS simulation_notes CASCADE;
DROP TABLE IF EXISTS simulation_handover_notes CASCADE;
DROP TABLE IF EXISTS simulation_wound_care CASCADE;

-- ===============================================
-- Drop Old Indexes (if they still exist)
-- ===============================================
DROP INDEX IF EXISTS idx_simulation_instances_template;
DROP INDEX IF EXISTS idx_simulation_instances_status;
DROP INDEX IF EXISTS idx_simulation_sessions_simulation;
DROP INDEX IF EXISTS idx_simulation_activities_simulation;
DROP INDEX IF EXISTS idx_simulation_snapshots_template;

-- ===============================================
-- Remove Old RLS Policies
-- ===============================================

-- This will remove any existing RLS policies for old simulation tables
-- Since we're dropping the tables anyway, this is just cleanup

-- ===============================================
-- Clean up any remaining simulation-related types
-- ===============================================
DROP TYPE IF EXISTS simulation_status CASCADE;
DROP TYPE IF EXISTS simulation_activity_type CASCADE;

-- ===============================================
-- Verification Query
-- ===============================================

-- Query to check if any simulation tables still exist
-- Run this after the cleanup to verify everything was removed
/*
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename LIKE '%simulation%' 
   OR tablename LIKE '%snapshot%'
ORDER BY tablename;
*/

-- Query to check if any simulation functions still exist
/*
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%simulation%' 
   OR p.proname LIKE '%snapshot%'
ORDER BY p.proname;
*/

COMMENT ON SCHEMA public IS 'Old simulation system has been cleaned up. Ready for new implementation.';