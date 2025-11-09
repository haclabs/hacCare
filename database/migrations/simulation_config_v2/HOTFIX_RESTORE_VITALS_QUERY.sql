-- ============================================================================
-- HOTFIX: Fix patient_vitals dynamic query in restore_snapshot_to_tenant_v2
-- ============================================================================
-- 
-- ISSUE: Line 335 error - "query returned more than one row"
-- Root cause: The dynamic query builder for patient_vitals has subqueries
-- that aren't properly scoped, causing multiple row returns
--
-- SOLUTION: Simplify patient_vitals to static column list (known schema)
-- ============================================================================

-- Drop and recreate the function with fix
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant_v2(uuid, jsonb);

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant_v2(
  p_tenant_id uuid,
  p_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_record RECORD;
  v_record jsonb;
  v_new_id uuid;
  v_old_id text;
  v_mapped_id uuid;
  v_row_count int;
  v_total_restored int := 0;
  v_tables_restored int := 0;
  v_id_mappings jsonb := '{}'::jsonb;
BEGIN
  
  RAISE NOTICE 'Starting restore to tenant: %', p_tenant_id;
  
  -- ===========================================================================
  -- PHASE 1: Tables that REQUIRE ID mapping (medications, labs, wounds, etc.)
  -- ===========================================================================
  
  FOR v_table_record IN 
    SELECT * FROM simulation_table_config 
    WHERE enabled = true 
      AND requires_id_mapping = true
    ORDER BY delete_order DESC
  LOOP
    CONTINUE WHEN p_snapshot->v_table_record.table_name IS NULL;
    CONTINUE WHEN jsonb_array_length(p_snapshot->v_table_record.table_name) = 0;
    
    v_row_count := 0;
    RAISE NOTICE 'Restoring % (with ID mapping)...', v_table_record.table_name;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->v_table_record.table_name)
    LOOP
      BEGIN
        v_new_id := gen_random_uuid();
        v_old_id := v_record->>'id';
        
        CASE v_table_record.table_name
          -- PATIENTS
          WHEN 'patients' THEN
            INSERT INTO patients (
              id, patient_id, first_name, last_name, date_of_birth, gender,
              admission_date, discharge_date, status, allergies, code_status,
              isolation_precautions, fall_risk, pressure_ulcer_risk,
              medical_history, current_medications, tenant_id
            )
            VALUES (
              v_new_id,
              v_record->>'patient_id',
              v_record->>'first_name',
              v_record->>'last_name',
              (v_record->>'date_of_birth')::date,
              v_record->>'gender',
              (v_record->>'admission_date')::timestamptz,
              (v_record->>'discharge_date')::timestamptz,
              v_record->>'status',
              (v_record->>'allergies')::jsonb,
              v_record->>'code_status',
              (v_record->>'isolation_precautions')::jsonb,
              (v_record->>'fall_risk')::boolean,
              (v_record->>'pressure_ulcer_risk')::boolean,
              v_record->>'medical_history',
              (v_record->>'current_medications')::jsonb,
              p_tenant_id
            );
          
          -- PATIENT MEDICATIONS
          WHEN 'patient_medications' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO patient_medications (
              id, patient_id, medication_name, dosage, route, frequency,
              start_date, end_date, status, notes, tenant_id
            )
            VALUES (
              v_new_id,
              v_mapped_id,
              v_record->>'medication_name',
              v_record->>'dosage',
              v_record->>'route',
              v_record->>'frequency',
              (v_record->>'start_date')::timestamptz,
              (v_record->>'end_date')::timestamptz,
              v_record->>'status',
              v_record->>'notes',
              p_tenant_id
            );
          
          -- LAB PANELS
          WHEN 'lab_panels' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO lab_panels (
              id, patient_id, tenant_id, panel_time, source, status,
              ack_required, ack_at, ack_by, entered_by
            )
            VALUES (
              v_new_id,
              v_mapped_id,
              p_tenant_id,
              (v_record->>'panel_time')::timestamptz,
              v_record->>'source',
              (v_record->>'status')::lab_status,
              (v_record->>'ack_required')::boolean,
              (v_record->>'ack_at')::timestamptz,
              (v_record->>'ack_by')::uuid,
              (v_record->>'entered_by')::uuid
            );
          
          -- PATIENT WOUNDS
          WHEN 'patient_wounds' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO patient_wounds (
              id, patient_id, tenant_id, wound_location, wound_type,
              wound_stage, length_cm, width_cm, depth_cm, status,
              discovered_date, healed_date, notes
            )
            VALUES (
              v_new_id,
              v_mapped_id,
              p_tenant_id,
              v_record->>'wound_location',
              v_record->>'wound_type',
              v_record->>'wound_stage',
              (v_record->>'length_cm')::numeric,
              (v_record->>'width_cm')::numeric,
              (v_record->>'depth_cm')::numeric,
              v_record->>'status',
              (v_record->>'discovered_date')::timestamptz,
              (v_record->>'healed_date')::timestamptz,
              v_record->>'notes'
            );
          
          ELSE
            RAISE WARNING 'ID mapping table % not implemented', v_table_record.table_name;
            CONTINUE;
        END CASE;
        
        -- Store ID mapping for child tables
        v_id_mappings := jsonb_set(
          v_id_mappings,
          ARRAY[v_table_record.table_name, v_old_id],
          to_jsonb(v_new_id::text)
        );
        
        v_row_count := v_row_count + 1;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to restore record in %: % - %', 
          v_table_record.table_name, SQLSTATE, SQLERRM;
        CONTINUE;
      END;
    END LOOP;
    
    v_total_restored := v_total_restored + v_row_count;
    v_tables_restored := v_tables_restored + 1;
    RAISE NOTICE 'Restored %: % rows', v_table_record.table_name, v_row_count;
  END LOOP;
  
  -- ===========================================================================
  -- PHASE 2: Tables WITHOUT ID mapping (vitals, notes, lab_results, etc.)
  -- ===========================================================================
  
  FOR v_table_record IN 
    SELECT * FROM simulation_table_config 
    WHERE enabled = true 
      AND requires_id_mapping = false
    ORDER BY delete_order DESC
  LOOP
    CONTINUE WHEN p_snapshot->v_table_record.table_name IS NULL;
    CONTINUE WHEN jsonb_array_length(p_snapshot->v_table_record.table_name) = 0;
    
    v_row_count := 0;
    RAISE NOTICE 'Restoring % (no ID mapping)...', v_table_record.table_name;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->v_table_record.table_name)
    LOOP
      BEGIN
        
        CASE v_table_record.table_name
          -- PATIENT VITALS (FIXED - static column list)
          WHEN 'patient_vitals' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO patient_vitals (
              patient_id, tenant_id, recorded_at,
              heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
              respiratory_rate, temperature, o2_saturation, pain_level,
              blood_glucose, weight_kg, height_cm, bmi, recorded_by
            )
            VALUES (
              v_mapped_id,
              p_tenant_id,
              (v_record->>'recorded_at')::timestamptz,
              (v_record->>'heart_rate')::integer,
              (v_record->>'blood_pressure_systolic')::integer,
              (v_record->>'blood_pressure_diastolic')::integer,
              (v_record->>'respiratory_rate')::integer,
              (v_record->>'temperature')::numeric,
              (v_record->>'o2_saturation')::integer,
              (v_record->>'pain_level')::integer,
              (v_record->>'blood_glucose')::integer,
              (v_record->>'weight_kg')::numeric,
              (v_record->>'height_cm')::numeric,
              (v_record->>'bmi')::numeric,
              (v_record->>'recorded_by')::uuid
            );
          
          -- PATIENT NOTES
          WHEN 'patient_notes' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO patient_notes (patient_id, tenant_id, note_type, content, created_by)
            VALUES (
              v_mapped_id,
              p_tenant_id,
              v_record->>'note_type',
              v_record->>'content',
              (v_record->>'created_by')::uuid
            );
          
          -- LAB RESULTS (uses panel mapping)
          WHEN 'lab_results' THEN
            v_mapped_id := (v_id_mappings->'lab_panels'->>(v_record->>'panel_id'))::uuid;
            INSERT INTO lab_results (
              tenant_id, patient_id, panel_id, category, test_code, test_name,
              value, units, ref_low, ref_high, ref_operator, sex_ref,
              critical_low, critical_high, flag, entered_by, comments
            )
            VALUES (
              p_tenant_id,
              (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid,
              v_mapped_id,
              (v_record->>'category')::lab_category,
              v_record->>'test_code',
              v_record->>'test_name',
              (v_record->>'value')::numeric,
              v_record->>'units',
              (v_record->>'ref_low')::numeric,
              (v_record->>'ref_high')::numeric,
              (v_record->>'ref_operator')::ref_operator,
              (v_record->>'sex_ref')::jsonb,
              (v_record->>'critical_low')::numeric,
              (v_record->>'critical_high')::numeric,
              (v_record->>'flag')::lab_flag,
              (v_record->>'entered_by')::uuid,
              v_record->>'comments'
            );
          
          -- WOUND ASSESSMENTS (uses wound mapping)
          WHEN 'wound_assessments' THEN
            v_mapped_id := (v_id_mappings->'patient_wounds'->>(v_record->>'wound_id'))::uuid;
            INSERT INTO wound_assessments (
              wound_id, tenant_id, assessment_date, assessed_by,
              length_cm, width_cm, depth_cm, drainage_amount,
              drainage_type, wound_bed_appearance, periwound_condition,
              pain_level, infection_signs, treatment_provided, notes
            )
            VALUES (
              v_mapped_id,
              p_tenant_id,
              (v_record->>'assessment_date')::timestamptz,
              (v_record->>'assessed_by')::uuid,
              (v_record->>'length_cm')::numeric,
              (v_record->>'width_cm')::numeric,
              (v_record->>'depth_cm')::numeric,
              v_record->>'drainage_amount',
              v_record->>'drainage_type',
              v_record->>'wound_bed_appearance',
              v_record->>'periwound_condition',
              (v_record->>'pain_level')::integer,
              (v_record->>'infection_signs')::jsonb,
              v_record->>'treatment_provided',
              v_record->>'notes'
            );
          
          ELSE
            RAISE WARNING 'Table % not implemented in Phase 2', v_table_record.table_name;
            CONTINUE;
        END CASE;
        
        v_row_count := v_row_count + 1;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to restore record in %: % - %', 
          v_table_record.table_name, SQLSTATE, SQLERRM;
        CONTINUE;
      END;
    END LOOP;
    
    v_total_restored := v_total_restored + v_row_count;
    v_tables_restored := v_tables_restored + 1;
    RAISE NOTICE 'Restored %: % rows', v_table_record.table_name, v_row_count;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'tables_restored', v_tables_restored,
    'total_rows', v_total_restored,
    'message', 'Restored ' || v_total_restored || ' rows across ' || v_tables_restored || ' tables'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Restore failed: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================

/*

ROOT CAUSE:
- Dynamic query builder for patient_vitals used nested SELECT subqueries
- These subqueries weren't scalar - returned multiple rows
- PostgreSQL error: "query returned more than one row"

SOLUTION:
- Changed patient_vitals from dynamic to static column list
- All columns explicitly listed
- No more subquery issues
- Same pattern as other tables (patient_notes, lab_results, etc.)

TRADE-OFF:
- Less flexible if patient_vitals schema changes
- But much more reliable and debuggable
- Follows same pattern as all other tables in function

*/
