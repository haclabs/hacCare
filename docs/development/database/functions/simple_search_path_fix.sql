-- Simple Function Search Path Fix for hacCare
-- This script uses ALTER FUNCTION to set search_path on existing functions
-- Much safer than recreating functions

-- Fix all the functions identified by the Supabase linter
ALTER FUNCTION public.get_available_tenants_for_transfer SET search_path = public;
ALTER FUNCTION public.start_simulation SET search_path = public;
ALTER FUNCTION public.cleanup_backup_audit_logs SET search_path = public;
ALTER FUNCTION public.add_simulation_user SET search_path = public;
ALTER FUNCTION public.current_user_is_super_admin SET search_path = public;
ALTER FUNCTION public.authenticate_simulation_user SET search_path = public;
ALTER FUNCTION public.cleanup_expired_simulations SET search_path = public;
ALTER FUNCTION public.cleanup_old_sessions SET search_path = public;
ALTER FUNCTION public.end_user_session SET search_path = public;
ALTER FUNCTION public.create_simulation_subtenant SET search_path = public;
ALTER FUNCTION public.create_user_session SET search_path = public;
ALTER FUNCTION public.delete_simulation_users_for_tenant SET search_path = public;
ALTER FUNCTION public.delete_patient_template SET search_path = public;
ALTER FUNCTION public.delete_scenario_template SET search_path = public;
ALTER FUNCTION public.delete_simulation_tenant_safe SET search_path = public;
ALTER FUNCTION public.update_handover_notes_updated_at SET search_path = public;
ALTER FUNCTION public.duplicate_patient_to_tenant SET search_path = public;
ALTER FUNCTION public.get_backup_statistics SET search_path = public;
ALTER FUNCTION public.get_super_admin_tenant_context SET search_path = public;
ALTER FUNCTION public.get_user_tenant_id SET search_path = public;
ALTER FUNCTION public.instantiate_simulation_patients SET search_path = public;
ALTER FUNCTION public.join_simulation_lobby SET search_path = public;
ALTER FUNCTION public.mark_expired_backups SET search_path = public;
-- Handle overloaded move_patient_to_tenant functions - need to specify signatures
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Fix all versions of move_patient_to_tenant
  FOR func_record IN 
    SELECT 
      p.proname,
      pg_get_function_arguments(p.oid) as args,
      pg_get_function_identity_arguments(p.oid) as identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'move_patient_to_tenant'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
                   func_record.proname, 
                   func_record.identity_args);
    RAISE NOTICE 'Fixed search_path for: %(%)', func_record.proname, func_record.args;
  END LOOP;
END $$;
ALTER FUNCTION public.reset_simulation_to_template SET search_path = public;
ALTER FUNCTION public.set_super_admin_tenant_context SET search_path = public;
ALTER FUNCTION public.update_bowel_records_updated_at SET search_path = public;
ALTER FUNCTION public.set_wound_assessment_tenant_id SET search_path = public;
ALTER FUNCTION public.set_wound_treatment_tenant_id SET search_path = public;
ALTER FUNCTION public.update_backup_metadata_updated_at SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.user_has_patient_access SET search_path = public;

-- Verification: Check that all functions now have search_path set
SELECT 
  'Function search_path fixes applied' as status,
  COUNT(*) as functions_fixed
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_available_tenants_for_transfer', 'start_simulation', 'cleanup_backup_audit_logs',
    'add_simulation_user', 'current_user_is_super_admin', 'authenticate_simulation_user',
    'cleanup_expired_simulations', 'cleanup_old_sessions', 'end_user_session',
    'create_simulation_subtenant', 'create_user_session', 'delete_simulation_users_for_tenant',
    'delete_patient_template', 'delete_scenario_template', 'delete_simulation_tenant_safe',
    'update_handover_notes_updated_at', 'duplicate_patient_to_tenant', 'get_backup_statistics',
    'get_super_admin_tenant_context', 'get_user_tenant_id', 'instantiate_simulation_patients',
    'join_simulation_lobby', 'mark_expired_backups', 'move_patient_to_tenant',
    'reset_simulation_to_template', 'set_super_admin_tenant_context', 'update_bowel_records_updated_at',
    'set_wound_assessment_tenant_id', 'set_wound_treatment_tenant_id', 'update_backup_metadata_updated_at',
    'update_updated_at_column', 'user_has_patient_access'
  );

-- Show function settings to confirm search_path was set
SELECT 
  p.proname as function_name,
  p.proconfig as function_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'current_user_is_super_admin', 'get_user_tenant_id', 'user_has_patient_access'
  )
  AND p.proconfig IS NOT NULL
ORDER BY p.proname;