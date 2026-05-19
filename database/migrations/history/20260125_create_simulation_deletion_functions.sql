-- ============================================================================
-- CREATE SIMULATION DELETION FUNCTIONS
-- ============================================================================
-- Purpose: Properly delete simulations and templates with tenant cleanup
-- ============================================================================

-- Drop existing functions with different return types
DROP FUNCTION IF EXISTS public.delete_simulation(uuid, boolean);
DROP FUNCTION IF EXISTS public.delete_simulation_template(uuid);
DROP FUNCTION IF EXISTS public.delete_simulation_history(uuid);

-- ============================================================================
-- 1. DELETE ACTIVE SIMULATION (with tenant cleanup)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_simulation(
  p_simulation_id uuid,
  p_archive_to_history boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_simulation_tenant_id uuid;
  v_simulation_name text;
  v_template_id uuid;
  v_deleted_patients integer := 0;
  v_deleted_medications integer := 0;
BEGIN
  -- Get simulation details before deletion
  SELECT tenant_id, name, template_id
  INTO v_simulation_tenant_id, v_simulation_name, v_template_id
  FROM simulation_active
  WHERE id = p_simulation_id;

  IF v_simulation_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- Archive to history if requested (only if simulation actually started)
  IF p_archive_to_history THEN
    -- Check if simulation has started (starts_at is not null)
    IF EXISTS (
      SELECT 1 FROM simulation_active 
      WHERE id = p_simulation_id AND starts_at IS NOT NULL
    ) THEN
      -- Check if not already archived
      IF NOT EXISTS (SELECT 1 FROM simulation_history WHERE simulation_id = p_simulation_id) THEN
        INSERT INTO simulation_history (
          id, simulation_id, tenant_id, template_id, name, duration_minutes,
          started_at, ended_at, created_by, completed_at, status,
          primary_categories, sub_categories
        )
        SELECT 
          gen_random_uuid(), -- New history record ID
          id,                -- simulation_id reference
          tenant_id, 
          template_id, 
          name, 
          duration_minutes,
          COALESCE(starts_at, NOW()), -- Use starts_at or NOW() as fallback
          ends_at,           -- Can be NULL
          created_by, 
          NOW(),             -- completed_at
          status,
          primary_categories, 
          sub_categories
        FROM simulation_active
        WHERE id = p_simulation_id;
      END IF;
    ELSE
      RAISE NOTICE 'Simulation % has not started yet (starts_at is NULL) - skipping history archive', p_simulation_id;
    END IF;
  END IF;

  -- Count what we're about to delete
  SELECT COUNT(*) INTO v_deleted_patients
  FROM patients WHERE tenant_id = v_simulation_tenant_id;

  SELECT COUNT(*) INTO v_deleted_medications
  FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;

  -- Delete all tenant-related data to avoid foreign key conflicts
  -- Order matters: delete children before parents
  -- Use PERFORM with EXCEPTION handling to skip tables that don't exist
  
  BEGIN
    DELETE FROM patient_alerts WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
  END;
  
  BEGIN
    DELETE FROM patient_notes WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_vitals WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM wound_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM device_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_images WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM medication_administrations WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  -- Delete patients last (they're referenced by other tables)
  DELETE FROM patients WHERE tenant_id = v_simulation_tenant_id;
  
  -- Delete simulation participants
  DELETE FROM simulation_participants WHERE simulation_id = p_simulation_id;
  
  -- Delete tenant users
  DELETE FROM tenant_users WHERE tenant_id = v_simulation_tenant_id;

  -- Delete the simulation tenant
  DELETE FROM tenants WHERE id = v_simulation_tenant_id;

  -- Delete the simulation_active record
  DELETE FROM simulation_active WHERE id = p_simulation_id;

  RAISE NOTICE 'Deleted simulation % (%) with tenant % - removed % patients, % medications',
    p_simulation_id, v_simulation_name, v_simulation_tenant_id,
    v_deleted_patients, v_deleted_medications;

  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'simulation_name', v_simulation_name,
    'tenant_id', v_simulation_tenant_id,
    'archived', p_archive_to_history,
    'deleted_patients', v_deleted_patients,
    'deleted_medications', v_deleted_medications
  );
END;
$function$;

COMMENT ON FUNCTION public.delete_simulation IS 
'Deletes an active simulation and its associated tenant. 
Optionally archives to simulation_history before deletion.
Uses SECURITY DEFINER to bypass RLS for complete cleanup.';

-- ============================================================================
-- 2. DELETE SIMULATION TEMPLATE (with validation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_simulation_template(
  p_template_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_template_name text;
  v_active_simulations_count integer;
BEGIN
  -- Get template details
  SELECT name INTO v_template_name
  FROM simulation_templates
  WHERE id = p_template_id;

  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Check for active simulations using this template
  SELECT COUNT(*) INTO v_active_simulations_count
  FROM simulation_active
  WHERE template_id = p_template_id;

  IF v_active_simulations_count > 0 THEN
    RAISE WARNING 'Template % has % active simulations that will continue running',
      v_template_name, v_active_simulations_count;
  END IF;

  -- Delete the template
  DELETE FROM simulation_templates WHERE id = p_template_id;

  RAISE NOTICE 'Deleted template % (%), had % active simulations',
    p_template_id, v_template_name, v_active_simulations_count;

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'template_name', v_template_name,
    'active_simulations_warning', v_active_simulations_count > 0,
    'active_simulations_count', v_active_simulations_count
  );
END;
$function$;

COMMENT ON FUNCTION public.delete_simulation_template IS 
'Deletes a simulation template. Warns if active simulations are using it.
Active simulations will continue running but cannot be reset to this template.
Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- 3. DELETE SIMULATION HISTORY (permanent deletion)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_simulation_history(
  p_history_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_simulation_name text;
BEGIN
  -- Get history details
  SELECT name INTO v_simulation_name
  FROM simulation_history
  WHERE id = p_history_id;

  IF v_simulation_name IS NULL THEN
    RAISE EXCEPTION 'History record not found: %', p_history_id;
  END IF;

  -- Delete the history record
  DELETE FROM simulation_history WHERE id = p_history_id;

  RAISE NOTICE 'Deleted history record % (%)', p_history_id, v_simulation_name;

  RETURN jsonb_build_object(
    'success', true,
    'history_id', p_history_id,
    'simulation_name', v_simulation_name
  );
END;
$function$;

COMMENT ON FUNCTION public.delete_simulation_history IS 
'Permanently deletes a simulation history record and its debrief data.
Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.delete_simulation TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_simulation_template TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_simulation_history TO authenticated;
