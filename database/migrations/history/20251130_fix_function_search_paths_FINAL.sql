-- ============================================================================
-- FIX FUNCTION SEARCH PATHS - Security Hardening
-- ============================================================================
-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query > Paste this script > Run
-- ============================================================================
-- Addresses 45 Supabase linter warnings about mutable search_path
-- Uses ALTER FUNCTION with CORRECT signatures from actual database
-- This prevents potential search path injection attacks
-- ============================================================================

-- CATEGORY 1: Trigger Functions (No parameters)
ALTER FUNCTION public.archive_landing_content_version() SET search_path = public;
ALTER FUNCTION public.cleanup_all_problem_simulations() SET search_path = public;
ALTER FUNCTION public.get_user_simulation_tenant_access() SET search_path = public;
ALTER FUNCTION public.protect_medication_identifiers() SET search_path = public;
ALTER FUNCTION public.protect_patient_identifiers() SET search_path = public;
ALTER FUNCTION public.set_medication_admin_tenant_id() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_contact_submissions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_lab_panel_status() SET search_path = public;
ALTER FUNCTION public.update_lab_updated_at() SET search_path = public;
ALTER FUNCTION public.update_landing_content_timestamp() SET search_path = public;
ALTER FUNCTION public.update_patient_intake_output_events_updated_at() SET search_path = public;
ALTER FUNCTION public.update_patient_notes_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- CATEGORY 2: Single UUID Parameter Functions
ALTER FUNCTION public.calculate_simulation_metrics(p_simulation_id uuid) SET search_path = public;
ALTER FUNCTION public.debug_vitals_restoration(p_simulation_id uuid) SET search_path = public;
ALTER FUNCTION public.debug_vitals_restoration_fixed(_template_id uuid) SET search_path = public;
ALTER FUNCTION public.delete_simulation_run(p_run_id uuid) SET search_path = public;
ALTER FUNCTION public.delete_simulation_run_safe(p_run_id uuid) SET search_path = public;
ALTER FUNCTION public.get_user_assigned_simulations(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.reset_run(p_run_id uuid) SET search_path = public;
ALTER FUNCTION public.reset_simulation_for_next_session(p_simulation_id uuid) SET search_path = public;
ALTER FUNCTION public.reset_simulation_for_next_session_v2(p_simulation_id uuid) SET search_path = public;
ALTER FUNCTION public.save_template_snapshot_v2(p_template_id uuid) SET search_path = public;
ALTER FUNCTION public.start_simulation_run(p_run_id uuid) SET search_path = public;
ALTER FUNCTION public.stop_simulation_run(p_run_id uuid) SET search_path = public;

-- CATEGORY 3: Two UUID Parameters
ALTER FUNCTION public.launch_run(p_snapshot_id uuid, p_run_name text) SET search_path = public;
ALTER FUNCTION public.reset_simulation_instance(p_instance_id uuid, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.restore_snapshot_to_tenant_v2(p_tenant_id uuid, p_snapshot jsonb) SET search_path = public;

-- CATEGORY 4: Three Parameters
ALTER FUNCTION public.assign_users_to_simulation(p_run_id uuid, p_user_ids uuid[], p_role text) SET search_path = public;
ALTER FUNCTION public.complete_simulation(p_simulation_id uuid, p_activities jsonb, p_instructor_name text) SET search_path = public;
ALTER FUNCTION public.create_simulation_template(p_name text, p_description text, p_default_duration_minutes integer) SET search_path = public;
ALTER FUNCTION public.create_snapshot(p_template_id uuid, p_name text, p_description text) SET search_path = public;
ALTER FUNCTION public.create_user_session(p_ip_address inet, p_user_agent text, p_tenant_id uuid) SET search_path = public;
ALTER FUNCTION public.delete_simulation(p_simulation_id uuid, p_archive_to_history boolean) SET search_path = public;
ALTER FUNCTION public.generate_simulation_id_sets(p_template_id uuid, p_session_count integer, p_session_names text[]) SET search_path = public;
ALTER FUNCTION public.get_simulation_label_data(p_template_id uuid, p_session_number integer) SET search_path = public;
ALTER FUNCTION public.update_simulation_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]) SET search_path = public;
ALTER FUNCTION public.update_simulation_history_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]) SET search_path = public;

