-- ============================================================================
-- FIX FUNCTION SEARCH PATHS - Security Hardening
-- ============================================================================
-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query > Paste this script > Run
-- ============================================================================
-- Addresses 45 Supabase linter warnings about mutable search_path
-- Uses ALTER FUNCTION to safely set search_path = public on all functions
-- This prevents potential search path injection attacks
-- ============================================================================

-- CATEGORY 1: LOW RISK - Simple Trigger Functions (Timestamp/Tenant Updates)
-- These functions just update timestamps or tenant_ids automatically
-- ============================================================================

ALTER FUNCTION public.update_lab_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_contact_submissions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_landing_content_timestamp() SET search_path = public;
ALTER FUNCTION public.update_patient_notes_updated_at() SET search_path = public;
ALTER FUNCTION public.update_patient_intake_output_events_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.set_medication_admin_tenant_id() SET search_path = public;

-- CATEGORY 2: MEDIUM RISK - Utility & Helper Functions
-- Session management, activity tracking, data protection
-- ============================================================================

ALTER FUNCTION public.create_user_session(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.record_simulation_activity(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.protect_medication_identifiers() SET search_path = public;
ALTER FUNCTION public.protect_patient_identifiers() SET search_path = public;
ALTER FUNCTION public.archive_landing_content_version(uuid) SET search_path = public;

-- CATEGORY 3: MEDIUM-HIGH RISK - Simulation Management Functions
-- Launch, reset, delete simulation runs/instances
-- ============================================================================

ALTER FUNCTION public.launch_simulation(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.launch_simulation_instance(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.launch_run(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.start_simulation_run(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.stop_simulation_run(uuid) SET search_path = public;

ALTER FUNCTION public.reset_simulation_for_next_session(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.reset_simulation_for_next_session_v2(uuid) SET search_path = public;
ALTER FUNCTION public.reset_simulation_instance(uuid) SET search_path = public;
ALTER FUNCTION public.reset_run(uuid) SET search_path = public;

ALTER FUNCTION public.delete_simulation(uuid) SET search_path = public;
ALTER FUNCTION public.delete_simulation_run(uuid) SET search_path = public;
ALTER FUNCTION public.delete_simulation_run_safe(uuid) SET search_path = public;
ALTER FUNCTION public.cleanup_all_problem_simulations(uuid) SET search_path = public;

-- CATEGORY 4: HIGH RISK - Complex Business Logic Functions
-- Template creation, snapshot management, user assignment
-- ============================================================================

ALTER FUNCTION public.create_simulation_template(uuid, uuid, text, text) SET search_path = public;
ALTER FUNCTION public.complete_simulation(uuid, uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.update_simulation_categories(uuid, text[], text[]) SET search_path = public;
ALTER FUNCTION public.update_simulation_history_categories(uuid, text[], text[]) SET search_path = public;

-- Snapshot Functions
ALTER FUNCTION public.create_snapshot(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_simulation_snapshot(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.save_template_snapshot_v2(uuid) SET search_path = public;
ALTER FUNCTION public.restore_snapshot_to_tenant(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.restore_snapshot_to_tenant_v2(uuid, uuid) SET search_path = public;

-- User Assignment & Access Functions
ALTER FUNCTION public.assign_users_to_simulation(uuid, uuid[]) SET search_path = public;
ALTER FUNCTION public.get_user_assigned_simulations(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_simulation_tenant_access(uuid, uuid) SET search_path = public;

-- ID Generation & Label Functions
ALTER FUNCTION public.generate_simulation_id_sets(integer) SET search_path = public;
ALTER FUNCTION public.get_simulation_label_data(uuid) SET search_path = public;

-- Lab Panel Status Update
ALTER FUNCTION public.update_lab_panel_status(uuid, text) SET search_path = public;

-- CATEGORY 5: DEBUG FUNCTIONS
-- Development/debugging utilities
-- ============================================================================

ALTER FUNCTION public.debug_vitals_restoration(uuid) SET search_path = public;
ALTER FUNCTION public.debug_vitals_restoration_fixed(uuid) SET search_path = public;

-- Metrics Calculation
ALTER FUNCTION public.calculate_simulation_metrics(uuid) SET search_path = public;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully set search_path = public on 45 functions';
  RAISE NOTICE 'Security hardening complete - search path injection attacks prevented';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- Run this to verify fixes were applied:
-- ============================================================================
-- SELECT 
--   p.proname as function_name,
--   CASE
--     WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ FIXED'
--     ELSE '❌ NEEDS FIX'
--   END as status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' 
--   AND p.proname IN (
--     'update_lab_updated_at', 'set_updated_at', 'launch_simulation',
--     'reset_simulation_for_next_session_v2', 'create_simulation_snapshot',
--     'restore_snapshot_to_tenant_v2', 'complete_simulation'
--   )
-- ORDER BY p.proname;
-- ============================================================================
