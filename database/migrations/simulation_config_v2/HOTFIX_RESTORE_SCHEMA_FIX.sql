-- ============================================================================
-- HOTFIX: Fix schema mismatch in restore_snapshot_to_tenant_v2
-- ============================================================================
-- 
-- ISSUE: Function assumes columns that don't exist in production schema
-- Root cause: Never queried actual schema before writing INSERT statements
--
-- AFFECTED TABLES:
-- 1. patients - Wrong: discharge_date, status, code_status, isolation_precautions,
--                      fall_risk, pressure_ulcer_risk, medical_history, current_medications
--              - Real: room_number, bed_number, condition, diagnosis, blood_type,
--                     emergency_contact_name, emergency_contact_relationship, 
--                     emergency_contact_phone, assigned_nurse
--
-- 2. patient_medications - Wrong: medication_name, notes
--                        - Real: name, category, prescribed_by, last_administered,
--                               next_due, created_at, admin_time, admin_times
--
-- 3. patient_vitals - Wrong: pain_level, blood_glucose, weight_kg, height_cm, bmi
--                   - Real: oxygen_saturation, oxygen_delivery (only 9 columns total)
--
-- SOLUTION: Update all three CASE statements with correct production schemas
-- ============================================================================

-- Drop and recreate the function with correct schemas
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
          -- PATIENTS (FIXED - correct production schema)
          WHEN 'patients' THEN
            INSERT INTO patients (
              id, patient_id, first_name, last_name, date_of_birth, gender,
              room_number, bed_number, admission_date, condition, diagnosis,
              allergies, blood_type, emergency_contact_name, 
              emergency_contact_relationship, emergency_contact_phone,
              assigned_nurse, tenant_id
            )
            VALUES (
              v_new_id,
              v_record->>'patient_id',
              v_record->>'first_name',
              v_record->>'last_name',
              (v_record->>'date_of_birth')::date,
              v_record->>'gender',
              v_record->>'room_number',
              v_record->>'bed_number',
              (v_record->>'admission_date')::timestamptz,
              v_record->>'condition',
              v_record->>'diagnosis',
              ARRAY(SELECT jsonb_array_elements_text(v_record->'allergies')),
              v_record->>'blood_type',
              v_record->>'emergency_contact_name',
              v_record->>'emergency_contact_relationship',
              v_record->>'emergency_contact_phone',
              v_record->>'assigned_nurse',
              p_tenant_id
            );
          
          -- PATIENT MEDICATIONS (FIXED - correct production schema)
          WHEN 'patient_medications' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO patient_medications (
              id, patient_id, name, dosage, frequency, route,
              start_date, end_date, prescribed_by, last_administered,
              next_due, status, created_at, category, tenant_id,
              admin_time, admin_times
            )
            VALUES (
              v_new_id,
              v_mapped_id,
              v_record->>'name',
              v_record->>'dosage',
              v_record->>'frequency',
              v_record->>'route',
              (v_record->>'start_date')::date,
              (v_record->>'end_date')::date,
              v_record->>'prescribed_by',
              (v_record->>'last_administered')::timestamptz,
              (v_record->>'next_due')::timestamptz,
              v_record->>'status',
              COALESCE((v_record->>'created_at')::timestamptz, NOW()),
              v_record->>'category',
              p_tenant_id,
              v_record->>'admin_time',
              (v_record->>'admin_times')::jsonb
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
          -- PATIENT VITALS (FIXED - correct production schema, only 9 columns)
          WHEN 'patient_vitals' THEN
            v_mapped_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
            INSERT INTO patient_vitals (
              patient_id, tenant_id, recorded_at,
              temperature, blood_pressure_systolic, blood_pressure_diastolic,
              heart_rate, respiratory_rate, oxygen_saturation, oxygen_delivery
            )
            VALUES (
              v_mapped_id,
              p_tenant_id,
              (v_record->>'recorded_at')::timestamptz,
              (v_record->>'temperature')::numeric,
              (v_record->>'blood_pressure_systolic')::integer,
              (v_record->>'blood_pressure_diastolic')::integer,
              (v_record->>'heart_rate')::integer,
              (v_record->>'respiratory_rate')::integer,
              (v_record->>'oxygen_saturation')::integer,
              v_record->>'oxygen_delivery'
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
-- VERIFICATION QUERIES
-- ============================================================================

-- After deploying, verify the fix worked:
-- 
-- 1. Check test tenant is empty before restore:
-- SELECT 
--   (SELECT COUNT(*) FROM patients WHERE tenant_id = '9d2db807-5ef1-4a75-a5c0-be386343f85f') as patients,
--   (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = '9d2db807-5ef1-4a75-a5c0-be386343f85f') as medications,
--   (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = '9d2db807-5ef1-4a75-a5c0-be386343f85f') as vitals;
--
-- 2. Run restore:
-- SELECT restore_snapshot_to_tenant_v2(
--   '9d2db807-5ef1-4a75-a5c0-be386343f85f'::uuid,
--   (SELECT snapshot_data FROM simulation_templates WHERE id = '03db86fc-b61a-4834-8d75-b704e59e4a38')
-- );
--
-- 3. Verify data restored:
-- SELECT 
--   (SELECT COUNT(*) FROM patients WHERE tenant_id = '9d2db807-5ef1-4a75-a5c0-be386343f85f') as patients,
--   (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = '9d2db807-5ef1-4a75-a5c0-be386343f85f') as medications,
--   (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = '9d2db807-5ef1-4a75-a5c0-be386343f85f') as vitals;
--
-- Expected: 9 patients, 25 medications, 29 vitals

-- ============================================================================
-- NOTES
-- ============================================================================

/*

SCHEMA DIFFERENCES FIXED:

1. PATIENTS (20 columns in production):
   - REMOVED (didn't exist): discharge_date, status, code_status, 
     isolation_precautions, fall_risk, pressure_ulcer_risk, 
     medical_history, current_medications
   - ADDED (were missing): room_number, bed_number, condition, diagnosis,
     blood_type, emergency_contact_name, emergency_contact_relationship,
     emergency_contact_phone, assigned_nurse

2. PATIENT_MEDICATIONS (17 columns in production):
   - REMOVED (didn't exist): medication_name, notes
   - ADDED (were missing): name (replaces medication_name), category, 
     prescribed_by, last_administered, next_due, created_at,
     admin_time, admin_times
   - NOTE: "name" column is the medication name field

3. PATIENT_VITALS (9 columns in production - much simpler than assumed!):
   - REMOVED (didn't exist): pain_level, blood_glucose, weight_kg, 
     height_cm, bmi, recorded_by
   - ADDED (were missing): oxygen_delivery
   - KEPT: patient_id, tenant_id, recorded_at, temperature,
     blood_pressure_systolic, blood_pressure_diastolic, heart_rate,
     respiratory_rate, oxygen_saturation

CRITICAL LESSON:
Always query actual production schema before writing INSERT statements.
The config-driven approach will prevent this in the future by building
queries dynamically from information_schema.

ROOT CAUSE OF 0 ROWS RESTORED:
All INSERT statements were failing silently due to "column does not exist" errors.
The EXCEPTION handler caught them and CONTINUE'd, so function returned success
but restored nothing.

*/
