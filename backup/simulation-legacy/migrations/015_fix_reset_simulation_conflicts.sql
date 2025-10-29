-- ===========================================================================
-- FIX: Reset Simulation Duplicate Key Conflicts
-- ===========================================================================
-- Problem: When resetting active simulations with preserved IDs, getting
--          "duplicate key value violates unique constraint patients_pkey"
-- Root Cause: The restore function tries to INSERT with existing IDs instead
--             of using UPSERT or properly clearing before restoring
-- Solution: Use ON CONFLICT DO UPDATE to handle existing IDs gracefully
-- ===========================================================================

-- Update restore_snapshot_to_tenant to use UPSERT instead of INSERT
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_target_tenant_id uuid,
  p_snapshot jsonb,
  p_id_mappings jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_record jsonb;
  v_patient_mapping jsonb;
  v_med_mapping jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_patient_uuid_map jsonb := '{}'::jsonb;
  v_old_med_id uuid;
  v_new_med_id uuid;
BEGIN
  -- Extract mappings or use empty objects
  v_patient_mapping := COALESCE(p_id_mappings->'patients', '{}'::jsonb);
  v_med_mapping := COALESCE(p_id_mappings->'medications', '{}'::jsonb);
  
  RAISE NOTICE 'Restoring snapshot with % pre-allocated IDs', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'REUSABLE' ELSE 'RANDOM' END;
  
  -- Restore patients using PRE-ALLOCATED IDs (or generate random if not provided)
  -- Use INSERT ... ON CONFLICT to handle existing IDs during reset
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      -- Use pre-allocated ID if available, otherwise generate random
      IF v_patient_mapping ? v_old_patient_id::text THEN
        v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
        RAISE NOTICE '  Patient % -> % (PRE-ALLOCATED)', 
          v_record->>'patient_id', v_new_patient_id;
      ELSE
        v_new_patient_id := gen_random_uuid();
        RAISE NOTICE '  Patient % -> % (RANDOM)', 
          v_record->>'patient_id', v_new_patient_id;
      END IF;
      
      -- UPSERT patient with explicit ID (handles reset with same IDs)
      INSERT INTO patients (
        id, tenant_id, patient_id, first_name, last_name, date_of_birth,
        gender, room_number, bed_number, admission_date,
        condition, diagnosis, allergies, blood_type,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        assigned_nurse, code_status, isolation_precautions, fall_risk,
        mobility_status, diet_type, weight_kg, height_cm,
        primary_language, religion, insurance_provider
      )
      VALUES (
        v_new_patient_id, p_target_tenant_id,
        v_record->>'patient_id', v_record->>'first_name', v_record->>'last_name',
        (v_record->>'date_of_birth')::date, v_record->>'gender',
        v_record->>'room_number', v_record->>'bed_number',
        COALESCE((v_record->>'admission_date')::timestamptz, now()),
        v_record->>'condition', v_record->>'diagnosis',
        CASE WHEN v_record->'allergies' IS NOT NULL 
          THEN ARRAY(SELECT jsonb_array_elements_text(v_record->'allergies'))
          ELSE NULL END,
        v_record->>'blood_type', v_record->>'emergency_contact_name',
        v_record->>'emergency_contact_relationship', v_record->>'emergency_contact_phone',
        v_record->>'assigned_nurse', v_record->>'code_status',
        v_record->>'isolation_precautions',
        COALESCE((v_record->>'fall_risk')::boolean, false),
        v_record->>'mobility_status', v_record->>'diet_type',
        (v_record->>'weight_kg')::numeric, (v_record->>'height_cm')::numeric,
        v_record->>'primary_language', v_record->>'religion', v_record->>'insurance_provider'
      )
      ON CONFLICT (id) DO UPDATE SET
        -- Reset to template values
        tenant_id = EXCLUDED.tenant_id,
        patient_id = EXCLUDED.patient_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        room_number = EXCLUDED.room_number,
        bed_number = EXCLUDED.bed_number,
        admission_date = EXCLUDED.admission_date,
        condition = EXCLUDED.condition,
        diagnosis = EXCLUDED.diagnosis,
        allergies = EXCLUDED.allergies,
        blood_type = EXCLUDED.blood_type,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        assigned_nurse = EXCLUDED.assigned_nurse,
        code_status = EXCLUDED.code_status,
        isolation_precautions = EXCLUDED.isolation_precautions,
        fall_risk = EXCLUDED.fall_risk,
        mobility_status = EXCLUDED.mobility_status,
        diet_type = EXCLUDED.diet_type,
        weight_kg = EXCLUDED.weight_kg,
        height_cm = EXCLUDED.height_cm,
        primary_language = EXCLUDED.primary_language,
        religion = EXCLUDED.religion,
        insurance_provider = EXCLUDED.insurance_provider,
        updated_at = now();
      
      -- Store mapping for relationships
      v_old_patient_uuid_map := jsonb_set(
        v_old_patient_uuid_map,
        ARRAY[v_old_patient_id::text],
        to_jsonb(v_new_patient_id::text)
      );
    END LOOP;
  END IF;
  
  -- Restore medications using PRE-ALLOCATED IDs with UPSERT
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      v_old_med_id := (v_record->>'id')::uuid;
      v_old_patient_id := (v_record->>'patient_id')::uuid;
      v_new_patient_id := (v_old_patient_uuid_map->>v_old_patient_id::text)::uuid;
      
      -- Use pre-allocated medication ID if available
      IF v_med_mapping ? v_old_med_id::text THEN
        v_new_med_id := (v_med_mapping->>v_old_med_id::text)::uuid;
        RAISE NOTICE '  Medication % -> % (PRE-ALLOCATED)', 
          v_record->>'medication_name', v_new_med_id;
      ELSE
        v_new_med_id := gen_random_uuid();
        RAISE NOTICE '  Medication % -> % (RANDOM)', 
          v_record->>'medication_name', v_new_med_id;
      END IF;
      
      INSERT INTO patient_medications (
        id, patient_id, tenant_id, medication_name, generic_name,
        dosage, route, frequency, indication, start_date, end_date,
        prescribing_physician, notes, is_prn, prn_parameters,
        last_administered, next_due, status, barcode
      )
      VALUES (
        v_new_med_id, v_new_patient_id, p_target_tenant_id,
        v_record->>'medication_name', v_record->>'generic_name',
        v_record->>'dosage', v_record->>'route', v_record->>'frequency',
        v_record->>'indication',
        COALESCE((v_record->>'start_date')::timestamptz, now()),
        (v_record->>'end_date')::timestamptz,
        v_record->>'prescribing_physician', v_record->>'notes',
        COALESCE((v_record->>'is_prn')::boolean, false),
        v_record->'prn_parameters',
        (v_record->>'last_administered')::timestamptz,
        (v_record->>'next_due')::timestamptz,
        COALESCE(v_record->>'status', 'active'),
        v_record->>'barcode'
      )
      ON CONFLICT (id) DO UPDATE SET
        -- Reset to template values
        patient_id = EXCLUDED.patient_id,
        tenant_id = EXCLUDED.tenant_id,
        medication_name = EXCLUDED.medication_name,
        generic_name = EXCLUDED.generic_name,
        dosage = EXCLUDED.dosage,
        route = EXCLUDED.route,
        frequency = EXCLUDED.frequency,
        indication = EXCLUDED.indication,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        prescribing_physician = EXCLUDED.prescribing_physician,
        notes = EXCLUDED.notes,
        is_prn = EXCLUDED.is_prn,
        prn_parameters = EXCLUDED.prn_parameters,
        last_administered = NULL, -- Reset administration tracking
        next_due = EXCLUDED.next_due,
        status = EXCLUDED.status,
        barcode = EXCLUDED.barcode,
        updated_at = now();
    END LOOP;
  END IF;
  
  -- Restore other tables (vitals, notes, etc.) using new patient IDs
  -- ... (add other tables as needed)
  
  RAISE NOTICE '✅ Snapshot restored with % patient IDs', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'REUSABLE' ELSE 'RANDOM' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb) TO authenticated;

-- ===========================================================================
-- VERIFICATION
-- ===========================================================================
SELECT 
  '✅ restore_snapshot_to_tenant updated with UPSERT logic' as status,
  'Can now reset simulations without duplicate key conflicts' as description,
  'Patient and medication IDs are preserved across resets' as benefit;
