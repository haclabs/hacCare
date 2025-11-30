-- ============================================================================
-- GET ACTUAL FUNCTION SIGNATURES
-- ============================================================================
-- Run this in Supabase SQL Editor to get the correct function signatures
-- This will help us fix the ALTER FUNCTION statements
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as signature,
  format('ALTER FUNCTION public.%I(%s) SET search_path = public;', 
         p.proname, 
         pg_get_function_identity_arguments(p.oid)) as alter_statement
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    -- Functions that were flagged by Supabase linter
    'update_lab_updated_at',
    'set_medication_admin_tenant_id',
    'set_updated_at',
    'update_contact_submissions_updated_at',
    'update_landing_content_timestamp',
    'archive_landing_content_version',
    'update_lab_panel_status',
    'reset_simulation_for_next_session',
    'get_user_simulation_tenant_access',
    'create_simulation_snapshot',
    'launch_simulation_instance',
    'update_patient_notes_updated_at',
    'save_template_snapshot_v2',
    'reset_simulation_for_next_session_v2',
    'restore_snapshot_to_tenant_v2',
    'reset_run',
    'launch_run',
    'update_patient_intake_output_events_updated_at',
    'launch_simulation',
    'create_simulation_template',
    'complete_simulation',
    'update_simulation_categories',
    'create_snapshot',
    'generate_simulation_id_sets',
    'get_simulation_label_data',
    'assign_users_to_simulation',
    'get_user_assigned_simulations',
    'update_simulation_history_categories',
    'start_simulation_run',
    'stop_simulation_run',
    'delete_simulation_run_safe',
    'cleanup_all_problem_simulations',
    'create_user_session',
    'delete_simulation_run',
    'record_simulation_activity',
    'protect_medication_identifiers',
    'protect_patient_identifiers',
    'reset_simulation_instance',
    'debug_vitals_restoration',
    'update_updated_at_column',
    'debug_vitals_restoration_fixed',
    'restore_snapshot_to_tenant',
    'delete_simulation',
    'calculate_simulation_metrics'
  )
ORDER BY p.proname;

-- ============================================================================
-- Copy the output "alter_statement" column and run those statements
-- ============================================================================
