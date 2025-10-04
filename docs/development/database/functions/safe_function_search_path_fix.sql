-- Safe Function Search Path Fix - Handles Overloaded Functions
-- This script automatically detects and fixes function signatures for all overloaded functions

DO $$
DECLARE
  func_record RECORD;
  functions_to_fix text[] := ARRAY[
    'get_available_tenants_for_transfer',
    'start_simulation',
    'cleanup_backup_audit_logs',
    'add_simulation_user',
    'current_user_is_super_admin',
    'authenticate_simulation_user',
    'cleanup_expired_simulations',
    'cleanup_old_sessions',
    'end_user_session',
    'create_simulation_subtenant',
    'create_user_session',
    'delete_simulation_users_for_tenant',
    'delete_patient_template',
    'delete_scenario_template',
    'delete_simulation_tenant_safe',
    'update_handover_notes_updated_at',
    'duplicate_patient_to_tenant',
    'get_backup_statistics',
    'get_super_admin_tenant_context',
    'get_user_tenant_id',
    'instantiate_simulation_patients',
    'join_simulation_lobby',
    'mark_expired_backups',
    'move_patient_to_tenant',
    'reset_simulation_to_template',
    'set_super_admin_tenant_context',
    'update_bowel_records_updated_at',
    'set_wound_assessment_tenant_id',
    'set_wound_treatment_tenant_id',
    'update_backup_metadata_updated_at',
    'update_updated_at_column',
    'user_has_patient_access'
  ];
  func_name text;
  fixed_count integer := 0;
BEGIN
  FOREACH func_name IN ARRAY functions_to_fix
  LOOP
    -- Handle each function (including overloaded versions)
    FOR func_record IN 
      SELECT 
        p.proname,
        pg_get_function_arguments(p.oid) as args,
        pg_get_function_identity_arguments(p.oid) as identity_args,
        p.oid
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func_name
    LOOP
      BEGIN
        -- Use the identity arguments (type signature) to uniquely identify the function
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
                       func_record.proname, 
                       func_record.identity_args);
        
        fixed_count := fixed_count + 1;
        RAISE NOTICE 'Fixed: %(%)', func_record.proname, func_record.args;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to fix %(%): %', func_record.proname, func_record.args, SQLERRM;
      END;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Successfully fixed search_path for % functions', fixed_count;
END $$;

-- Verification: Check how many functions now have search_path set
SELECT 
  'Functions with search_path now set' as status,
  COUNT(*) as functions_fixed
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proconfig IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config 
    WHERE config LIKE 'search_path=%'
  )
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

-- Show overloaded functions that were fixed
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN p.proconfig IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%'
  ) THEN 'FIXED' ELSE 'NOT FIXED' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('move_patient_to_tenant')
ORDER BY p.proname, pg_get_function_arguments(p.oid);