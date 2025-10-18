-- ===========================================================================
-- FIX: Complete restore_snapshot_to_tenant with ID mappings + ALL data
-- ===========================================================================
-- This version:
-- 1. Accepts ID mappings for reusable labels
-- 2. Restores ALL data types (meds, vitals, orders, wounds, etc.)
-- 3. Only uses columns that exist (no code_status, etc.)
-- ===========================================================================

DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_tenant_id uuid,
  p_snapshot jsonb,
  p_id_mappings jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_patient_record jsonb;
  v_new_patient_id uuid;
  v_old_patient_id uuid;
  v_old_patient_text_id text;
  v_new_patient_text_id text;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_patient_text_mapping jsonb := '{}'::jsonb;
  v_wound_mapping jsonb := '{}'::jsonb;
  v_med_mapping jsonb;
  v_old_wound_id uuid;
  v_new_wound_id uuid;
  v_old_med_id uuid;
  v_new_med_id uuid;
  v_record jsonb;
BEGIN
  -- Extract pre-allocated ID mappings if provided
  v_patient_mapping := COALESCE(p_id_mappings->'patients', '{}'::jsonb);
  v_med_mapping := COALESCE(p_id_mappings->'medications', '{}'::jsonb);
  
  RAISE NOTICE 'Restoring snapshot with % IDs', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'PRE-ALLOCATED (reusable labels)' ELSE 'RANDOM' END;
  
  -- Restore patients first (create ID mapping for both uuid and text IDs)
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_patient_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_patient_record->>'id')::uuid;
      v_old_patient_text_id := v_patient_record->>'patient_id';
      
      -- Use pre-allocated ID if available, otherwise generate new UUID
      IF v_patient_mapping ? v_old_patient_id::text THEN
        v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
        v_new_patient_text_id := v_old_patient_text_id; -- Keep same text ID
        RAISE NOTICE '  ✅ Patient % -> % (PRE-ALLOCATED)', v_old_patient_text_id, v_new_patient_id;
      ELSE
        -- Generate new unique patient_id with SIM prefix
        v_new_patient_text_id := 'SIM' || LPAD(floor(random() * 99999)::text, 5, '0');
        RAISE NOTICE '  🎲 Patient % -> NEW ID (RANDOM)', v_old_patient_text_id;
      END IF;
      
      -- Insert patient (using only columns that exist - no code_status, etc.)
      INSERT INTO patients (
        id, patient_id, first_name, last_name, date_of_birth, gender, 
        room_number, bed_number, admission_date, condition, diagnosis,
        allergies, blood_type, emergency_contact_name, 
        emergency_contact_relationship, emergency_contact_phone, 
        assigned_nurse, tenant_id
      )
      VALUES (
        COALESCE(v_new_patient_id, gen_random_uuid()),
        v_new_patient_text_id,
        v_patient_record->>'first_name',
        v_patient_record->>'last_name',
        (v_patient_record->>'date_of_birth')::date,
        v_patient_record->>'gender',
        v_patient_record->>'room_number',
        v_patient_record->>'bed_number',
        (v_patient_record->>'admission_date')::date,
        v_patient_record->>'condition',
        v_patient_record->>'diagnosis',
        CASE 
          WHEN v_patient_record->'allergies' IS NOT NULL 
          THEN ARRAY(SELECT jsonb_array_elements_text(v_patient_record->'allergies'))
          ELSE '{}'::text[]
        END,
        v_patient_record->>'blood_type',
        v_patient_record->>'emergency_contact_name',
        v_patient_record->>'emergency_contact_relationship',
        v_patient_record->>'emergency_contact_phone',
        v_patient_record->>'assigned_nurse',
        p_tenant_id
      )
      RETURNING id INTO v_new_patient_id;
      
      -- Store both UUID and TEXT mappings
      v_patient_mapping := v_patient_mapping || jsonb_build_object(
        v_old_patient_id::text, v_new_patient_id::text
      );
      v_patient_text_mapping := v_patient_text_mapping || jsonb_build_object(
        v_old_patient_text_id, v_new_patient_text_id
      );
    END LOOP;
  END IF;
  
  -- Restore patient_medications (HAS tenant_id)
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      v_old_med_id := (v_record->>'id')::uuid;
      
      -- Use pre-allocated medication ID if available
      IF v_med_mapping ? v_old_med_id::text THEN
        v_new_med_id := (v_med_mapping->>v_old_med_id::text)::uuid;
        RAISE NOTICE '  ✅ Medication % -> % (PRE-ALLOCATED)', 
          COALESCE(v_record->>'name', v_record->>'medication_name'), v_new_med_id;
      ELSE
        v_new_med_id := gen_random_uuid();
      END IF;
      
      INSERT INTO patient_medications (
        id, patient_id, name, dosage, frequency, route,
        start_date, end_date, status, prescribed_by, 
        last_administered, next_due, category, admin_time, admin_times, tenant_id
      )
      VALUES (
        v_new_med_id,
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        COALESCE(v_record->>'name', v_record->>'medication_name'),
        v_record->>'dosage',
        v_record->>'frequency',
        v_record->>'route',
        (v_record->>'start_date')::date,
        (v_record->>'end_date')::date,
        COALESCE(v_record->>'status', 'Active'),
        COALESCE(v_record->>'prescribed_by', 'Unknown'),
        (v_record->>'last_administered')::timestamptz,
        (v_record->>'next_due')::timestamptz,
        v_record->>'category',
        v_record->>'admin_time',
        v_record->'admin_times',
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore vitals (HAS tenant_id)
  IF p_snapshot->'patient_vitals' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_vitals')
    LOOP
      INSERT INTO patient_vitals (
        patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, oxygen_saturation,
        recorded_at, oxygen_delivery, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'temperature')::numeric,
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'oxygen_saturation')::integer,
        COALESCE((v_record->>'recorded_at')::timestamptz, now()),
        v_record->>'oxygen_delivery',
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore patient notes (HAS tenant_id)
  IF p_snapshot->'patient_notes' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_notes')
    LOOP
      INSERT INTO patient_notes (
        patient_id, note_type, content, created_by, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'note_type',
        v_record->>'content',
        (v_record->>'created_by')::uuid,
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore patient alerts (HAS tenant_id)
  IF p_snapshot->'patient_alerts' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_alerts')
    LOOP
      INSERT INTO patient_alerts (
        patient_id, patient_name, alert_type, message, 
        priority, acknowledged, acknowledged_by, acknowledged_at, 
        expires_at, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'patient_name',
        (v_record->>'alert_type')::alert_type_enum,
        v_record->>'message',
        COALESCE(v_record->>'priority', v_record->>'severity', 'medium')::alert_priority_enum,
        COALESCE((v_record->>'acknowledged')::boolean, false),
        (v_record->>'acknowledged_by')::uuid,
        (v_record->>'acknowledged_at')::timestamptz,
        (v_record->>'expires_at')::timestamptz,
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore diabetic records (HAS tenant_id, uses TEXT patient_id)
  IF p_snapshot->'diabetic_records' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'diabetic_records')
    LOOP
      INSERT INTO diabetic_records (
        patient_id, blood_glucose, insulin_dose, carbs_intake,
        meal_type, notes, recorded_by, tenant_id
      )
      VALUES (
        v_patient_text_mapping->>(v_record->>'patient_id'),  -- TEXT mapping!
        (v_record->>'blood_glucose')::numeric,
        v_record->>'insulin_dose',
        (v_record->>'carbs_intake')::integer,
        v_record->>'meal_type',
        v_record->>'notes',
        (v_record->>'recorded_by')::uuid,
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore patient admission records (NO tenant_id)
  IF p_snapshot->'patient_admission_records' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_admission_records')
    LOOP
      INSERT INTO patient_admission_records (
        patient_id, admission_date, admission_type, chief_complaint,
        admitting_physician, room_number, bed_number, discharge_date,
        discharge_type, discharge_destination, discharge_summary
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'admission_date')::timestamptz,
        v_record->>'admission_type',
        v_record->>'chief_complaint',
        v_record->>'admitting_physician',
        v_record->>'room_number',
        v_record->>'bed_number',
        (v_record->>'discharge_date')::timestamptz,
        v_record->>'discharge_type',
        v_record->>'discharge_destination',
        v_record->>'discharge_summary'
      );
    END LOOP;
  END IF;
  
  -- Restore patient advanced directives (NO tenant_id)
  IF p_snapshot->'patient_advanced_directives' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_advanced_directives')
    LOOP
      INSERT INTO patient_advanced_directives (
        patient_id, has_advance_directive, directive_type,
        dnr_status, organ_donor, healthcare_proxy,
        healthcare_proxy_phone, notes
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'has_advance_directive')::boolean,
        v_record->>'directive_type',
        (v_record->>'dnr_status')::boolean,
        (v_record->>'organ_donor')::boolean,
        v_record->>'healthcare_proxy',
        v_record->>'healthcare_proxy_phone',
        v_record->>'notes'
      );
    END LOOP;
  END IF;
  
  -- Restore bowel records (NO tenant_id)
  IF p_snapshot->'bowel_records' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'bowel_records')
    LOOP
      INSERT INTO bowel_records (
        patient_id, bowel_movement_date, bristol_scale,
        consistency, color, amount, notes, recorded_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'bowel_movement_date')::timestamptz,
        (v_record->>'bristol_scale')::integer,
        v_record->>'consistency',
        v_record->>'color',
        v_record->>'amount',
        v_record->>'notes',
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore patient wounds (NO tenant_id)
  IF p_snapshot->'patient_wounds' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_wounds')
    LOOP
        v_old_wound_id := (v_record->>'id')::uuid;
        
        INSERT INTO patient_wounds (
          patient_id, wound_location, wound_type, length_cm,
          width_cm, depth_cm, stage, appearance, drainage_type,
          drainage_amount, odor, pain_level, treatment, notes
        )
        VALUES (
          (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
          v_record->>'wound_location',
          v_record->>'wound_type',
          (v_record->>'length_cm')::numeric,
          (v_record->>'width_cm')::numeric,
          (v_record->>'depth_cm')::numeric,
          v_record->>'stage',
          v_record->>'appearance',
          v_record->>'drainage_type',
          v_record->>'drainage_amount',
          v_record->>'odor',
          (v_record->>'pain_level')::integer,
          v_record->>'treatment',
          v_record->>'notes'
        )
        RETURNING id INTO v_new_wound_id;
        
        v_wound_mapping := v_wound_mapping || jsonb_build_object(
          v_old_wound_id::text, v_new_wound_id::text
        );
    END LOOP;
  END IF;
  
  -- Restore wound assessments (HAS tenant_id, NO wound_id)
  IF p_snapshot->'wound_assessments' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_assessments')
    LOOP
      INSERT INTO wound_assessments (
        patient_id, assessment_date, wound_location, wound_type, stage,
        length_cm, width_cm, depth_cm, wound_bed, exudate_amount, exudate_type,
        periwound_condition, pain_level, odor, signs_of_infection,
        assessment_notes, assessor_id, assessor_name, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'assessment_date')::timestamptz,
        v_record->>'wound_location',
        v_record->>'wound_type',
        v_record->>'stage',
        (v_record->>'length_cm')::numeric,
        (v_record->>'width_cm')::numeric,
        (v_record->>'depth_cm')::numeric,
        v_record->>'wound_bed',
        v_record->>'exudate_amount',
        v_record->>'exudate_type',
        v_record->>'periwound_condition',
        (v_record->>'pain_level')::integer,
        v_record->>'odor',
        v_record->>'signs_of_infection',
        v_record->>'assessment_notes',
        (v_record->>'assessor_id')::uuid,
        v_record->>'assessor_name',
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore handover notes (NO tenant_id)
  IF p_snapshot->'handover_notes' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'handover_notes')
    LOOP
      INSERT INTO handover_notes (
        patient_id, shift, handover_type, situation,
        background, assessment, recommendation, created_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'shift',
        v_record->>'handover_type',
        v_record->>'situation',
        v_record->>'background',
        v_record->>'assessment',
        v_record->>'recommendation',
        (v_record->>'created_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore doctors orders (HAS tenant_id)
  IF p_snapshot->'doctors_orders' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'doctors_orders')
    LOOP
      INSERT INTO doctors_orders (
        patient_id, order_type, order_details, priority,
        status, ordered_by, ordered_at, completed_at, notes, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'order_type',
        v_record->>'order_details',
        v_record->>'priority',
        v_record->>'status',
        (v_record->>'ordered_by')::uuid,
        (v_record->>'ordered_at')::timestamptz,
        (v_record->>'completed_at')::timestamptz,
        v_record->>'notes',
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore patient images (HAS tenant_id)
  IF p_snapshot->'patient_images' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_images')
    LOOP
      INSERT INTO patient_images (
        patient_id, image_type, image_url, description,
        uploaded_by, file_size, mime_type, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'image_type',
        v_record->>'image_url',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        (v_record->>'file_size')::bigint,
        v_record->>'mime_type',
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  RAISE NOTICE '✅ Snapshot restored successfully with % data tables!', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'REUSABLE IDs across ALL' ELSE 'NEW IDs for all' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb) TO authenticated;

SELECT '✅ restore_snapshot_to_tenant updated with minimal columns!' as status;
