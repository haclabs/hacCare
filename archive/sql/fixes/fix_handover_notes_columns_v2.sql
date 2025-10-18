-- ===========================================================================
-- Fix handover_notes AND patients column names in snapshot restore function
-- ===========================================================================
-- Issues fixed:
-- 1. handover_notes: 'handover_type' -> 'priority', 'recommendation' -> 'recommendations'
-- 2. patients: Incorrect columns (mrn, status, primary_diagnosis, etc.) 
--    -> Correct columns (patient_id, condition, diagnosis, etc.)
-- ===========================================================================

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb, jsonb) CASCADE;

-- Create ONLY the version with 3 parameters (with default NULL for backward compatibility)
CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_target_tenant_id uuid,
  p_snapshot jsonb,
  p_id_mappings jsonb DEFAULT NULL  -- NEW: Pre-allocated IDs from session (defaults to NULL)
)
RETURNS void AS $$
DECLARE
  v_record jsonb;
  v_patient_mapping jsonb := COALESCE(p_id_mappings->'patients', '{}'::jsonb);
  v_med_mapping jsonb := COALESCE(p_id_mappings->'medications', '{}'::jsonb);
  v_wound_mapping jsonb := '{}'::jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_med_id uuid;
  v_new_med_id uuid;
  v_old_wound_id uuid;
  v_new_wound_id uuid;
