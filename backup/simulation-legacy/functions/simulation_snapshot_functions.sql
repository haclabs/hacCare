-- ===========================================================================
-- FINAL FIX: Snapshot Functions - Run This Version!
-- ===========================================================================
-- Created: October 5, 2025
-- This is the CORRECT version with ALL fixes applied
-- ===========================================================================

-- First, drop the buggy old functions
DROP FUNCTION IF EXISTS save_template_snapshot(uuid) CASCADE;
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;

-- ---------------------------------------------------------------------------
-- Save snapshot of template tenant data
-- ---------------------------------------------------------------------------
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
  
  -- Build snapshot of all data in template tenant
  v_snapshot := jsonb_build_object(
    'patients', (
      SELECT COALESCE(json_agg(row_to_json(p.*)), '[]'::json)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_medications', (
      SELECT COALESCE(json_agg(row_to_json(pm.*)), '[]'::json)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_vitals', (
      SELECT COALESCE(json_agg(row_to_json(pv.*)), '[]'::json)
      FROM patient_vitals pv
      JOIN patients p ON p.id = pv.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_notes', (
      SELECT COALESCE(json_agg(row_to_json(pn.*)), '[]'::json)
      FROM patient_notes pn
      JOIN patients p ON p.id = pn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_alerts', (
      SELECT COALESCE(json_agg(row_to_json(pa.*)), '[]'::json)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'patient_admission_records', (
      SELECT COALESCE(json_agg(row_to_json(par.*)), '[]'::json)
      FROM patient_admission_records par
      JOIN patients p ON p.id = par.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_advanced_directives', (
      SELECT COALESCE(json_agg(row_to_json(pad.*)), '[]'::json)
      FROM patient_advanced_directives pad
      JOIN patients p ON p.id = pad.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'diabetic_records', (
      SELECT COALESCE(json_agg(row_to_json(dr.*)), '[]'::json)
      FROM diabetic_records dr
      JOIN patients p ON p.id = dr.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'bowel_records', (
      SELECT COALESCE(json_agg(row_to_json(br.*)), '[]'::json)
      FROM bowel_records br
      JOIN patients p ON p.id = br.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_wounds', (
      SELECT COALESCE(json_agg(row_to_json(pw.*)), '[]'::json)
      FROM patient_wounds pw
      JOIN patients p ON p.id = pw.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'wound_assessments', (
      SELECT COALESCE(json_agg(row_to_json(wa.*)), '[]'::json)
      FROM wound_assessments wa
      JOIN patient_wounds pw ON pw.id = wa.wound_id
      JOIN patients p ON p.id = pw.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'handover_notes', (
      SELECT COALESCE(json_agg(row_to_json(hn.*)), '[]'::json)
      FROM handover_notes hn
      JOIN patients p ON p.id = hn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'doctors_orders', (
      SELECT COALESCE(json_agg(row_to_json(do_.*)), '[]'::json)
      FROM doctors_orders do_
      JOIN patients p ON p.id = do_.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_images', (
      SELECT COALESCE(json_agg(row_to_json(pi.*)), '[]'::json)
      FROM patient_images pi
      JOIN patients p ON p.id = pi.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'tenant_id', v_tenant_id
    )
  );
  
  -- Update template with snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  v_result := json_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'message', 'Snapshot saved successfully. Template is now ready to launch.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Restore snapshot data to a tenant - CRITICAL: Uses ->> operator!
-- ---------------------------------------------------------------------------
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
  v_wound_mapping jsonb := '{}'::jsonb;
  v_old_wound_id uuid;
  v_new_wound_id uuid;
  v_record jsonb;
BEGIN
  -- Restore patients first (create ID mapping)
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_patient_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_patient_record->>'id')::uuid;
      
      INSERT INTO patients (
        patient_id, name, date_of_birth, gender, blood_type,
        allergies, medical_history, emergency_contact,
        emergency_contact_phone, condition, tenant_id
      )
      VALUES (
        v_patient_record->>'patient_id',
        v_patient_record->>'name',
        (v_patient_record->>'date_of_birth')::date,
        v_patient_record->>'gender',
        v_patient_record->>'blood_type',
        v_patient_record->>'allergies',
        v_patient_record->>'medical_history',
        v_patient_record->>'emergency_contact',
        v_patient_record->>'emergency_contact_phone',
        v_patient_record->>'condition',
        p_tenant_id
      )
      RETURNING id INTO v_new_patient_id;
      
      -- Store mapping
      v_patient_mapping := v_patient_mapping || jsonb_build_object(
        v_old_patient_id::text, v_new_patient_id::text
      );
    END LOOP;
  END IF;
  
  -- Restore patient_medications - USES ->> OPERATOR!
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      INSERT INTO patient_medications (
        patient_id, medication_name, dosage, frequency, route,
        start_date, end_date, instructions, status, prescribed_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,  -- << DOUBLE ARROW HERE!
        v_record->>'medication_name',
        v_record->>'dosage',
        v_record->>'frequency',
        v_record->>'route',
        (v_record->>'start_date')::timestamptz,
        (v_record->>'end_date')::timestamptz,
        v_record->>'instructions',
        v_record->>'status',
        (v_record->>'prescribed_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore vitals - USES ->> OPERATOR!
  IF p_snapshot->'patient_vitals' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_vitals')
    LOOP
      INSERT INTO patient_vitals (
        patient_id, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, temperature, oxygen_saturation,
        pain_level, recorded_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,  -- << DOUBLE ARROW HERE!
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'temperature')::numeric,
        (v_record->>'oxygen_saturation')::integer,
        (v_record->>'pain_level')::integer,
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore patient notes
  IF p_snapshot->'patient_notes' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_notes')
    LOOP
      INSERT INTO patient_notes (
        patient_id, note_type, content, created_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'note_type',
        v_record->>'content',
        (v_record->>'created_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore patient alerts
  IF p_snapshot->'patient_alerts' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_alerts')
    LOOP
      INSERT INTO patient_alerts (
        patient_id, alert_type, severity, message, 
        is_active, created_by, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'alert_type',
        v_record->>'severity',
        v_record->>'message',
        (v_record->>'is_active')::boolean,
        (v_record->>'created_by')::uuid,
        p_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore diabetic records
  IF p_snapshot->'diabetic_records' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'diabetic_records')
    LOOP
      INSERT INTO diabetic_records (
        patient_id, blood_glucose, insulin_dose, carbs_intake,
        meal_type, notes, recorded_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'blood_glucose')::numeric,
        v_record->>'insulin_dose',
        (v_record->>'carbs_intake')::integer,
        v_record->>'meal_type',
        v_record->>'notes',
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore patient admission records
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
  
  -- Restore patient advanced directives
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
  
  -- Restore bowel records
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
  
  -- Restore patient wounds
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
  
  -- Restore wound assessments
  IF p_snapshot->'wound_assessments' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_assessments')
    LOOP
      INSERT INTO wound_assessments (
        wound_id, assessment_date, length_cm, width_cm,
        depth_cm, appearance, drainage_type, drainage_amount,
        odor, pain_level, treatment, notes, assessed_by
      )
      VALUES (
        (v_wound_mapping->>(v_record->>'wound_id'))::uuid,
        (v_record->>'assessment_date')::timestamptz,
        (v_record->>'length_cm')::numeric,
        (v_record->>'width_cm')::numeric,
        (v_record->>'depth_cm')::numeric,
        v_record->>'appearance',
        v_record->>'drainage_type',
        v_record->>'drainage_amount',
        v_record->>'odor',
        (v_record->>'pain_level')::integer,
        v_record->>'treatment',
        v_record->>'notes',
        (v_record->>'assessed_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore handover notes
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
  
  -- Restore doctors orders
  IF p_snapshot->'doctors_orders' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'doctors_orders')
    LOOP
      INSERT INTO doctors_orders (
        patient_id, order_type, order_details, priority,
        status, ordered_by, ordered_at, completed_at, notes
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
        v_record->>'notes'
      );
    END LOOP;
  END IF;
  
  -- Restore patient images
  IF p_snapshot->'patient_images' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_images')
    LOOP
      INSERT INTO patient_images (
        patient_id, image_type, image_url, description,
        uploaded_by, file_size, mime_type
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'image_type',
        v_record->>'image_url',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        (v_record->>'file_size')::bigint,
        v_record->>'mime_type'
      );
    END LOOP;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- Verification
-- ===========================================================================
DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Snapshot functions SUCCESSFULLY CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions ready:';
  RAISE NOTICE '  - save_template_snapshot';
  RAISE NOTICE '  - restore_snapshot_to_tenant';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  KEY FIX: All patient mapping lookups use ->> operator';
  RAISE NOTICE '   This prevents the "uuid = text" error!';
  RAISE NOTICE '';
  RAISE NOTICE 'Now you can:';
  RAISE NOTICE '  1. Save snapshots successfully';
  RAISE NOTICE '  2. Launch simulations';
  RAISE NOTICE '========================================';
END $$;
