-- =====================================================
-- UPDATE: Complete restore_snapshot_to_tenant Function
-- =====================================================
-- Add support for ALL snapshot tables including:
-- - doctors_orders, lab_results, lab_panels
-- - patient_bowel_records, patient_images
-- - All other clinical data
-- =====================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_tenant_id uuid,
  p_snapshot jsonb
)
RETURNS void AS $$
DECLARE
  v_patient_record jsonb;
  v_new_patient_id uuid;
  v_old_patient_id uuid;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_panel_mapping jsonb := '{}'::jsonb;
  v_record jsonb;
  v_old_panel_id uuid;
  v_new_panel_id uuid;
BEGIN
  RAISE NOTICE '🔄 Restoring snapshot to tenant %', p_tenant_id;
  
  -- =====================================================
  -- STEP 1: Restore patients (create ID mapping)
  -- =====================================================
  IF p_snapshot ? 'patients' AND jsonb_array_length(p_snapshot->'patients') > 0 THEN
    RAISE NOTICE '👥 Restoring % patients...', jsonb_array_length(p_snapshot->'patients');
    
    FOR v_patient_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_patient_record->>'id')::uuid;
      
      INSERT INTO patients (
        tenant_id,
        patient_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        room_number,
        bed_number,
        diagnosis,
        condition,
        allergies,
        code_status,
        advance_directives,
        admission_date,
        attending_physician
      )
      VALUES (
        p_tenant_id,
        v_patient_record->>'patient_id',
        v_patient_record->>'first_name',
        v_patient_record->>'last_name',
        (v_patient_record->>'date_of_birth')::date,
        v_patient_record->>'gender',
        v_patient_record->>'room_number',
        v_patient_record->>'bed_number',
        v_patient_record->>'diagnosis',
        v_patient_record->>'condition',
        COALESCE((v_patient_record->>'allergies')::jsonb, '[]'::jsonb),
        v_patient_record->>'code_status',
        COALESCE((v_patient_record->>'advance_directives')::jsonb, '[]'::jsonb),
        COALESCE((v_patient_record->>'admission_date')::timestamptz, now()),
        v_patient_record->>'attending_physician'
      )
      RETURNING id INTO v_new_patient_id;
      
      -- Store old->new patient ID mapping
      v_patient_mapping := v_patient_mapping || jsonb_build_object(
        v_old_patient_id::text, v_new_patient_id::text
      );
    END LOOP;
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
    RAISE NOTICE '✅ Restored % vitals', jsonb_array_length(p_snapshot->'patient_vitals');
  END IF;

  -- =====================================================
  -- STEP 4: Restore notes
  -- =====================================================
  IF p_snapshot ? 'patient_notes' AND jsonb_array_length(p_snapshot->'patient_notes') > 0 THEN
    RAISE NOTICE '📝 Restoring % notes...', jsonb_array_length(p_snapshot->'patient_notes');
    
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
    RAISE NOTICE '✅ Restored % notes', jsonb_array_length(p_snapshot->'patient_notes');
  END IF;

  -- =====================================================
  -- STEP 5: Restore doctors orders (NEW!)
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
        created_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        p_tenant_id,
        COALESCE((v_record->>'order_date')::date, CURRENT_DATE),
        COALESCE((v_record->>'order_time')::time, CURRENT_TIME),
        v_record->>'order_text',
        v_record->>'ordering_doctor',
        v_record->>'notes',
        COALESCE(v_record->>'order_type', 'Direct'),
        COALESCE((v_record->>'is_acknowledged')::boolean, false),
        (v_record->>'created_by')::uuid
      );
    END LOOP;
    RAISE NOTICE '✅ Restored % doctors orders', jsonb_array_length(p_snapshot->'doctors_orders');
  END IF;

  -- =====================================================
  -- STEP 6: Restore lab panels (NEW! - Need to map IDs)
  -- =====================================================
  IF p_snapshot ? 'lab_panels' AND jsonb_array_length(p_snapshot->'lab_panels') > 0 THEN
    RAISE NOTICE '🧪 Restoring % lab panels...', jsonb_array_length(p_snapshot->'lab_panels');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'lab_panels')
    LOOP
      v_old_panel_id := (v_record->>'id')::uuid;
      
      INSERT INTO lab_panels (
        tenant_id,
        patient_id,
        panel_name,
        ordered_by,
        ordered_at,
        collected_at,
        resulted_at,
        status
      )
      VALUES (
        p_tenant_id,
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'panel_name',
        (v_record->>'ordered_by')::uuid,
        COALESCE((v_record->>'ordered_at')::timestamptz, now()),
        (v_record->>'collected_at')::timestamptz,
        (v_record->>'resulted_at')::timestamptz,
        COALESCE(v_record->>'status', 'pending')
      )
      RETURNING id INTO v_new_panel_id;
      
      -- Store old->new panel ID mapping
      v_panel_mapping := v_panel_mapping || jsonb_build_object(
        v_old_panel_id::text, v_new_panel_id::text
      );
    END LOOP;
    RAISE NOTICE '✅ Restored % lab panels', jsonb_array_length(p_snapshot->'lab_panels');
  END IF;

  -- =====================================================
  -- STEP 7: Restore lab results (NEW!)
  -- =====================================================
  IF p_snapshot ? 'lab_results' AND jsonb_array_length(p_snapshot->'lab_results') > 0 THEN
    RAISE NOTICE '🔬 Restoring % lab results...', jsonb_array_length(p_snapshot->'lab_results');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'lab_results')
    LOOP
      INSERT INTO lab_results (
        tenant_id,
        patient_id,
        panel_id,
        category,
        test_code,
        test_name,
        value,
        units,
        ref_low,
        ref_high,
        ref_operator,
        critical_low,
        critical_high,
        flag,
        entered_by,
        entered_at
      )
      VALUES (
        p_tenant_id,
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_panel_mapping->(v_record->>'panel_id'))::uuid,
        (v_record->>'category')::lab_category,
        v_record->>'test_code',
        v_record->>'test_name',
        (v_record->>'value')::numeric,
        v_record->>'units',
        (v_record->>'ref_low')::numeric,
        (v_record->>'ref_high')::numeric,
        COALESCE((v_record->>'ref_operator')::ref_operator, 'between'),
        (v_record->>'critical_low')::numeric,
        (v_record->>'critical_high')::numeric,
        COALESCE((v_record->>'flag')::lab_flag, 'normal'),
        (v_record->>'entered_by')::uuid,
        COALESCE((v_record->>'entered_at')::timestamptz, now())
      );
    END LOOP;
    RAISE NOTICE '✅ Restored % lab results', jsonb_array_length(p_snapshot->'lab_results');
  END IF;

  -- =====================================================
  -- STEP 8: Restore bowel records (NEW!)
  -- =====================================================
  IF p_snapshot ? 'patient_bowel_records' AND jsonb_array_length(p_snapshot->'patient_bowel_records') > 0 THEN
    RAISE NOTICE '📋 Restoring % bowel records...', jsonb_array_length(p_snapshot->'patient_bowel_records');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_bowel_records')
    LOOP
      INSERT INTO patient_bowel_records (
        patient_id,
        recorded_at,
        bowel_movement_type,
        consistency,
        color,
        amount,
        notes,
        recorded_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        COALESCE((v_record->>'recorded_at')::timestamptz, now()),
        v_record->>'bowel_movement_type',
        v_record->>'consistency',
        v_record->>'color',
        v_record->>'amount',
        v_record->>'notes',
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
    RAISE NOTICE '✅ Restored % bowel records', jsonb_array_length(p_snapshot->'patient_bowel_records');
  END IF;

  -- =====================================================
  -- STEP 9: Restore patient images (NEW!)
  -- =====================================================
  IF p_snapshot ? 'patient_images' AND jsonb_array_length(p_snapshot->'patient_images') > 0 THEN
    RAISE NOTICE '🖼️  Restoring % patient images...', jsonb_array_length(p_snapshot->'patient_images');
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_images')
    LOOP
      INSERT INTO patient_images (
        patient_id,
        image_type,
        image_url,
        storage_path,
        description,
        uploaded_by,
        uploaded_at
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'image_type',
        v_record->>'image_url',
        v_record->>'storage_path',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        COALESCE((v_record->>'uploaded_at')::timestamptz, now())
      );
    END LOOP;
    RAISE NOTICE '✅ Restored % patient images', jsonb_array_length(p_snapshot->'patient_images');
  END IF;

  -- =====================================================
  -- STEP 10: Restore other clinical data
  -- =====================================================
  
  -- Advanced Directives
  IF p_snapshot ? 'advanced_directives' AND jsonb_array_length(p_snapshot->'advanced_directives') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'advanced_directives')
    LOOP
      INSERT INTO advanced_directives (
        patient_id,
        directive_type,
        details,
        effective_date,
        created_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'directive_type',
        v_record->>'details',
        (v_record->>'effective_date')::date,
        (v_record->>'created_by')::uuid
      );
    END LOOP;
  END IF;

  -- Admission Records
  IF p_snapshot ? 'admission_records' AND jsonb_array_length(p_snapshot->'admission_records') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'admission_records')
    LOOP
      INSERT INTO admission_records (
        patient_id,
        admission_date,
        admission_type,
        chief_complaint,
        admitting_diagnosis,
        admitting_physician
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'admission_date')::timestamptz,
        v_record->>'admission_type',
        v_record->>'chief_complaint',
        v_record->>'admitting_diagnosis',
        v_record->>'admitting_physician'
      );
    END LOOP;
  END IF;

  -- Diabetic Records
  IF p_snapshot ? 'diabetic_records' AND jsonb_array_length(p_snapshot->'diabetic_records') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'diabetic_records')
    LOOP
      INSERT INTO diabetic_records (
        patient_id,
        blood_glucose,
        insulin_dose,
        insulin_type,
        recorded_at,
        recorded_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'blood_glucose')::numeric,
        v_record->>'insulin_dose',
        v_record->>'insulin_type',
        COALESCE((v_record->>'recorded_at')::timestamptz, now()),
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
  END IF;

  -- Wound Care Assessments
  IF p_snapshot ? 'wound_care_assessments' AND jsonb_array_length(p_snapshot->'wound_care_assessments') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_care_assessments')
    LOOP
      INSERT INTO wound_care_assessments (
        patient_id,
        wound_location,
        wound_type,
        wound_size,
        wound_stage,
        assessment_date,
        assessed_by,
        notes
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'wound_location',
        v_record->>'wound_type',
        v_record->>'wound_size',
        v_record->>'wound_stage',
        (v_record->>'assessment_date')::date,
        (v_record->>'assessed_by')::uuid,
        v_record->>'notes'
      );
    END LOOP;
  END IF;

  -- Patient Alerts
  IF p_snapshot ? 'patient_alerts' AND jsonb_array_length(p_snapshot->'patient_alerts') > 0 THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_alerts')
    LOOP
      INSERT INTO patient_alerts (
        tenant_id,
        patient_id,
        alert_type,
        message,
        priority,
        created_by
      )
      VALUES (
        p_tenant_id,
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'alert_type',
        v_record->>'message',
        v_record->>'priority',
        (v_record->>'created_by')::uuid
      );
    END LOOP;
  END IF;

  RAISE NOTICE '🎉 Snapshot restore complete!';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb) TO authenticated;

-- =====================================================
-- Update comment
-- =====================================================

COMMENT ON FUNCTION restore_snapshot_to_tenant IS 
'Restore complete snapshot data to target tenant including:
- Patients, medications, vitals, notes, alerts
- Doctors orders, lab results/panels
- Bowel records, patient images
- Advanced directives, admission records, diabetic records, wound care

Version 2: Added support for all new snapshot tables';
