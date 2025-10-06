-- ============================================================================
-- FIX: Delete Simulation Function
-- ============================================================================
-- Issue: Foreign key constraints prevent tenant deletion when patient data exists
-- Solution: Delete all patient data from the 14 patient tables before deleting tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_simulation(
  p_simulation_id uuid,
  p_archive_to_history boolean DEFAULT true
)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_result json;
BEGIN
  -- Get tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Archive to history if requested
  IF p_archive_to_history THEN
    PERFORM complete_simulation(p_simulation_id);
  END IF;
  
  -- Delete all patient data from simulation tenant
  -- Order matters: delete dependent data first, then parent data
  
  -- 1. Delete records that depend on patients (9 tables with tenant_id)
  DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  
  -- 2. Delete records that reference patients (5 tables without tenant_id)
  -- Need to delete by patient_id from patients in this tenant
  DELETE FROM patient_admission_records 
  WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  DELETE FROM patient_advanced_directives 
  WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  DELETE FROM bowel_records 
  WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  DELETE FROM patient_wounds 
  WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  DELETE FROM handover_notes 
  WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  -- 3. Delete patients (parent table)
  DELETE FROM patients WHERE tenant_id = v_tenant_id;
  
  -- 4. Delete simulation activity log
  DELETE FROM simulation_activity_log WHERE simulation_id = p_simulation_id;
  
  -- 5. Delete simulation participants
  DELETE FROM simulation_participants WHERE simulation_id = p_simulation_id;
  
  -- 6. Delete simulation record
  DELETE FROM simulation_active WHERE id = p_simulation_id;
  
  -- 7. Finally, delete tenant (should have no more dependencies)
  DELETE FROM tenants WHERE id = v_tenant_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation and tenant deleted successfully'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting simulation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_simulation(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_simulation(uuid, boolean) TO anon;

-- Test query (optional - comment out or remove after testing)
-- SELECT delete_simulation('YOUR_SIMULATION_ID_HERE', false);
