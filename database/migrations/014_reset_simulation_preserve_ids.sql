-- ===========================================================================
-- UPDATE: Modify reset_simulation to preserve session IDs
-- ===========================================================================
-- Purpose: When resetting a simulation, use the same session's ID mappings
--          so pre-printed labels continue to work after reset
-- ===========================================================================

-- First, let's update reset_simulation to remember and reuse session IDs

DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE;

CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_session_number integer;
  v_id_mappings jsonb;
  v_simulation_config jsonb;
  v_result json;
BEGIN
  -- Get simulation details including which session was used
  SELECT 
    sa.tenant_id, 
    sa.template_id,
    t.simulation_config
  INTO 
    v_tenant_id, 
    v_template_id,
    v_simulation_config
  FROM simulation_active sa
  JOIN tenants t ON t.id = sa.tenant_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Extract session number from config (if it was launched with session IDs)
  v_session_number := (v_simulation_config->>'session_number')::integer;
  
  RAISE NOTICE 'Resetting simulation with session number: %', 
    COALESCE(v_session_number::text, 'NONE (will generate random IDs)');
  
  -- Get template snapshot and ID mappings for this session
  IF v_session_number IS NOT NULL THEN
    SELECT 
      st.snapshot_data,
      (st.simulation_id_sets->(v_session_number - 1))->'id_mappings'
    INTO 
      v_snapshot,
      v_id_mappings
    FROM simulation_templates st
    WHERE st.id = v_template_id;
    
    IF v_id_mappings IS NULL THEN
      RAISE WARNING 'Session % ID mappings not found, will generate random IDs', v_session_number;
    END IF;
  ELSE
    -- No session number, just get snapshot
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_templates
    WHERE id = v_template_id;
    
    v_id_mappings := NULL;
  END IF;
  
  -- Delete all existing data in simulation tenant (all patient-related tables)
  DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  
  -- Delete from tables without tenant_id (use patient_id join)
  DELETE FROM patient_admission_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_advanced_directives WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM bowel_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_wounds WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM handover_notes WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  -- Delete patients last
  DELETE FROM patients WHERE tenant_id = v_tenant_id;
  
  -- Restore snapshot WITH THE SAME ID MAPPINGS (preserves barcode labels!)
  PERFORM restore_snapshot_to_tenant(v_tenant_id, v_snapshot, v_id_mappings);
  
  -- Reset simulation timestamps but keep status
  UPDATE simulation_active
  SET 
    starts_at = now(),
    updated_at = now()
  WHERE id = p_simulation_id;
  
  -- Log the reset
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    action_type,
    action_details,
    notes
  )
  VALUES (
    p_simulation_id,
    auth.uid(),
    'simulation_reset',
    jsonb_build_object(
      'session_number', v_session_number,
      'reused_ids', v_id_mappings IS NOT NULL
    ),
    CASE 
      WHEN v_id_mappings IS NOT NULL THEN 
        'Simulation reset with preserved Session ' || v_session_number || ' IDs (labels remain valid)'
      ELSE 
        'Simulation reset with random IDs (no session specified)'
    END
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation reset successfully',
    'session_number', v_session_number,
    'ids_preserved', v_id_mappings IS NOT NULL
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO authenticated;

-- ===========================================================================
-- VERIFICATION QUERY
-- ===========================================================================

/*

-- After running this update, test the reset:

1. Launch a simulation with session IDs:
   SELECT launch_simulation(
     'template-id'::uuid,
     'Test Session',
     60,
     ARRAY['user-id'::uuid],
     ARRAY['student'],
     1  -- Session 1
   );

2. Note a patient ID:
   SELECT id, patient_id, first_name, last_name 
   FROM patients 
   WHERE tenant_id = (
     SELECT tenant_id FROM simulation_active WHERE name = 'Test Session'
   );

3. Reset the simulation:
   SELECT reset_simulation('simulation-id'::uuid);

4. Check patient IDs again:
   SELECT id, patient_id, first_name, last_name 
   FROM patients 
   WHERE tenant_id = (
     SELECT tenant_id FROM simulation_active WHERE name = 'Test Session'
   );

5. Verify the ID is EXACTLY THE SAME as step 2!
   → This means your printed labels will still work! ✅

*/

SELECT '✅ reset_simulation updated to preserve session IDs!' as status,
       '🏷️ Printed labels will remain valid after reset!' as benefit;
