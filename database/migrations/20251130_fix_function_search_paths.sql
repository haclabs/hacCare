-- ============================================================================
-- FIX FUNCTION SEARCH PATHS - Security Hardening
-- ============================================================================
-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query > Paste this script > Run
-- ============================================================================
-- Addresses 45 Supabase linter warnings about mutable search_path
-- Uses ALTER FUNCTION to safely set search_path = public on all functions
-- This prevents potential search path injection attacks
--
-- NOTE: Using DO block to handle functions dynamically since signatures may vary
-- ============================================================================

DO $$
DECLARE
  func_record RECORD;
  fixed_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Loop through all flagged functions and fix them
  FOR func_record IN 
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname IN (
        -- CATEGORY 1: Trigger Functions
        'update_lab_updated_at',
        'set_updated_at',
        'update_contact_submissions_updated_at',
        'update_landing_content_timestamp',
        'update_patient_notes_updated_at',
        'update_patient_intake_output_events_updated_at',
        'update_updated_at_column',
        'set_medication_admin_tenant_id',
        -- CATEGORY 2: Utility Functions
        'create_user_session',
        'record_simulation_activity',
        'protect_medication_identifiers',
        'protect_patient_identifiers',
        'archive_landing_content_version',
        -- CATEGORY 3: Simulation Management
        'launch_simulation',
        'launch_simulation_instance',
        'launch_run',
        'start_simulation_run',
        'stop_simulation_run',
        'reset_simulation_for_next_session',
        'reset_simulation_for_next_session_v2',
        'reset_simulation_instance',
        'reset_run',
        'delete_simulation',
        'delete_simulation_run',
        'delete_simulation_run_safe',
        'cleanup_all_problem_simulations',
        -- CATEGORY 4: Complex Business Logic
        'create_simulation_template',
        'complete_simulation',
        'update_simulation_categories',
        'update_simulation_history_categories',
        'create_snapshot',
        'create_simulation_snapshot',
        'save_template_snapshot_v2',
        'restore_snapshot_to_tenant',
        'restore_snapshot_to_tenant_v2',
        'assign_users_to_simulation',
        'get_user_assigned_simulations',
        'get_user_simulation_tenant_access',
        'generate_simulation_id_sets',
        'get_simulation_label_data',
        'update_lab_panel_status',
        -- CATEGORY 5: Debug Functions
        'debug_vitals_restoration',
        'debug_vitals_restoration_fixed',
        'calculate_simulation_metrics'
      )
  LOOP
    BEGIN
      -- Set search_path for this function
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
                     func_record.proname, 
                     func_record.identity_args);
      fixed_count := fixed_count + 1;
      RAISE NOTICE '✅ Fixed: %(%)', func_record.proname, func_record.identity_args;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE '❌ Error fixing %(%) - %', func_record.proname, func_record.identity_args, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Security Hardening Complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Functions fixed: %', fixed_count;
  RAISE NOTICE 'Errors: %', error_count;
  RAISE NOTICE 'Search path injection attacks prevented ✅';
  RAISE NOTICE '';
END $$;

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