BEGIN
  -- Restore patients first and build mapping
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      -- Use pre-allocated ID if available, otherwise generate new
      IF v_patient_mapping ? v_old_patient_id::text THEN
        v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
        RAISE NOTICE 'Using pre-allocated patient ID: %', v_new_patient_id;
      ELSE
        v_new_patient_id := gen_random_uuid();
        RAISE NOTICE 'Generating new patient ID: %', v_new_patient_id;
      END IF;
      
      INSERT INTO patients (
        id,  -- EXPLICITLY SET ID (pre-allocated or new)
        tenant_id, patient_id, first_name, last_name, date_of_birth,
        gender, room_number, bed_number, admission_date,
        condition, diagnosis, allergies, blood_type,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        assigned_nurse
      )
      VALUES (
        v_new_patient_id,  -- USE PRE-ALLOCATED OR GENERATED ID
        p_target_tenant_id,
        'P' || lpad(floor(random() * 100000)::text, 5, '0'),  -- GENERATE UNIQUE patient_id
        v_record->>'first_name',
        v_record->>'last_name',
        (v_record->>'date_of_birth')::date,
        v_record->>'gender',
        v_record->>'room_number',
        v_record->>'bed_number',
        (v_record->>'admission_date')::timestamptz,
        v_record->>'condition',
        v_record->>'diagnosis',
        CASE 
          WHEN jsonb_typeof(v_record->'allergies') = 'array' THEN 
            ARRAY(SELECT jsonb_array_elements_text(v_record->'allergies'))
          WHEN v_record->>'allergies' IS NOT NULL THEN 
            string_to_array(v_record->>'allergies', ',')
          ELSE NULL
        END,
        v_record->>'blood_type',
        v_record->>'emergency_contact_name',
        v_record->>'emergency_contact_relationship',
        v_record->>'emergency_contact_phone',
        v_record->>'assigned_nurse'
      );
      
      -- Update mapping (in case we generated a new ID)
      v_patient_mapping := jsonb_set(
        v_patient_mapping,
        ARRAY[v_old_patient_id::text],
        to_jsonb(v_new_patient_id::text)
      );
    END LOOP;
  END IF;
  
  -- Restore vital signs (patient_vitals table)
  IF p_snapshot->'vital_signs' IS NOT NULL OR p_snapshot->'patient_vitals' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(
      COALESCE(p_snapshot->'vital_signs', p_snapshot->'patient_vitals')
    )
    LOOP
      INSERT INTO patient_vitals (
        patient_id, temperature, heart_rate, respiratory_rate,
        blood_pressure_systolic, blood_pressure_diastolic, 
        oxygen_saturation, oxygen_delivery, recorded_at, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'temperature')::numeric,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'oxygen_saturation')::numeric,
        COALESCE(v_record->>'oxygen_delivery', 'Room Air'),
        COALESCE((v_record->>'recorded_at')::timestamptz, now()),
        p_target_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore medications
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      v_old_med_id := (v_record->>'id')::uuid;
      
      -- Use pre-allocated medication ID if available
      IF v_med_mapping ? v_old_med_id::text THEN
        v_new_med_id := (v_med_mapping->>v_old_med_id::text)::uuid;
      ELSE
        v_new_med_id := gen_random_uuid();
      END IF;
      
      INSERT INTO patient_medications (
        id,  -- SET PRE-ALLOCATED ID
        patient_id, name, dosage, route, frequency,
        start_date, end_date, prescribed_by, 
        status, admin_time, admin_times, next_due, tenant_id, category
      )
      VALUES (
        v_new_med_id,  -- USE PRE-ALLOCATED ID
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        COALESCE(v_record->>'name', v_record->>'medication_name'),  -- Handle both column names
        v_record->>'dosage',
        v_record->>'route',
        v_record->>'frequency',
        (v_record->>'start_date')::timestamptz,
        (v_record->>'end_date')::timestamptz,
        COALESCE(v_record->>'prescribed_by', v_record->>'prescribing_provider'),  -- Handle both names
        COALESCE(v_record->>'status', 'Active'),
        v_record->>'admin_time',
        (v_record->>'admin_times')::jsonb,
        COALESCE((v_record->>'next_due')::timestamptz, now()),  -- Default to now if not provided
        p_target_tenant_id,
        v_record->>'category'
      );
    END LOOP;
  END IF;
  
  -- Restore medication administrations
  IF p_snapshot->'medication_administrations' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'medication_administrations')
    LOOP
      INSERT INTO medication_administrations (
        medication_id, patient_id, administered_by, administered_by_id,
        timestamp, notes, dosage, route, status, medication_name, tenant_id
      )
      VALUES (
        (v_med_mapping->>(v_record->>'medication_id'))::uuid,  -- Use medication mapping
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'administered_by',
        (v_record->>'administered_by_id')::uuid,
        COALESCE((v_record->>'timestamp')::timestamptz, (v_record->>'administered_time')::timestamptz, now()),
        v_record->>'notes',
        v_record->>'dosage',
        v_record->>'route',
        COALESCE(v_record->>'status', 'completed'),
        v_record->>'medication_name',
        p_target_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore wound assessments (with correct column names)
  IF p_snapshot->'wound_assessments' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_assessments')
    LOOP
      INSERT INTO wound_assessments (
        patient_id, tenant_id, assessment_date, wound_location, wound_type, stage,
        length_cm, width_cm, depth_cm, wound_bed, exudate_amount, exudate_type,
        periwound_condition, pain_level, odor, signs_of_infection, 
        assessment_notes, photos, assessor_id, assessor_name
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_target_tenant_id,
        (v_record->>'assessment_date')::timestamptz,
        COALESCE(v_record->>'wound_location', v_record->>'location'),
        v_record->>'wound_type',
        v_record->>'stage',
        (v_record->>'length_cm')::numeric,
        (v_record->>'width_cm')::numeric,
        (v_record->>'depth_cm')::numeric,
        COALESCE(v_record->>'wound_bed', v_record->>'appearance'),
        COALESCE(v_record->>'exudate_amount', v_record->>'drainage_amount'),
        COALESCE(v_record->>'exudate_type', v_record->>'drainage_type'),
        v_record->>'periwound_condition',
        COALESCE((v_record->>'pain_level')::integer, 0),
        COALESCE(v_record->>'odor', 'false'),
        COALESCE(v_record->>'signs_of_infection', 'false'),
        COALESCE(v_record->>'assessment_notes', v_record->>'notes'),
        CASE 
          WHEN jsonb_typeof(v_record->'photos') = 'array' THEN 
            ARRAY(SELECT jsonb_array_elements_text(v_record->'photos'))
          ELSE '{}'::text[]
        END,
        (v_record->>'assessor_id')::uuid,
        v_record->>'assessor_name'
      );
    END LOOP;
  END IF;
  
  -- FIXED: Restore handover notes with correct columns
  -- Changed: handover_type -> priority, recommendation -> recommendations
  IF p_snapshot->'handover_notes' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'handover_notes')
    LOOP
      INSERT INTO handover_notes (
        patient_id, shift, priority, situation,
        background, assessment, recommendations, created_by, created_by_name, created_by_role
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'shift',
        COALESCE(v_record->>'priority', v_record->>'handover_type', 'medium'),  -- Handle legacy data
        v_record->>'situation',
        v_record->>'background',
        v_record->>'assessment',
        COALESCE(v_record->>'recommendations', v_record->>'recommendation'),  -- Handle both spellings
        (v_record->>'created_by')::uuid,
        COALESCE(v_record->>'created_by_name', 'Unknown'),
        COALESCE(v_record->>'created_by_role', 'nurse')
      );
    END LOOP;
  END IF;
  
  -- Restore doctors orders (HAS tenant_id)
  IF p_snapshot->'doctors_orders' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'doctors_orders')
    LOOP
      INSERT INTO doctors_orders (
        patient_id, tenant_id, order_date, order_time, order_text,
        ordering_doctor, doctor_name, notes, order_type, 
        is_acknowledged, created_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        p_target_tenant_id,
        COALESCE((v_record->>'order_date')::date, now()::date),
        COALESCE((v_record->>'order_time')::time, now()::time),
        COALESCE(v_record->>'order_text', v_record->>'order_details'),
        v_record->>'ordering_doctor',
        COALESCE(v_record->>'doctor_name', v_record->>'ordering_doctor'),
        v_record->>'notes',
        COALESCE(v_record->>'order_type', 'Direct'),
        COALESCE((v_record->>'is_acknowledged')::boolean, false),
        COALESCE((v_record->>'ordered_by')::uuid, (v_record->>'created_by')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      );
    END LOOP;
  END IF;
  
  -- Restore patient images (HAS tenant_id)
  IF p_snapshot->'patient_images' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_images')
    LOOP
      INSERT INTO patient_images (
        patient_id, image_url, image_type, description,
        uploaded_by, uploaded_at, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'image_url',
        v_record->>'image_type',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        (v_record->>'uploaded_at')::timestamptz,
        p_target_tenant_id
      );
    END LOOP;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (only one version needed - the default parameter handles both cases)
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb) TO anon;

SELECT '✅ restore_snapshot_to_tenant function FIXED with correct column names and pre-allocated ID support!' as status;
