-- ============================================================================
-- RESET SIMULATION WITH TEMPLATE UPDATES (Property-Based Medication Sync)
-- ============================================================================
-- Smart reset that syncs simulation with updated template
-- Preserves existing medication barcodes, adds NEW medications with NEW barcodes
-- 
-- KEY INSIGHT: Simulation launch creates NEW UUIDs for all data (can't compare by ID)
-- Solution: Match medications by properties (patient barcode + name + dosage + route)
-- New medications get NEW UUIDs = NEW barcodes (instructor prints labels for new ones only)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_simulation_with_template_updates(
  p_simulation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_restore_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_template_version INT;
  v_patient_comparison JSONB;
  v_template_meds JSONB;
  v_template_med JSONB;
  v_meds_added INT := 0;
  v_med_exists BOOLEAN;
  v_med_id UUID;
  v_med_record RECORD;
  v_template_med_count INT := 0;
  v_sim_med_count INT := 0;
  v_meds_removed INT := 0;
  i INT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_dob TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔄 Starting template sync reset for simulation: %', p_simulation_id;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  -- STEP 0: Check if patient lists match (CRITICAL VALIDATION)
  SELECT compare_simulation_template_patients(p_simulation_id) INTO v_patient_comparison;
  
  IF (v_patient_comparison->>'requires_relaunch')::boolean = true THEN
    RAISE EXCEPTION 'PATIENT_LIST_CHANGED: Cannot preserve barcodes - patient list changed.';
  END IF;
  
  RAISE NOTICE '✅ Patient lists match - barcodes can be preserved';
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data,
    st.snapshot_version
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_template_version
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  RAISE NOTICE '📋 Simulation Details:';
  RAISE NOTICE '  - Simulation ID: %', p_simulation_id;
  RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
  RAISE NOTICE '  - Template ID: %', v_template_id;
  RAISE NOTICE '  - Template Version: %', v_template_version;
  RAISE NOTICE '  - Snapshot medications: %', jsonb_array_length(v_snapshot->'patient_medications');

  -- Build mapping: template patient UUID → barcode
  -- Extract from snapshot's patients array
  FOR i IN 0..jsonb_array_length(v_snapshot->'patients') - 1 LOOP
    v_patient_id := ((v_snapshot->'patients')->i->>'id')::uuid;
    v_barcode := (v_snapshot->'patients')->i->>'patient_id';
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '🔗 Template patient % → Barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (keep meds & patients!)
  -- =====================================================
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  UPDATE patient_medications SET last_administered = NULL WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;

  -- =====================================================
  -- STEP 3: INSERT NEW MEDICATIONS (Property-based matching)
  -- =====================================================
  -- Since simulation launch creates NEW UUIDs, we can't compare by ID
  -- Instead: match by patient barcode + medication properties
  -- New meds get NEW UUIDs = NEW barcodes (print labels for these only)
  
  v_template_meds := v_snapshot->'patient_medications';
  IF v_template_meds IS NOT NULL THEN
    v_template_med_count := jsonb_array_length(v_template_meds);
    
    -- Count existing meds BEFORE sync
    SELECT COUNT(*) INTO v_sim_med_count FROM patient_medications WHERE tenant_id = v_tenant_id;
    
    RAISE NOTICE '📋 Template has % medications, simulation currently has %', v_template_med_count, v_sim_med_count;
    
    FOR i IN 0..jsonb_array_length(v_template_meds) - 1 LOOP
      v_template_med := v_template_meds->i;
      
      -- Get template patient demographics (not barcode - barcodes change!)
      SELECT 
        pat.value->>'first_name',
        pat.value->>'last_name',
        pat.value->>'date_of_birth'
      INTO v_first_name, v_last_name, v_dob
      FROM jsonb_array_elements(v_snapshot->'patients') AS pat
      WHERE (pat.value->>'id')::uuid = (v_template_med->>'patient_id')::uuid;
      
      IF v_first_name IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication % - patient UUID % not found in snapshot', 
          v_template_med->>'name', v_template_med->>'patient_id';
        CONTINUE;
      END IF;
      
      RAISE NOTICE '🔍 Medication: % (%s %s) for patient % % (DOB: %)', 
        v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route',
        v_first_name, v_last_name, v_dob;
      
      -- Find simulation patient by demographics (NOT barcode!)
      SELECT id, patient_id INTO v_patient_id, v_barcode
      FROM patients 
      WHERE tenant_id = v_tenant_id 
        AND first_name = v_first_name
        AND last_name = v_last_name
        AND date_of_birth = v_dob::date;
      
      IF v_patient_id IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication - patient % % (DOB: %) not found in simulation', 
          v_first_name, v_last_name, v_dob;
        CONTINUE;
      END IF;
      
      RAISE NOTICE '   → Mapped to simulation patient % (barcode: %)', v_patient_id, v_barcode;
      
      -- Check if medication exists by properties (name, dosage, route for this patient)
      SELECT EXISTS (
        SELECT 1 FROM patient_medications
        WHERE tenant_id = v_tenant_id 
          AND patient_id = v_patient_id
          AND name = v_template_med->>'name'
          AND dosage = v_template_med->>'dosage'
          AND route = v_template_med->>'route'
      ) INTO v_med_exists;
      
      IF NOT v_med_exists THEN
        RAISE NOTICE '➕ Adding new medication: % %mg %s for patient %', 
          v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route', v_barcode;
        
        BEGIN
          -- Insert with NEW UUID (generates NEW barcode automatically)
          INSERT INTO patient_medications (
            tenant_id, patient_id, name, dosage, route, frequency,
            admin_time, admin_times, category, start_date, end_date,
            next_due, prescribed_by, status, last_administered
          ) VALUES (
            v_tenant_id,
            v_patient_id,  -- Mapped to simulation patient
            v_template_med->>'name',
            v_template_med->>'dosage',
            v_template_med->>'route',
            v_template_med->>'frequency',
            v_template_med->>'admin_time',
            v_template_med->'admin_times',
            v_template_med->>'category',
            (v_template_med->>'start_date')::date,
            CASE WHEN v_template_med->>'end_date' IS NOT NULL 
                 THEN (v_template_med->>'end_date')::date 
                 ELSE NULL END,
            CASE WHEN v_template_med->>'next_due' IS NOT NULL 
                 THEN (v_template_med->>'next_due')::timestamptz 
                 ELSE NULL END,
            v_template_med->>'prescribed_by',
            COALESCE(v_template_med->>'status', 'active'),
            NULL
          );
          
          v_meds_added := v_meds_added + 1;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ ERROR inserting medication: % - Error: %', v_template_med->>'name', SQLERRM;
        END;
      ELSE
        RAISE NOTICE '⏭️ Already exists: % for patient %', v_template_med->>'name', v_barcode;
      END IF;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 MEDICATION SYNC: % new medications added', v_meds_added;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  END IF;

  -- =====================================================
  -- STEP 3B: DELETE REMOVED MEDICATIONS
  -- =====================================================
  -- Find sim medications that DON'T exist in template and delete them
  -- Preserves medication_administrations (student work history)
  
  RAISE NOTICE '🔍 Checking for medications removed from template...';
  
  FOR v_med_record IN 
    SELECT pm.id, pm.name, pm.dosage, pm.route, p.first_name, p.last_name, p.date_of_birth
    FROM patient_medications pm
    JOIN patients p ON p.id = pm.patient_id
    WHERE pm.tenant_id = v_tenant_id
  LOOP
    -- Check if this medication exists in template
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_snapshot->'patient_medications') AS med
      JOIN jsonb_array_elements(v_snapshot->'patients') AS pat 
        ON (pat.value->>'id')::uuid = (med.value->>'patient_id')::uuid
      WHERE med.value->>'name' = v_med_record.name
        AND med.value->>'dosage' = v_med_record.dosage
        AND med.value->>'route' = v_med_record.route
        AND pat.value->>'first_name' = v_med_record.first_name
        AND pat.value->>'last_name' = v_med_record.last_name
        AND (pat.value->>'date_of_birth')::date = v_med_record.date_of_birth
    ) THEN
      RAISE NOTICE '➖ Removing deleted medication: % % %s for patient % %', 
        v_med_record.name, v_med_record.dosage, v_med_record.route,
        v_med_record.first_name, v_med_record.last_name;
      
      DELETE FROM patient_medications WHERE id = v_med_record.id;
      v_meds_removed := v_meds_removed + 1;
    END IF;
  END LOOP;
  
  IF v_meds_removed > 0 THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REMOVED: % medications deleted from template', v_meds_removed;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '✅ No medications removed from template';
  END IF;

  -- =====================================================
  -- STEP 4: RESTORE OTHER DATA FROM TEMPLATE
  -- =====================================================
  
  -- Remove patient_medications from snapshot (we handled it above)
  v_snapshot := v_snapshot - 'patient_medications';
  
  -- Build barcode mapping for restore_snapshot_to_tenant (sim patient UUID → barcode)
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id FROM patients WHERE tenant_id = v_tenant_id ORDER BY created_at
  LOOP
    v_restore_barcodes := v_restore_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
  END LOOP;
  
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_restore_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;

  -- =====================================================
  -- STEP 5: UPDATE SIMULATION STATUS & LOG
  -- =====================================================
  
  UPDATE simulation_active SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    template_snapshot_version_synced = v_template_version,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  -- Only log if we have an authenticated user (skip during direct SQL testing)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO simulation_activity_log (
      simulation_id, user_id, action_type, action_details, notes
    ) VALUES (
      p_simulation_id, auth.uid(), 'synced_from_template',
      jsonb_build_object(
        'template_version', v_template_version,
        'meds_added', v_meds_added,
        'meds_removed', v_meds_removed
      ),
      format('Synced to template v%s: %s added, %s removed', 
        v_template_version, v_meds_added, v_meds_removed)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_version_synced', v_template_version,
    'medications_added', v_meds_added,
    'medications_removed', v_meds_removed,
    'template_medication_count', v_template_med_count,
    'simulation_medication_count_before', v_sim_med_count,
    'simulation_medication_count_after', v_sim_med_count + v_meds_added - v_meds_removed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reset_simulation_with_template_updates TO authenticated;

COMMENT ON FUNCTION reset_simulation_with_template_updates IS 'Smart template sync: Matches medications by properties (patient+name+dosage+route), not UUIDs. Inserts NEW medications with NEW UUIDs/barcodes. Instructor prints labels for newly added medications only. Existing medication barcodes unchanged.';
