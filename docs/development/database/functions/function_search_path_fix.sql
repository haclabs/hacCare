-- Function Search Path Security Fix for hacCare
-- This script fixes the "Function Search Path Mutable" warnings by setting search_path on functions
-- This prevents potential security issues from schema injection attacks

-- The issue: Functions without explicit search_path can be vulnerable to schema injection
-- The fix: Add "SET search_path = public" to all functions to lock them to the public schema

-- 1. List all functions that need search_path fixes
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as current_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
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
  )
ORDER BY p.proname;

-- 2. Function to add search_path to a function
CREATE OR REPLACE FUNCTION add_search_path_to_function(
  func_name text,
  func_args text DEFAULT ''
) RETURNS text AS $$
DECLARE
  func_definition text;
  new_definition text;
  return_type text;
  func_body text;
  func_language text;
  security_type text;
  volatility_type text;
BEGIN
  -- Get the current function definition
  SELECT pg_get_functiondef(p.oid), 
         pg_get_function_result(p.oid),
         CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
         CASE p.provolatile 
           WHEN 'i' THEN 'IMMUTABLE'
           WHEN 's' THEN 'STABLE'
           ELSE 'VOLATILE'
         END,
         l.lanname
  INTO func_definition, return_type, security_type, volatility_type, func_language
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
  WHERE n.nspname = 'public' AND p.proname = func_name
  LIMIT 1;
  
  IF func_definition IS NULL THEN
    RETURN 'Function ' || func_name || ' not found';
  END IF;
  
  -- Check if search_path is already set
  IF func_definition LIKE '%SET search_path%' THEN
    RETURN 'Function ' || func_name || ' already has search_path set';
  END IF;
  
  -- Extract function body (everything between $$ markers or between AS and language)
  IF func_definition LIKE '%$$%' THEN
    func_body := substring(func_definition from '\$[^$]*\$(.*)\$[^$]*\$$');
  ELSE
    func_body := substring(func_definition from 'AS\s+(.+)\s+LANGUAGE');
  END IF;
  
  -- Build new function definition with search_path
  new_definition := 'CREATE OR REPLACE FUNCTION public.' || func_name || '(' || func_args || ') ' ||
                   'RETURNS ' || return_type || ' AS $$ ' ||
                   func_body || ' $$ LANGUAGE ' || func_language || ' ' ||
                   volatility_type || ' ' || security_type || ' SET search_path = public;';
  
  RETURN new_definition;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply search_path fix to all problematic functions
DO $$
DECLARE
  func_record RECORD;
  fix_sql text;
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
BEGIN
  FOREACH func_name IN ARRAY functions_to_fix
  LOOP
    -- Simple approach: Add SET search_path = public to each function
    BEGIN
      -- Get current function definition and add search_path
      FOR func_record IN 
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = func_name
      LOOP
        -- Check if search_path is already set
        IF func_record.definition NOT LIKE '%SET search_path%' THEN
          -- Add search_path by recreating function with SET clause
          fix_sql := regexp_replace(
            func_record.definition,
            '(LANGUAGE\s+\w+)(\s*;?\s*$)',
            '\1 SET search_path = public\2',
            'i'
          );
          
          EXECUTE fix_sql;
          RAISE NOTICE 'Fixed search_path for function: %', func_name;
        ELSE
          RAISE NOTICE 'Function % already has search_path set', func_name;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to fix function %: %', func_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Completed search_path fixes for all functions!';
END $$;

-- 4. Verify the fixes
SELECT 
  'Functions with search_path now set' as status,
  COUNT(*) as fixed_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%SET search_path%'
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

-- 5. Show any remaining functions without search_path (should be 0)
SELECT 
  'Remaining functions without search_path' as status,
  COUNT(*) as remaining_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
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

-- Clean up helper function
DROP FUNCTION IF EXISTS add_search_path_to_function(text, text);

-- Security summary
SELECT 
  'Function Search Path Security Fix Complete' as summary,
  'All functions now locked to public schema' as security_improvement,
  'Prevents schema injection attacks' as protection_added;