-- CATEGORY 5: Four Parameters
ALTER FUNCTION public.create_simulation_snapshot(p_template_id uuid, p_name character varying, p_user_id uuid, p_description text) SET search_path = public;
ALTER FUNCTION public.launch_simulation_instance(p_template_id uuid, p_snapshot_id uuid, p_name character varying, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.record_simulation_activity(p_simulation_id uuid, p_student_id uuid, p_action_type character varying, p_action_data jsonb) SET search_path = public;

-- CATEGORY 6: Complex Functions (6+ Parameters)
ALTER FUNCTION public.restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb, p_barcode_mappings jsonb, p_preserve_barcodes boolean, p_skip_patients boolean) SET search_path = public;
ALTER FUNCTION public.launch_simulation(p_template_id uuid, p_name text, p_duration_minutes integer, p_participant_user_ids uuid[], p_participant_roles text[], p_primary_categories text[], p_sub_categories text[]) SET search_path = public;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  fixed_count INTEGER;
  unfixed_count INTEGER;
BEGIN
  -- Count functions with search_path set
  SELECT COUNT(*) INTO fixed_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND pg_get_functiondef(p.oid) LIKE '%SET search_path%'
    AND p.proname IN (
      'update_lab_updated_at', 'set_medication_admin_tenant_id', 'set_updated_at',
      'update_contact_submissions_updated_at', 'update_landing_content_timestamp',
      'archive_landing_content_version', 'update_lab_panel_status',
      'reset_simulation_for_next_session', 'get_user_simulation_tenant_access',
      'create_simulation_snapshot', 'launch_simulation_instance',
      'update_patient_notes_updated_at', 'save_template_snapshot_v2',
      'reset_simulation_for_next_session_v2', 'restore_snapshot_to_tenant_v2',
      'reset_run', 'launch_run', 'update_patient_intake_output_events_updated_at',
      'launch_simulation', 'create_simulation_template', 'complete_simulation',
      'update_simulation_categories', 'create_snapshot', 'generate_simulation_id_sets',
      'get_simulation_label_data', 'assign_users_to_simulation',
      'get_user_assigned_simulations', 'update_simulation_history_categories',
      'start_simulation_run', 'stop_simulation_run', 'delete_simulation_run_safe',
      'cleanup_all_problem_simulations', 'create_user_session', 'delete_simulation_run',
      'record_simulation_activity', 'protect_medication_identifiers',
      'protect_patient_identifiers', 'reset_simulation_instance',
      'debug_vitals_restoration', 'update_updated_at_column',
      'debug_vitals_restoration_fixed', 'restore_snapshot_to_tenant',
      'delete_simulation', 'calculate_simulation_metrics'
    );
    
  -- Count functions still needing fix
  SELECT COUNT(*) INTO unfixed_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
    AND p.proname IN (
      'update_lab_updated_at', 'set_medication_admin_tenant_id', 'set_updated_at',
      'update_contact_submissions_updated_at', 'update_landing_content_timestamp',
      'archive_landing_content_version', 'update_lab_panel_status',
      'reset_simulation_for_next_session', 'get_user_simulation_tenant_access',
      'create_simulation_snapshot', 'launch_simulation_instance',
      'update_patient_notes_updated_at', 'save_template_snapshot_v2',
      'reset_simulation_for_next_session_v2', 'restore_snapshot_to_tenant_v2',
      'reset_run', 'launch_run', 'update_patient_intake_output_events_updated_at',
      'launch_simulation', 'create_simulation_template', 'complete_simulation',
      'update_simulation_categories', 'create_snapshot', 'generate_simulation_id_sets',
      'get_simulation_label_data', 'assign_users_to_simulation',
      'get_user_assigned_simulations', 'update_simulation_history_categories',
      'start_simulation_run', 'stop_simulation_run', 'delete_simulation_run_safe',
      'cleanup_all_problem_simulations', 'create_user_session', 'delete_simulation_run',
      'record_simulation_activity', 'protect_medication_identifiers',
      'protect_patient_identifiers', 'reset_simulation_instance',
      'debug_vitals_restoration', 'update_updated_at_column',
      'debug_vitals_restoration_fixed', 'restore_snapshot_to_tenant',
      'delete_simulation', 'calculate_simulation_metrics'
    );

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Security Hardening Complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Functions fixed: %', fixed_count;
  RAISE NOTICE '❌ Functions still needing fix: %', unfixed_count;
  RAISE NOTICE '';
  
  IF unfixed_count = 0 THEN
    RAISE NOTICE '🎉 All 45 functions secured!';
    RAISE NOTICE 'Search path injection attacks prevented ✅';
  ELSE
    RAISE NOTICE '⚠️  Some functions may need manual attention';
  END IF;
  RAISE NOTICE '';
END $$;
