-- ============================================================================
-- COMPARE SIMULATION vs TEMPLATE PATIENT LISTS
-- ============================================================================
-- Determines if template patient list changed
-- Used to warn instructor about barcode implications
-- ============================================================================

CREATE OR REPLACE FUNCTION compare_simulation_template_patients(
  p_simulation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sim_tenant_id UUID;
  v_template_id UUID;
  v_template_snapshot JSONB;
  v_sim_patients JSONB := '[]'::jsonb;
  v_template_patients JSONB;
  v_sim_patient_rec RECORD;
  v_template_patient_rec RECORD;
  v_sim_patient_elem JSONB;
  v_template_patient_elem JSONB;
  v_added JSONB := '[]'::jsonb;
  v_removed JSONB := '[]'::jsonb;
  v_unchanged JSONB := '[]'::jsonb;
  v_matched BOOLEAN;
  v_sim_count INT;
  v_template_count INT;
  v_sim_first TEXT;
  v_sim_last TEXT;
  v_sim_dob TEXT;
  v_template_first TEXT;
  v_template_last TEXT;
  v_template_dob TEXT;
BEGIN
  -- Get simulation and template info
  SELECT sa.tenant_id, sa.template_id, st.snapshot_data
  INTO v_sim_tenant_id, v_template_id, v_template_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  -- Get simulation's current patients
  FOR v_sim_patient_rec IN 
    SELECT first_name, last_name, date_of_birth
    FROM patients
    WHERE tenant_id = v_sim_tenant_id
    ORDER BY created_at
  LOOP
    v_sim_patients := v_sim_patients || jsonb_build_object(
      'first_name', v_sim_patient_rec.first_name,
      'last_name', v_sim_patient_rec.last_name,
      'dob', v_sim_patient_rec.date_of_birth
    );
  END LOOP;
  
  -- Get template's patients from snapshot
  v_template_patients := COALESCE(v_template_snapshot->'patients', '[]'::jsonb);
  
  v_sim_count := jsonb_array_length(v_sim_patients);
  v_template_count := jsonb_array_length(v_template_patients);
  
  RAISE NOTICE 'Comparing % sim patients vs % template patients', v_sim_count, v_template_count;
  
  -- Find unchanged and removed patients (sim patients not in template)
  FOR i IN 0..(v_sim_count - 1) LOOP
    v_sim_patient_elem := v_sim_patients->i;
    v_sim_first := v_sim_patient_elem->>'first_name';
    v_sim_last := v_sim_patient_elem->>'last_name';
    v_sim_dob := v_sim_patient_elem->>'dob';
    v_matched := false;
    
    -- Check if this sim patient exists in template
    FOR j IN 0..(v_template_count - 1) LOOP
      v_template_patient_elem := v_template_patients->j;
      v_template_first := v_template_patient_elem->>'first_name';
      v_template_last := v_template_patient_elem->>'last_name';
      v_template_dob := v_template_patient_elem->>'date_of_birth';
      
      IF v_sim_first = v_template_first
         AND v_sim_last = v_template_last
         AND v_sim_dob = v_template_dob
      THEN
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF v_matched THEN
      v_unchanged := v_unchanged || v_sim_patient_elem;
    ELSE
      v_removed := v_removed || v_sim_patient_elem;
    END IF;
  END LOOP;
  
  -- Find added patients (template patients not in sim)
  FOR i IN 0..(v_template_count - 1) LOOP
    v_template_patient_elem := v_template_patients->i;
    v_template_first := v_template_patient_elem->>'first_name';
    v_template_last := v_template_patient_elem->>'last_name';
    v_template_dob := v_template_patient_elem->>'date_of_birth';
    v_matched := false;
    
    FOR j IN 0..(v_sim_count - 1) LOOP
      v_sim_patient_elem := v_sim_patients->j;
      v_sim_first := v_sim_patient_elem->>'first_name';
      v_sim_last := v_sim_patient_elem->>'last_name';
      v_sim_dob := v_sim_patient_elem->>'dob';
      
      IF v_template_first = v_sim_first
         AND v_template_last = v_sim_last
         AND v_template_dob = v_sim_dob
      THEN
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF NOT v_matched THEN
      v_added := v_added || v_template_patient_elem;
    END IF;
  END LOOP;
  
  -- Return comparison result
  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'simulation_patient_count', v_sim_count,
    'template_patient_count', v_template_count,
    'patients_unchanged', v_unchanged,
    'patients_added', v_added,
    'patients_removed', v_removed,
    'patient_list_identical', (jsonb_array_length(v_added) = 0 AND jsonb_array_length(v_removed) = 0),
    'barcodes_can_preserve', (jsonb_array_length(v_added) = 0 AND jsonb_array_length(v_removed) = 0),
    'requires_relaunch', (jsonb_array_length(v_added) > 0 OR jsonb_array_length(v_removed) > 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION compare_simulation_template_patients TO authenticated;

COMMENT ON FUNCTION compare_simulation_template_patients IS 'Compares simulation vs template patient lists to determine if barcodes can be preserved during sync';
