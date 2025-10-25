-- =====================================================
-- FIX: Update restore_snapshot_to_tenant to match ACTUAL patients table schema
-- =====================================================
-- ISSUE: Restore function tries to INSERT columns that don't exist in patients table
-- Error: column "code_status" does not exist, column "generic_name" does not exist
--
-- ACTUAL TABLE SCHEMAS (verified from database):
--
-- patients: id, patient_id, tenant_id, first_name, last_name, date_of_birth, 
--   gender, room_number, bed_number, admission_date, condition, diagnosis, 
--   allergies (text[]), blood_type, emergency_contact_name, 
--   emergency_contact_relationship, emergency_contact_phone, assigned_nurse
--
-- patient_medications: patient_id, tenant_id, name, dosage, frequency, route,
--   start_date, end_date, prescribed_by, admin_time, admin_times (jsonb),
--   last_administered, next_due, status, category
--
-- patient_vitals: patient_id, tenant_id, temperature, blood_pressure_systolic,
--   blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation,
--   oxygen_delivery, recorded_at
--
-- patient_notes: patient_id, tenant_id, note_type, content, priority, created_by
--
-- patient_alerts: id, tenant_id, patient_id, patient_name, alert_type, message,
--   priority, acknowledged, acknowledged_by, acknowledged_at, expires_at
--
-- SOLUTION: Update all INSERT statements to use actual column names
-- =====================================================

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
  -- ✅ FIXED: Use ACTUAL patients table columns
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
        patient_id,  -- ✅ Generate unique ID to avoid duplicates
        first_name,
        last_name,
        date_of_birth,
        gender,
        room_number,
        bed_number,
        admission_date,
        condition,
        diagnosis,
        allergies,
        blood_type,
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone,
        assigned_nurse
      )
      VALUES (
        v_new_patient_id,
        p_tenant_id,
        'P' || (10000 + floor(random() * 90000))::TEXT,  -- ✅ Generate unique 5-digit patient ID
        v_record->>'first_name',
        v_record->>'last_name',
        (v_record->>'date_of_birth')::date,
        v_record->>'gender',
        v_record->>'room_number',
        v_record->>'bed_number',
        COALESCE((v_record->>'admission_date')::timestamptz, now()),
        v_record->>'condition',
        v_record->>'diagnosis',
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_record->'allergies')), '{}'::text[]),  -- ✅ Convert JSONB array to text[]
        v_record->>'blood_type',
        v_record->>'emergency_contact_name',
        v_record->>'emergency_contact_relationship',
        v_record->>'emergency_contact_phone',
        v_record->>'assigned_nurse'
      );
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('patients', jsonb_array_length(p_snapshot->'patients'));
    RAISE NOTICE '✅ Restored % patients', jsonb_array_length(p_snapshot->'patients');
  END IF;

  -- =====================================================
  -- STEP 2: Restore medications
  -- ✅ FIXED: Use ACTUAL patient_medications columns
  -- =====================================================
  IF p_snapshot ? 'patient_medications' AND jsonb_array_length(p_snapshot->'patient_medications') > 0 THEN
    RAISE NOTICE '💊 Restoring % medications...', jsonb_array_length(p_snapshot->'patient_medications');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      INSERT INTO patient_medications (
        patient_id,
        tenant_id,
        name,
        dosage,
        frequency,
        route,
        start_date,
        end_date,
        prescribed_by,
        admin_time,
        admin_times,
        last_administered,
        next_due,
        status,
        category
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        v_record->>'name',
        v_record->>'dosage',
        v_record->>'frequency',
        v_record->>'route',
        COALESCE((v_record->>'start_date')::timestamptz, now()),
        (v_record->>'end_date')::timestamptz,
        v_record->>'prescribed_by',
        v_record->>'admin_time',
        (v_record->'admin_times')::jsonb,
        (v_record->>'last_administered')::timestamptz,
        (v_record->>'next_due')::timestamptz,
        COALESCE(v_record->>'status', 'active'),
        v_record->>'category'
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('medications', jsonb_array_length(p_snapshot->'patient_medications'));
    RAISE NOTICE '✅ Restored % medications', jsonb_array_length(p_snapshot->'patient_medications');
  END IF;

  -- =====================================================
  -- STEP 3: Restore vitals
  -- ✅ FIXED: Use ACTUAL patient_vitals columns
  -- =====================================================
  IF p_snapshot ? 'patient_vitals' AND jsonb_array_length(p_snapshot->'patient_vitals') > 0 THEN
    RAISE NOTICE '📊 Restoring % vitals...', jsonb_array_length(p_snapshot->'patient_vitals');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_vitals')
    LOOP
      INSERT INTO patient_vitals (
        patient_id,
        tenant_id,
        temperature,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        respiratory_rate,
        oxygen_saturation,
        oxygen_delivery,
        recorded_at
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        (v_record->>'temperature')::numeric,
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'oxygen_saturation')::integer,
        v_record->>'oxygen_delivery',
        COALESCE((v_record->>'recorded_at')::timestamptz, now())
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('vitals', jsonb_array_length(p_snapshot->'patient_vitals'));
    RAISE NOTICE '✅ Restored % vitals', jsonb_array_length(p_snapshot->'patient_vitals');
  END IF;

  -- =====================================================
  -- STEP 4: Restore notes
  -- ✅ FIXED: Use ACTUAL patient_notes columns
  -- =====================================================
  IF p_snapshot ? 'patient_notes' AND jsonb_array_length(p_snapshot->'patient_notes') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_notes')
    LOOP
      INSERT INTO patient_notes (
        patient_id,
        tenant_id,
        note_type,
        content,
        priority,
        created_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        v_record->>'note_type',
        v_record->>'content',
        v_record->>'priority',
        (v_record->>'created_by')::uuid
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('notes', jsonb_array_length(p_snapshot->'patient_notes'));
  END IF;

  -- =====================================================
  -- STEP 5: Restore alerts
  -- ✅ FIXED: Use ACTUAL patient_alerts columns
  -- =====================================================
  IF p_snapshot ? 'patient_alerts' AND jsonb_array_length(p_snapshot->'patient_alerts') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_alerts')
    LOOP
      INSERT INTO patient_alerts (
        tenant_id,
        patient_id,
        patient_name,
        alert_type,
        message,
        priority,
        acknowledged,
        acknowledged_by,
        acknowledged_at,
        expires_at
      )
      VALUES (
        p_tenant_id,
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'patient_name',
        (v_record->>'alert_type')::alert_type_enum,
        v_record->>'message',
        (v_record->>'priority')::alert_priority_enum,
        COALESCE((v_record->>'acknowledged')::boolean, false),
        (v_record->>'acknowledged_by')::uuid,
        (v_record->>'acknowledged_at')::timestamptz,
        (v_record->>'expires_at')::timestamptz
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('alerts', jsonb_array_length(p_snapshot->'patient_alerts'));
  END IF;

  -- =====================================================
  -- STEP 6: Restore diabetic records
  -- =====================================================
  IF p_snapshot ? 'diabetic_records' AND jsonb_array_length(p_snapshot->'diabetic_records') > 0 THEN
    RAISE NOTICE '🩸 Restoring % diabetic records...', jsonb_array_length(p_snapshot->'diabetic_records');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'diabetic_records')
    LOOP
      INSERT INTO diabetic_records (
        patient_id,
        tenant_id,
        blood_glucose,
        insulin_dose,
        carbs_consumed,
        recorded_at,
        recorded_by,
        notes
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        (v_record->>'blood_glucose')::numeric,
        (v_record->>'insulin_dose')::numeric,
        (v_record->>'carbs_consumed')::integer,
        (v_record->>'recorded_at')::timestamptz,
        (v_record->>'recorded_by')::uuid,
        v_record->>'notes'
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('diabetic_records', jsonb_array_length(p_snapshot->'diabetic_records'));
    RAISE NOTICE '✅ Restored % diabetic records', jsonb_array_length(p_snapshot->'diabetic_records');
  END IF;

  -- =====================================================
  -- STEP 7: Restore wound assessments
  -- =====================================================
  IF p_snapshot ? 'wound_assessments' AND jsonb_array_length(p_snapshot->'wound_assessments') > 0 THEN
    RAISE NOTICE '🩹 Restoring % wound assessments...', jsonb_array_length(p_snapshot->'wound_assessments');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_assessments')
    LOOP
      INSERT INTO wound_assessments (
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
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
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
    
    v_counts := v_counts || jsonb_build_object('wound_assessments', jsonb_array_length(p_snapshot->'wound_assessments'));
    RAISE NOTICE '✅ Restored % wound assessments', jsonb_array_length(p_snapshot->'wound_assessments');
  END IF;

  -- =====================================================
  -- STEP 8: Restore doctors orders
  -- ✅ FIXED: Use ACTUAL doctors_orders columns
  -- =====================================================
  IF p_snapshot ? 'doctors_orders' AND jsonb_array_length(p_snapshot->'doctors_orders') > 0 THEN
    RAISE NOTICE '📋 Restoring % doctors orders...', jsonb_array_length(p_snapshot->'doctors_orders');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'doctors_orders')
    LOOP
      INSERT INTO doctors_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        doctor_name,
        created_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        (v_record->>'order_date')::date,
        (v_record->>'order_time')::time,
        v_record->>'order_text',
        v_record->>'ordering_doctor',
        v_record->>'notes',
        v_record->>'order_type',
        COALESCE((v_record->>'is_acknowledged')::boolean, false),
        (v_record->>'acknowledged_by')::uuid,
        (v_record->>'acknowledged_at')::timestamptz,
        v_record->>'doctor_name',
        (v_record->>'created_by')::uuid
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('doctors_orders', jsonb_array_length(p_snapshot->'doctors_orders'));
    RAISE NOTICE '✅ Restored % doctors orders', jsonb_array_length(p_snapshot->'doctors_orders');
  END IF;

  -- =====================================================
  -- STEP 9: Restore lab panels (needed before lab results)
  -- =====================================================
  IF p_snapshot ? 'lab_panels' AND jsonb_array_length(p_snapshot->'lab_panels') > 0 THEN
    RAISE NOTICE '🧪 Restoring % lab panels...', jsonb_array_length(p_snapshot->'lab_panels');
    
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
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'panel_name',
        v_record->>'ordered_by',
        (v_record->>'ordered_at')::timestamptz,
        COALESCE(v_record->>'status', 'pending')
      );
      
      v_panel_mapping := v_panel_mapping || jsonb_build_object(v_old_panel_id::text, v_new_panel_id);
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('lab_panels', jsonb_array_length(p_snapshot->'lab_panels'));
    RAISE NOTICE '✅ Restored % lab panels', jsonb_array_length(p_snapshot->'lab_panels');
  END IF;

  -- =====================================================
  -- STEP 10: Restore lab results (references lab_panels)
  -- =====================================================
  IF p_snapshot ? 'lab_results' AND jsonb_array_length(p_snapshot->'lab_results') > 0 THEN
    RAISE NOTICE '📊 Restoring % lab results...', jsonb_array_length(p_snapshot->'lab_results');
    
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
        (v_panel_mapping->>(v_record->>'panel_id'))::uuid,
        v_record->>'test_name',
        v_record->>'result_value',
        v_record->>'unit',
        v_record->>'reference_range',
        COALESCE((v_record->>'is_abnormal')::boolean, false),
        (v_record->>'resulted_at')::timestamptz
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('lab_results', jsonb_array_length(p_snapshot->'lab_results'));
    RAISE NOTICE '✅ Restored % lab results', jsonb_array_length(p_snapshot->'lab_results');
  END IF;

  -- =====================================================
  -- STEP 11: Restore patient images
  -- =====================================================
  IF p_snapshot ? 'patient_images' AND jsonb_array_length(p_snapshot->'patient_images') > 0 THEN
    RAISE NOTICE '🖼️  Restoring % patient images...', jsonb_array_length(p_snapshot->'patient_images');
    
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
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'image_url',
        v_record->>'image_type',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        (v_record->>'uploaded_at')::timestamptz
      );
    END LOOP;
    
    v_counts := v_counts || jsonb_build_object('patient_images', jsonb_array_length(p_snapshot->'patient_images'));
    RAISE NOTICE '✅ Restored % patient images', jsonb_array_length(p_snapshot->'patient_images');
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

GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION restore_snapshot_to_tenant IS 
'Restores snapshot of clinical data to simulation tenant. 
Fixed to use ACTUAL patients table schema with correct column names.
Supports 11 clinical data tables.';
