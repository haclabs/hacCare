-- ===========================================================================
-- SIMULATION SYSTEM V2.0 - CLEANUP OLD TABLES
-- ===========================================================================
-- Purpose: Remove old simulation infrastructure before rebuilding
-- WARNING: This will delete all existing simulation data
-- Run this first before proceeding with new schema
-- ===========================================================================

-- Drop old simulation tables in reverse dependency order
-- Based on actual existing tables in the database

-- Assessment and medication administration tables
DROP TABLE IF EXISTS simulation_medication_administrations CASCADE;
DROP TABLE IF EXISTS simulation_assessments CASCADE;

-- Events and notes
DROP TABLE IF EXISTS simulation_events CASCADE;
DROP TABLE IF EXISTS simulation_notes_templates CASCADE;
DROP TABLE IF EXISTS simulation_patient_notes CASCADE;

-- Medications
DROP TABLE IF EXISTS simulation_patient_medications CASCADE;
DROP TABLE IF EXISTS simulation_medications_templates CASCADE;

-- Vitals
DROP TABLE IF EXISTS simulation_patient_vitals CASCADE;
DROP TABLE IF EXISTS simulation_vitals_templates CASCADE;

-- Patient related
DROP TABLE IF EXISTS simulation_patient_templates CASCADE;
DROP TABLE IF EXISTS simulation_patients CASCADE;
DROP TABLE IF EXISTS simulation_patient_data CASCADE;

-- Lobby and sessions
DROP TABLE IF EXISTS simulation_lobby CASCADE;
DROP TABLE IF EXISTS simulation_sessions CASCADE;
DROP TABLE IF EXISTS simulation_participants CASCADE;

-- Core templates and scenarios
DROP TABLE IF EXISTS scenario_templates CASCADE;
DROP TABLE IF EXISTS simulation_templates CASCADE;

-- User and tenant related
DROP TABLE IF EXISTS simulation_users CASCADE;
DROP TABLE IF EXISTS simulation_tenants CASCADE;
DROP TABLE IF EXISTS simulation_settings CASCADE;

-- Drop old functions (if any exist)
DROP FUNCTION IF EXISTS create_simulation_session CASCADE;
DROP FUNCTION IF EXISTS end_simulation_session CASCADE;
DROP FUNCTION IF EXISTS get_simulation_participants CASCADE;
DROP FUNCTION IF EXISTS create_simulation_tenant CASCADE;
DROP FUNCTION IF EXISTS delete_simulation_tenant CASCADE;
DROP FUNCTION IF EXISTS create_simulation_patient CASCADE;
DROP FUNCTION IF EXISTS create_scenario_template CASCADE;
DROP FUNCTION IF EXISTS launch_simulation CASCADE;

-- Drop old types
DROP TYPE IF EXISTS simulation_status CASCADE;
DROP TYPE IF EXISTS simulation_participant_role CASCADE;
DROP TYPE IF EXISTS simulation_type CASCADE;
DROP TYPE IF EXISTS scenario_status CASCADE;

-- Drop old policies (these may have custom names, adjust as needed)
-- Note: RLS policies are automatically dropped when tables are dropped

-- Cleanup complete
-- Next step: Run 002_create_new_simulation_schema.sql
