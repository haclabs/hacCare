-- ===========================================================================
-- REUSABLE SIMULATION LABELS: Pre-Allocate IDs for Multiple Session Runs
-- ===========================================================================
-- Purpose: Allow pre-printing labels with barcodes that can be reused
--          across multiple simulation runs without regenerating IDs
-- 
-- Use Case: 
--   - Print medication labels once with barcodes
--   - Run simulation with Session 1 IDs
--   - Reset simulation
--   - Run again with SAME Session 1 IDs (labels still match!)
--   - Run simultaneous Class B with Session 2 IDs (different labels)
-- ===========================================================================

-- Step 1: Add column to store multiple reusable ID sets
ALTER TABLE simulation_templates 
ADD COLUMN IF NOT EXISTS simulation_id_sets jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN simulation_templates.simulation_id_sets IS 
'Pre-generated ID sets for multiple simulation sessions. Each set contains patient and medication IDs that remain constant across resets.';

-- Step 2: Function to generate multiple reusable ID sets
DROP FUNCTION IF EXISTS generate_simulation_id_sets(uuid, integer, text[]) CASCADE;

CREATE OR REPLACE FUNCTION generate_simulation_id_sets(
  p_template_id uuid,
  p_session_count integer,
  p_session_names text[] DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_id_sets jsonb := '[]'::jsonb;
  v_session_data jsonb;
  v_patient_mappings jsonb;
  v_med_mappings jsonb;
  v_tenant_id uuid;
  v_patient_record record;
  v_med_record record;
  v_new_patient_uuid uuid;
  v_new_med_uuid uuid;
  i integer;
  v_session_name text;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  RAISE NOTICE '🎯 Generating % reusable ID sets for template %', p_session_count, p_template_id;
  
  -- Generate ID sets for each session
  FOR i IN 1..p_session_count LOOP
    v_patient_mappings := '{}'::jsonb;
    v_med_mappings := '{}'::jsonb;
    
    -- Determine session name
    IF p_session_names IS NOT NULL AND i <= array_length(p_session_names, 1) THEN
      v_session_name := p_session_names[i];
    ELSE
      v_session_name := 'Session ' || i;
    END IF;
    
    RAISE NOTICE '📋 Session %: %', i, v_session_name;
    
    -- Generate unique IDs for patients (these will be reused across resets)
    FOR v_patient_record IN 
      SELECT id, patient_id, first_name, last_name 
      FROM patients 
      WHERE tenant_id = v_tenant_id
      ORDER BY patient_id
    LOOP
      v_new_patient_uuid := gen_random_uuid();
      v_patient_mappings := jsonb_set(
        v_patient_mappings,
        ARRAY[v_patient_record.id::text],
        to_jsonb(v_new_patient_uuid::text)
      );
      
      RAISE NOTICE '  Patient: % % (%) -> %', 
        v_patient_record.first_name, 
        v_patient_record.last_name,
        v_patient_record.patient_id,
        v_new_patient_uuid;
    END LOOP;
    
    -- Generate unique IDs for medications (these will be reused across resets)
    FOR v_med_record IN 
      SELECT pm.id, pm.medication_name, p.patient_id
      FROM patient_medications pm 
      JOIN patients p ON p.id = pm.patient_id 
      WHERE p.tenant_id = v_tenant_id
      ORDER BY p.patient_id, pm.medication_name
    LOOP
      v_new_med_uuid := gen_random_uuid();
      v_med_mappings := jsonb_set(
        v_med_mappings,
        ARRAY[v_med_record.id::text],
        to_jsonb(v_new_med_uuid::text)
      );
      
      RAISE NOTICE '  Medication: % (Patient: %) -> %', 
        v_med_record.medication_name,
        v_med_record.patient_id,
        v_new_med_uuid;
    END LOOP;
    
    -- Build session data
    v_session_data := jsonb_build_object(
      'session_number', i,
      'session_name', v_session_name,
      'created_at', now(),
      'patient_count', (SELECT count(*) FROM patients WHERE tenant_id = v_tenant_id),
      'medication_count', (SELECT count(*) FROM patient_medications pm JOIN patients p ON p.id = pm.patient_id WHERE p.tenant_id = v_tenant_id),
      'id_mappings', jsonb_build_object(
        'patients', v_patient_mappings,
        'medications', v_med_mappings
      )
    );
    
    -- Add to sets array
    v_id_sets := v_id_sets || jsonb_build_array(v_session_data);
  END LOOP;
  
  -- Store all sets in template
  UPDATE simulation_templates
  SET 
    simulation_id_sets = v_id_sets,
    updated_at = now()
  WHERE id = p_template_id;
  
  RAISE NOTICE '✅ Generated % reusable ID sets', p_session_count;
  
  RETURN json_build_object(
    'success', true,
    'session_count', p_session_count,
    'sessions', v_id_sets,
    'message', 'ID sets generated successfully. You can now print labels that will work across multiple simulation runs.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Function to get label printing data for a specific session
DROP FUNCTION IF EXISTS get_simulation_label_data(uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION get_simulation_label_data(
  p_template_id uuid,
  p_session_number integer
)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_session_data jsonb;
  v_id_mappings jsonb;
  v_label_data json;
BEGIN
  -- Get template info
  SELECT tenant_id, simulation_id_sets->>(p_session_number - 1)
  INTO v_tenant_id, v_session_data
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_session_data IS NULL THEN
    RAISE EXCEPTION 'Session % not found for template %. Generate ID sets first using generate_simulation_id_sets()', 
      p_session_number, p_template_id;
  END IF;
  
  v_id_mappings := v_session_data->'id_mappings';
  
  -- Build label data with pre-allocated IDs
  SELECT json_build_object(
    'session_name', v_session_data->>'session_name',
    'session_number', p_session_number,
    'template_id', p_template_id,
    'patients', (
      SELECT json_agg(json_build_object(
        'simulation_uuid', (v_id_mappings->'patients'->>p.id::text)::uuid,
        'patient_id', p.patient_id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'full_name', p.first_name || ' ' || p.last_name,
        'date_of_birth', p.date_of_birth,
        'blood_type', p.blood_type,
        'allergies', p.allergies,
        'room_number', p.room_number,
        'bed_number', p.bed_number,
        'barcode', 'SIM-P-' || (v_id_mappings->'patients'->>p.id::text)
      ) ORDER BY p.patient_id)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'medications', (
      SELECT json_agg(json_build_object(
        'simulation_uuid', (v_id_mappings->'medications'->>pm.id::text)::uuid,
        'medication_name', pm.medication_name,
        'generic_name', pm.generic_name,
        'dosage', pm.dosage,
        'route', pm.route,
        'frequency', pm.frequency,
        'patient_id', p.patient_id,
        'patient_name', p.first_name || ' ' || p.last_name,
        'room_number', p.room_number,
        'bed_number', p.bed_number,
        'barcode', 'SIM-M-' || (v_id_mappings->'medications'->>pm.id::text)
      ) ORDER BY p.patient_id, pm.medication_name)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    )
  ) INTO v_label_data;
  
  RETURN v_label_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update restore_snapshot_to_tenant to use pre-allocated IDs
-- This ensures reset keeps the same IDs so labels remain valid
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
  
  -- Restore medications using PRE-ALLOCATED IDs
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
      );
    END LOOP;
  END IF;
  
  -- Restore other tables (vitals, notes, etc.) using new patient IDs
  -- ... (add other tables as needed)
  
  RAISE NOTICE '✅ Snapshot restored with % patient IDs', 
    CASE WHEN p_id_mappings IS NOT NULL THEN 'REUSABLE' ELSE 'RANDOM' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_simulation_id_sets(uuid, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_simulation_label_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb) TO authenticated;

-- ===========================================================================
-- USAGE EXAMPLES
-- ===========================================================================

/*

-- 1. Generate 5 reusable ID sets for a template
SELECT generate_simulation_id_sets(
  'your-template-id'::uuid,
  5,  -- 5 different sessions
  ARRAY[
    'Class A - Morning Session',
    'Class A - Afternoon Session', 
    'Class B - Morning Session',
    'Class B - Afternoon Session',
    'Class C - Session'
  ]
);

-- 2. Get label data for Session 1 (for printing)
SELECT get_simulation_label_data(
  'your-template-id'::uuid,
  1  -- Session 1
);

-- 3. Launch simulation with Session 1 IDs
SELECT launch_simulation(
  'your-template-id'::uuid,
  'Class A Morning',
  60,
  ARRAY['nurse-user-id'::uuid],
  ARRAY['student'],
  1  -- Use Session 1 IDs (matches printed labels)
);

-- 4. Reset simulation - it will use the SAME Session 1 IDs!
SELECT reset_simulation('simulation-id'::uuid);

-- 5. Run again - labels still match because IDs haven't changed!

*/

SELECT '✅ Reusable simulation label system installed!' as status,
       '🎯 Now you can print labels once and reuse them across multiple simulation runs!' as benefit;
