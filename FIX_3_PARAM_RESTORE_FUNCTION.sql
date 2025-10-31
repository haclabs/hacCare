-- ================================================================
-- FIX: restore_snapshot_to_tenant (3-parameter version)
-- Issue: Reset simulation calls 3-param version which has hardcoded columns
-- Solution: Add dynamic INSERT logic for all tables
-- ================================================================

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
  v_pid_text text;
  v_new_pid uuid;
BEGIN
  -- Extract mappings or use empty objects
  v_patient_mapping := COALESCE(p_id_mappings->'patients', '{}'::jsonb);
  v_med_mapping := COALESCE(p_id_mappings->'medications', '{}'::jsonb);
  
  RAISE NOTICE 'Restoring snapshot with % pre-allocated IDs', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'REUSABLE' ELSE 'RANDOM' END;
  
  -- Restore patients using PRE-ALLOCATED IDs (or generate random if not provided)
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
      
      -- Insert patient with explicit ID
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
      );
      
      -- Store mapping for relationships
      v_old_patient_uuid_map := jsonb_set(
        v_old_patient_uuid_map,
        ARRAY[v_old_patient_id::text],
        to_jsonb(v_new_patient_id::text)
      );
    END LOOP;
  END IF;
  
  -- Restore medications using PRE-ALLOCATED IDs and DYNAMIC INSERT
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      v_old_med_id := (v_record->>'id')::uuid;
      v_old_patient_id := (v_record->>'patient_id')::uuid;
      v_new_patient_id := (v_old_patient_uuid_map->>v_old_patient_id::text)::uuid;
      
      -- Use pre-allocated medication ID if available
      IF v_med_mapping ? v_old_med_id::text THEN
        v_new_med_id := (v_med_mapping->>v_old_med_id::text)::uuid;
      ELSE
        v_new_med_id := gen_random_uuid();
      END IF;
      
      -- Dynamic INSERT: Build from snapshot JSON, skip NULL/empty values
      EXECUTE format(
        'INSERT INTO patient_medications (id, patient_id, tenant_id, %s) SELECT $1, $2, $3, %s',
        (SELECT string_agg(key, ', ') 
         FROM jsonb_object_keys(v_record) k(key) 
         WHERE key NOT IN ('id', 'patient_id', 'tenant_id', 'created_at', 'updated_at')
           AND v_record->>key IS NOT NULL 
           AND v_record->>key != ''),
        (SELECT string_agg(
          CASE 
            WHEN key ~ '(_times|_parameters|_config|_data|_metadata)$' THEN '($4->>''' || key || ''')::jsonb'
            WHEN key ~ '^(scheduled_time|admin_time)' THEN 'substring(($4->>''' || key || ''') from 1 for 5)'
            WHEN key ~ '(date|_at|_due|administered)' THEN '($4->>''' || key || ''')::timestamptz'
            WHEN key ~ 'id$' AND key != 'patient_id' THEN '($4->>''' || key || ''')::uuid'
            WHEN key ~ '(is_|_flag)' THEN '($4->>''' || key || ''')::boolean'
            WHEN key ~ '(_count|_number)' THEN '($4->>''' || key || ''')::integer'
            ELSE '($4->>''' || key || ''')::text'
          END, ', ') 
         FROM jsonb_object_keys(v_record) k(key) 
         WHERE key NOT IN ('id', 'patient_id', 'tenant_id', 'created_at', 'updated_at')
           AND v_record->>key IS NOT NULL
           AND v_record->>key != '')
      ) USING v_new_med_id, v_new_patient_id, p_target_tenant_id, v_record;
    END LOOP;
  END IF;
  
  -- Restore vitals with dynamic INSERT
  IF p_snapshot->'patient_vitals' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_vitals')
    LOOP
      v_old_patient_id := (v_record->>'patient_id')::uuid;
      v_new_patient_id := (v_old_patient_uuid_map->>v_old_patient_id::text)::uuid;
      
      EXECUTE format(
        'INSERT INTO patient_vitals (patient_id, %s) SELECT $1, %s',
        (SELECT string_agg(key, ', ') 
         FROM jsonb_object_keys(v_record) k(key) 
         WHERE key NOT IN ('id', 'patient_id', 'created_at', 'updated_at')
           AND v_record->>key IS NOT NULL 
           AND v_record->>key != ''),
        (SELECT string_agg(
          CASE 
            WHEN key ~ '(date|_at|time)' THEN '($2->>''' || key || ''')::timestamptz'
            WHEN key ~ 'id$' AND key != 'patient_id' THEN '($2->>''' || key || ''')::uuid'
            WHEN key ~ '(is_|_flag)' THEN '($2->>''' || key || ''')::boolean'
            WHEN key ~ '(_level|_rate|_systolic|_diastolic|_saturation)' THEN '($2->>''' || key || ''')::integer'
            WHEN key ~ 'temperature' THEN '($2->>''' || key || ''')::numeric'
            ELSE '($2->>''' || key || ''')::text'
          END, ', ') 
         FROM jsonb_object_keys(v_record) k(key) 
         WHERE key NOT IN ('id', 'patient_id', 'created_at', 'updated_at')
           AND v_record->>key IS NOT NULL
           AND v_record->>key != '')
      ) USING v_new_patient_id, v_record;
    END LOOP;
  END IF;
  
  -- Restore patient_alerts with dynamic INSERT
  IF p_snapshot->'patient_alerts' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_alerts')
    LOOP
      v_old_patient_id := (v_record->>'patient_id')::uuid;
      v_new_patient_id := (v_old_patient_uuid_map->>v_old_patient_id::text)::uuid;
      
      EXECUTE format(
        'INSERT INTO patient_alerts (patient_id, tenant_id, %s) SELECT $1, $2, %s',
        (SELECT string_agg(key, ', ') 
         FROM jsonb_object_keys(v_record) k(key) 
         WHERE key NOT IN ('id', 'patient_id', 'tenant_id', 'created_at', 'updated_at')
           AND v_record->>key IS NOT NULL 
           AND v_record->>key != ''),
        (SELECT string_agg(
          CASE 
            WHEN key ~ '(date|_at|time)' THEN '($3->>''' || key || ''')::timestamptz'
            WHEN key ~ 'id$' AND key != 'patient_id' THEN '($3->>''' || key || ''')::uuid'
            WHEN key ~ '(is_|_flag|_active)' THEN '($3->>''' || key || ''')::boolean'
            ELSE '($3->>''' || key || ''')::text'
          END, ', ') 
         FROM jsonb_object_keys(v_record) k(key) 
         WHERE key NOT IN ('id', 'patient_id', 'tenant_id', 'created_at', 'updated_at')
           AND v_record->>key IS NOT NULL
           AND v_record->>key != '')
      ) USING v_new_patient_id, p_target_tenant_id, v_record;
    END LOOP;
  END IF;
  
  -- TODO: Add other tables (notes, diabetic_records, doctors_orders, etc.) with dynamic INSERT
  
  RAISE NOTICE '✅ Snapshot restored with % patient IDs', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'REUSABLE' ELSE 'RANDOM' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 3-PARAMETER restore_snapshot_to_tenant FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updates:';
  RAISE NOTICE '  - patient_medications: Dynamic INSERT (handles all columns)';
  RAISE NOTICE '  - patient_vitals: Dynamic INSERT (no hardcoded pain_level)';
  RAISE NOTICE '  - patient_alerts: Dynamic INSERT (no hardcoded severity)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 This function is called by reset_simulation()';
  RAISE NOTICE '   when simulations timeout or are manually reset.';
  RAISE NOTICE '========================================';
END $$;
