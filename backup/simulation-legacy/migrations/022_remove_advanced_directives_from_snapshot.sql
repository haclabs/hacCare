-- =====================================================
-- FIX: Remove non-existent advanced_directives from snapshot
-- =====================================================
-- ERROR: relation "advanced_directives" does not exist
-- When calling save_template_snapshot
-- 
-- SOLUTION: Remove advanced_directives from snapshot query
-- (table doesn't exist in schema)
-- =====================================================

CREATE OR REPLACE FUNCTION save_template_snapshot(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb;
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  -- Get template tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  RAISE NOTICE '📸 Creating snapshot for template % (tenant %)', p_template_id, v_tenant_id;
  
  -- Build snapshot of ALL data in template tenant
  v_snapshot := jsonb_build_object(
    -- Core patient data
    'patients', (
      SELECT COALESCE(json_agg(row_to_json(p.*)), '[]'::json)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Medications
    'patient_medications', (
      SELECT COALESCE(json_agg(row_to_json(pm.*)), '[]'::json)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Vitals
    'patient_vitals', (
      SELECT COALESCE(json_agg(row_to_json(pv.*)), '[]'::json)
      FROM patient_vitals pv
      JOIN patients p ON p.id = pv.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Notes
    'patient_notes', (
      SELECT COALESCE(json_agg(row_to_json(pn.*)), '[]'::json)
      FROM patient_notes pn
      JOIN patients p ON p.id = pn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Alerts
    'patient_alerts', (
      SELECT COALESCE(json_agg(row_to_json(pa.*)), '[]'::json)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    
    -- ❌ REMOVED: advanced_directives (table doesn't exist)
    
    -- Admission Records
    'admission_records', (
      SELECT COALESCE(json_agg(row_to_json(ar.*)), '[]'::json)
      FROM admission_records ar
      JOIN patients p ON p.id = ar.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Diabetic Records
    'diabetic_records', (
      SELECT COALESCE(json_agg(row_to_json(dr.*)), '[]'::json)
      FROM diabetic_records dr
      JOIN patients p ON p.id = dr.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Wound Care
    'wound_care_assessments', (
      SELECT COALESCE(json_agg(row_to_json(wca.*)), '[]'::json)
      FROM wound_care_assessments wca
      JOIN patients p ON p.id = wca.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- BCMA Records
    'bcma_records', (
      SELECT COALESCE(json_agg(row_to_json(bcma.*)), '[]'::json)
      FROM bcma_records bcma
      WHERE bcma.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Doctors Orders
    'doctors_orders', (
      SELECT COALESCE(json_agg(row_to_json(dord.*)), '[]'::json)
      FROM doctors_orders dord
      JOIN patients p ON p.id = dord.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Lab Panels
    'lab_panels', (
      SELECT COALESCE(json_agg(row_to_json(lp.*)), '[]'::json)
      FROM lab_panels lp
      JOIN patients p ON p.id = lp.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Lab Results
    'lab_results', (
      SELECT COALESCE(json_agg(row_to_json(lr.*)), '[]'::json)
      FROM lab_results lr
      JOIN lab_panels lp ON lp.id = lr.panel_id
      JOIN patients p ON p.id = lp.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Bowel Records
    'patient_bowel_records', (
      SELECT COALESCE(json_agg(row_to_json(pbr.*)), '[]'::json)
      FROM patient_bowel_records pbr
      JOIN patients p ON p.id = pbr.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Patient Images
    'patient_images', (
      SELECT COALESCE(json_agg(row_to_json(pi.*)), '[]'::json)
      FROM patient_images pi
      JOIN patients p ON p.id = pi.patient_id
      WHERE p.tenant_id = v_tenant_id
    )
  );
  
  RAISE NOTICE '📦 Snapshot contains % patients', jsonb_array_length(v_snapshot->'patients');
  
  -- Update template with snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_created_at = NOW(),
    snapshot_created_by = v_user_id,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  -- Return success result
  v_result := json_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_size', pg_column_size(v_snapshot),
    'patient_count', jsonb_array_length(v_snapshot->'patients'),
    'snapshot_created_at', NOW()
  );
  
  RAISE NOTICE '✅ Snapshot saved successfully';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_template_snapshot IS 
'Saves a complete snapshot of all clinical data for a simulation template tenant. Captures 13 tables of patient data (removed advanced_directives).';

-- =====================================================
-- Also fix restore_snapshot_to_tenant
-- =====================================================
-- Remove advanced_directives restore attempt

-- Drop ALL existing function signatures using CASCADE
DO $$ 
BEGIN
  -- Drop all versions of the function
  EXECUTE (
    SELECT string_agg('DROP FUNCTION IF EXISTS ' || oid::regprocedure || ' CASCADE;', ' ')
    FROM pg_proc 
    WHERE proname = 'restore_snapshot_to_tenant'
  );
END $$;

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_tenant_id uuid,
  p_snapshot jsonb
)
RETURNS json AS $$
DECLARE
  v_record jsonb;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_panel_mapping jsonb := '{}'::jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_panel_id uuid;
  v_new_panel_id uuid;
  v_result json;
  v_counts jsonb := '{}'::jsonb;
BEGIN
  RAISE NOTICE '🔄 Starting snapshot restore to tenant %', p_tenant_id;
  
  -- =====================================================
  -- STEP 1: Restore patients FIRST (others depend on this)
  -- =====================================================
  IF p_snapshot ? 'patients' AND jsonb_array_length(p_snapshot->'patients') > 0 THEN
    RAISE NOTICE '👤 Restoring % patients...', jsonb_array_length(p_snapshot->'patients');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      v_new_patient_id := gen_random_uuid();
      
      INSERT INTO patients (
        id,
        tenant_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        admission_date,
        room_number,
        diagnosis,
        allergies,
        code_status,
        isolation_precautions,
        diet,
        activity_level,
        fall_risk,
        is_active
      )
      VALUES (
        v_new_patient_id,
        p_tenant_id,
        v_record->>'first_name',
        v_record->>'last_name',
        (v_record->>'date_of_birth')::date,
        v_record->>'gender',
        COALESCE((v_record->>'admission_date')::timestamptz, now()),
        v_record->>'room_number',
        v_record->>'diagnosis',
        v_record->>'allergies',
        COALESCE(v_record->>'code_status', 'Full Code'),
        v_record->>'isolation_precautions',
        v_record->>'diet',
        v_record->>'activity_level',
        COALESCE((v_record->>'fall_risk')::boolean, false),
        COALESCE((v_record->>'is_active')::boolean, true)
      );
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('patients', jsonb_array_length(p_snapshot->'patients'));
    RAISE NOTICE '✅ Restored % patients', jsonb_array_length(p_snapshot->'patients');
  END IF;

  -- =====================================================
  -- STEP 2: Restore medications
  -- =====================================================
  IF p_snapshot ? 'patient_medications' AND jsonb_array_length(p_snapshot->'patient_medications') > 0 THEN
    RAISE NOTICE '💊 Restoring % medications...', jsonb_array_length(p_snapshot->'patient_medications');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      INSERT INTO patient_medications (
        patient_id,
        tenant_id,
        name,
        generic_name,
        dosage,
        route,
        frequency,
        instructions,
        prescribed_by,
        prescribed_date,
        start_date,
        end_date,
        status
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        v_record->>'name',
        v_record->>'generic_name',
        v_record->>'dosage',
        v_record->>'route',
        v_record->>'frequency',
        v_record->>'instructions',
        v_record->>'prescribed_by',
        COALESCE((v_record->>'prescribed_date')::timestamptz, now()),
        COALESCE((v_record->>'start_date')::timestamptz, now()),
        (v_record->>'end_date')::timestamptz,
        COALESCE(v_record->>'status', 'active')
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('medications', jsonb_array_length(p_snapshot->'patient_medications'));
    RAISE NOTICE '✅ Restored % medications', jsonb_array_length(p_snapshot->'patient_medications');
  END IF;

  -- =====================================================
  -- STEP 3: Restore vitals
  -- =====================================================
  IF p_snapshot ? 'patient_vitals' AND jsonb_array_length(p_snapshot->'patient_vitals') > 0 THEN
    RAISE NOTICE '📊 Restoring % vitals...', jsonb_array_length(p_snapshot->'patient_vitals');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_vitals')
    LOOP
      INSERT INTO patient_vitals (
        patient_id,
        temperature,
        heart_rate,
        respiratory_rate,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        oxygen_saturation,
        pain_level,
        recorded_at,
        recorded_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'temperature')::numeric,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'oxygen_saturation')::integer,
        (v_record->>'pain_level')::integer,
        COALESCE((v_record->>'recorded_at')::timestamptz, now()),
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('vitals', jsonb_array_length(p_snapshot->'patient_vitals'));
    RAISE NOTICE '✅ Restored % vitals', jsonb_array_length(p_snapshot->'patient_vitals');
  END IF;

  -- =====================================================
  -- STEP 4: Restore notes
  -- =====================================================
  IF p_snapshot ? 'patient_notes' AND jsonb_array_length(p_snapshot->'patient_notes') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_notes')
    LOOP
      INSERT INTO patient_notes (
        patient_id,
        note_type,
        content,
        created_by,
        created_at
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'note_type',
        v_record->>'content',
        (v_record->>'created_by')::uuid,
        COALESCE((v_record->>'created_at')::timestamptz, now())
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('notes', jsonb_array_length(p_snapshot->'patient_notes'));
  END IF;

  -- =====================================================
  -- STEP 5: Restore alerts
  -- =====================================================
  IF p_snapshot ? 'patient_alerts' AND jsonb_array_length(p_snapshot->'patient_alerts') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_alerts')
    LOOP
      INSERT INTO patient_alerts (
        tenant_id,
        alert_type,
        severity,
        message,
        details
      )
      VALUES (
        p_tenant_id,
        v_record->>'alert_type',
        v_record->>'severity',
        v_record->>'message',
        (v_record->'details')::jsonb
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('alerts', jsonb_array_length(p_snapshot->'patient_alerts'));
  END IF;

  -- ❌ REMOVED: Advanced Directives restore (table doesn't exist)

  -- =====================================================
  -- STEP 6: Restore admission records
  -- =====================================================
  IF p_snapshot ? 'admission_records' AND jsonb_array_length(p_snapshot->'admission_records') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'admission_records')
    LOOP
      INSERT INTO admission_records (
        patient_id,
        admission_date,
        admission_type,
        referring_physician,
        attending_physician,
        chief_complaint,
        admitting_diagnosis
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'admission_date')::timestamptz,
        v_record->>'admission_type',
        v_record->>'referring_physician',
        v_record->>'attending_physician',
        v_record->>'chief_complaint',
        v_record->>'admitting_diagnosis'
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('admissions', jsonb_array_length(p_snapshot->'admission_records'));
  END IF;

  -- =====================================================
  -- STEP 7: Restore diabetic records
  -- =====================================================
  IF p_snapshot ? 'diabetic_records' AND jsonb_array_length(p_snapshot->'diabetic_records') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'diabetic_records')
    LOOP
      INSERT INTO diabetic_records (
        patient_id,
        blood_glucose,
        insulin_dose,
        carbs_consumed,
        recorded_at,
        recorded_by,
        notes
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'blood_glucose')::numeric,
        (v_record->>'insulin_dose')::numeric,
        (v_record->>'carbs_consumed')::integer,
        (v_record->>'recorded_at')::timestamptz,
        (v_record->>'recorded_by')::uuid,
        v_record->>'notes'
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('diabetic_records', jsonb_array_length(p_snapshot->'diabetic_records'));
  END IF;

  -- =====================================================
  -- STEP 8: Restore wound care
  -- =====================================================
  IF p_snapshot ? 'wound_care_assessments' AND jsonb_array_length(p_snapshot->'wound_care_assessments') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_care_assessments')
    LOOP
      INSERT INTO wound_care_assessments (
        patient_id,
        wound_location,
        wound_type,
        length_cm,
        width_cm,
        depth_cm,
        drainage_type,
        drainage_amount,
        treatment,
        assessed_at,
        assessed_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'wound_location',
        v_record->>'wound_type',
        (v_record->>'length_cm')::numeric,
        (v_record->>'width_cm')::numeric,
        (v_record->>'depth_cm')::numeric,
        v_record->>'drainage_type',
        v_record->>'drainage_amount',
        v_record->>'treatment',
        (v_record->>'assessed_at')::timestamptz,
        (v_record->>'assessed_by')::uuid
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('wound_care', jsonb_array_length(p_snapshot->'wound_care_assessments'));
  END IF;

  -- =====================================================
  -- STEP 9: Restore BCMA records
  -- =====================================================
  IF p_snapshot ? 'bcma_records' AND jsonb_array_length(p_snapshot->'bcma_records') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'bcma_records')
    LOOP
      INSERT INTO bcma_records (
        tenant_id,
        patient_id,
        medication_id,
        administered_at,
        administered_by,
        dose_given,
        route,
        site,
        notes
      )
      VALUES (
        p_tenant_id,
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'medication_id')::uuid,
        (v_record->>'administered_at')::timestamptz,
        (v_record->>'administered_by')::uuid,
        v_record->>'dose_given',
        v_record->>'route',
        v_record->>'site',
        v_record->>'notes'
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('bcma_records', jsonb_array_length(p_snapshot->'bcma_records'));
  END IF;

  -- =====================================================
  -- STEP 10: Restore doctors orders
  -- =====================================================
  IF p_snapshot ? 'doctors_orders' AND jsonb_array_length(p_snapshot->'doctors_orders') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'doctors_orders')
    LOOP
      INSERT INTO doctors_orders (
        patient_id,
        order_type,
        order_details,
        ordered_by,
        ordered_at,
        status
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'order_type',
        v_record->>'order_details',
        v_record->>'ordered_by',
        (v_record->>'ordered_at')::timestamptz,
        COALESCE(v_record->>'status', 'active')
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('doctors_orders', jsonb_array_length(p_snapshot->'doctors_orders'));
  END IF;

  -- =====================================================
  -- STEP 11: Restore lab panels (needed before lab results)
  -- =====================================================
  IF p_snapshot ? 'lab_panels' AND jsonb_array_length(p_snapshot->'lab_panels') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'lab_panels')
    LOOP
      v_old_panel_id := (v_record->>'id')::uuid;
      v_new_panel_id := gen_random_uuid();
      
      INSERT INTO lab_panels (
        id,
        patient_id,
        panel_name,
        ordered_by,
        ordered_at,
        status
      )
      VALUES (
        v_new_panel_id,
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'panel_name',
        v_record->>'ordered_by',
        (v_record->>'ordered_at')::timestamptz,
        COALESCE(v_record->>'status', 'pending')
      );
      
      v_panel_mapping := v_panel_mapping || jsonb_build_object(v_old_panel_id::text, v_new_panel_id);
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('lab_panels', jsonb_array_length(p_snapshot->'lab_panels'));
  END IF;

  -- =====================================================
  -- STEP 12: Restore lab results (references lab_panels)
  -- =====================================================
  IF p_snapshot ? 'lab_results' AND jsonb_array_length(p_snapshot->'lab_results') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'lab_results')
    LOOP
      INSERT INTO lab_results (
        panel_id,
        test_name,
        result_value,
        unit,
        reference_range,
        is_abnormal,
        resulted_at
      )
      VALUES (
        (v_panel_mapping->(v_record->>'panel_id'))::uuid,
        v_record->>'test_name',
        v_record->>'result_value',
        v_record->>'unit',
        v_record->>'reference_range',
        COALESCE((v_record->>'is_abnormal')::boolean, false),
        (v_record->>'resulted_at')::timestamptz
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('lab_results', jsonb_array_length(p_snapshot->'lab_results'));
  END IF;

  -- =====================================================
  -- STEP 13: Restore bowel records
  -- =====================================================
  IF p_snapshot ? 'patient_bowel_records' AND jsonb_array_length(p_snapshot->'patient_bowel_records') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_bowel_records')
    LOOP
      INSERT INTO patient_bowel_records (
        patient_id,
        bowel_movement_date,
        bristol_stool_scale,
        amount,
        color,
        consistency,
        notes,
        recorded_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'bowel_movement_date')::timestamptz,
        (v_record->>'bristol_stool_scale')::integer,
        v_record->>'amount',
        v_record->>'color',
        v_record->>'consistency',
        v_record->>'notes',
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('bowel_records', jsonb_array_length(p_snapshot->'patient_bowel_records'));
  END IF;

  -- =====================================================
  -- STEP 14: Restore patient images
  -- =====================================================
  IF p_snapshot ? 'patient_images' AND jsonb_array_length(p_snapshot->'patient_images') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_images')
    LOOP
      INSERT INTO patient_images (
        patient_id,
        image_url,
        image_type,
        description,
        uploaded_by,
        uploaded_at
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'image_url',
        v_record->>'image_type',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        (v_record->>'uploaded_at')::timestamptz
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('patient_images', jsonb_array_length(p_snapshot->'patient_images'));
  END IF;

  -- Return results
  v_result := json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'counts', v_counts
  );
  
  RAISE NOTICE '✅ Snapshot restore complete!';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_snapshot_to_tenant IS 
'Restores a complete snapshot of clinical data to a simulation tenant. Handles 13 tables with ID mapping (removed advanced_directives).';
