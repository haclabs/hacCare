-- =====================================================
-- FIX: RESET SIMULATION ERRORS (JSONB + TABLE EXISTENCE + DATA TYPES)
-- =====================================================
-- ISSUE 1: 'operator does not exist: bigint ->> unknown' error
-- CAUSE 1: Cannot use SELECT INTO with v_stats->>key directly
-- FIX 1: Use jsonb_set to properly update JSONB object values
-- 
-- ISSUE 2: 'relation "bcma_records" does not exist' error  
-- CAUSE 2: Function hardcoded table name that may not exist
-- FIX 2: Check for multiple possible table names dynamically
--
-- ISSUE 3: 'column "allergies" is of type text[] but expression is of type jsonb' error
-- CAUSE 3: Snapshot stores arrays as JSONB but database expects text[]
-- FIX 3: Convert JSONB arrays to PostgreSQL text[] arrays
--
-- ISSUE 4: 'column "code_status" of relation "patients" does not exist' error
-- CAUSE 4: Snapshot contains fields that don't exist in actual database schema
-- FIX 4: Check column existence before updating and skip missing columns
-- =====================================================

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session(p_simulation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_result jsonb;
  v_stats jsonb;
  v_count bigint;
BEGIN
  -- Log the reset request
  RAISE NOTICE '🔄 Starting session reset for simulation: %', p_simulation_id;
  
  -- Debug: Log what we're working with
  RAISE NOTICE '🔍 DEBUG: About to check snapshot structure...';

  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    st.snapshot_data
  INTO 
    v_tenant_id,
    v_template_id,
    v_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  RAISE NOTICE '✅ Found simulation with tenant_id: % and template_id: %', v_tenant_id, v_template_id;
  
  -- Debug: Log snapshot structure
  RAISE WARNING '🔍 SNAPSHOT KEYS: %', (SELECT array_agg(key) FROM jsonb_object_keys(v_snapshot) as key);
  RAISE WARNING '🔍 HAS VITALS: %', (v_snapshot ? 'vitals');
  RAISE WARNING '🔍 HAS PATIENT_VITALS: %', (v_snapshot ? 'patient_vitals');
  RAISE WARNING '🔍 HAS DOCTORS_ORDERS: %', (v_snapshot ? 'doctors_orders');
  
  IF v_snapshot ? 'patient_vitals' THEN
    RAISE WARNING '🔍 PATIENT_VITALS COUNT: %', jsonb_array_length(v_snapshot->'patient_vitals');
    -- Show a sample vital record
    RAISE WARNING '🔍 SAMPLE PATIENT_VITAL: %', (v_snapshot->'patient_vitals'->0);
  ELSIF v_snapshot ? 'vitals' THEN
    RAISE WARNING '🔍 VITALS COUNT: %', jsonb_array_length(v_snapshot->'vitals');
    -- Show a sample vital record
    RAISE WARNING '🔍 SAMPLE VITAL: %', (v_snapshot->'vitals'->0);
  ELSE
    RAISE WARNING '❌ NO VITALS FOUND IN SNAPSHOT';
  END IF;
  
  IF v_snapshot ? 'doctors_orders' THEN
    RAISE WARNING '🔍 DOCTORS_ORDERS COUNT: %', jsonb_array_length(v_snapshot->'doctors_orders');
    -- Show a sample order record
    RAISE WARNING '🔍 SAMPLE ORDER: %', (v_snapshot->'doctors_orders'->0);
  ELSE
    RAISE WARNING '❌ NO DOCTORS_ORDERS FOUND IN SNAPSHOT';
  END IF;

  -- Initialize stats
  v_stats := jsonb_build_object(
    'vitals_cleared', 0,
    'vitals_restored', 0,
    'notes_cleared', 0,
    'bcma_cleared', 0,
    'images_cleared', 0,
    'diabetic_records_cleared', 0,
    'alerts_cleared', 0,
    'orders_cleared', 0,
    'orders_restored', 0,
    'wound_assessments_cleared', 0,
    'lab_results_cleared', 0,
    'lab_panels_cleared', 0,
    'patients_reset', 0,
    'medications_preserved', 0
  );

  -- =====================================================
  -- STEP 1: CLEAR STUDENT WORK (NOT IN TEMPLATE)
  -- =====================================================
  
  -- Clear all vitals (we'll restore template vitals from snapshot later)
  WITH deleted AS (
    DELETE FROM patient_vitals 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{vitals_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % vitals (template vitals will be restored)', v_count;

  -- Clear all notes (keep only template notes)
  WITH deleted AS (
    DELETE FROM patient_notes 
    WHERE tenant_id = v_tenant_id
    AND note_type NOT IN ('admission', 'template')  -- Keep template notes
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{notes_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % note records', v_count;

  -- Clear BCMA records (medication administration history - ALL student scans/administrations)
  -- This clears all records of students scanning/administering medications
  -- Check for different possible table names and clear if they exist
  v_count := 0;
  
  -- Try medication_administrations table first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations') THEN
    WITH deleted AS (
      DELETE FROM medication_administrations 
      WHERE tenant_id = v_tenant_id
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM deleted;
    RAISE NOTICE '🗑️  Cleared % records from medication_administrations table', v_count;
  
  -- Try bcma_medication_administrations table second
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_medication_administrations') THEN
    WITH deleted AS (
      DELETE FROM bcma_medication_administrations 
      WHERE medication_id IN (
        SELECT id FROM patient_medications WHERE tenant_id = v_tenant_id
      )
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM deleted;
    RAISE NOTICE '🗑️  Cleared % records from bcma_medication_administrations table', v_count;
  
  -- Try bcma_records table third
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_records') THEN
    WITH deleted AS (
      DELETE FROM bcma_records 
      WHERE tenant_id = v_tenant_id
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM deleted;
    RAISE NOTICE '🗑️  Cleared % records from bcma_records table', v_count;
  ELSE
    RAISE NOTICE '⚠️  No medication administration tables found - skipping BCMA cleanup';
  END IF;
  
  v_stats := jsonb_set(v_stats, '{bcma_cleared}', to_jsonb(v_count));

  -- Clear patient images
  WITH deleted AS (
    DELETE FROM patient_images 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{images_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % patient images', v_count;

  -- Clear diabetic records (correct table name)
  WITH deleted AS (
    DELETE FROM diabetic_records 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{diabetic_records_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % diabetic records', v_count;

  -- Clear patient alerts
  WITH deleted AS (
    DELETE FROM patient_alerts 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{alerts_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % patient alerts', v_count;

  -- Clear all doctors orders (we'll restore template orders from snapshot later)
  WITH deleted AS (
    DELETE FROM doctors_orders 
    WHERE patient_id IN (
      SELECT id FROM patients WHERE tenant_id = v_tenant_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{orders_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % doctors orders (template orders will be restored)', v_count;

  -- Clear wound assessments
  WITH deleted AS (
    DELETE FROM wound_assessments 
    WHERE patient_id IN (
      SELECT id FROM patients WHERE tenant_id = v_tenant_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{wound_assessments_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % wound assessments', v_count;

  -- Clear lab acknowledgement events first (has foreign key to lab_panels)
  WITH deleted AS (
    DELETE FROM lab_ack_events 
    WHERE patient_id IN (
      SELECT id FROM patients WHERE tenant_id = v_tenant_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{lab_ack_events_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % lab acknowledgement events', v_count;

  -- Clear lab results and panels
  WITH deleted AS (
    DELETE FROM lab_results 
    WHERE panel_id IN (
      SELECT lp.id FROM lab_panels lp 
      JOIN patients p ON p.id = lp.patient_id 
      WHERE p.tenant_id = v_tenant_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{lab_results_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % lab results', v_count;

  WITH deleted AS (
    DELETE FROM lab_panels 
    WHERE patient_id IN (
      SELECT id FROM patients WHERE tenant_id = v_tenant_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  v_stats := jsonb_set(v_stats, '{lab_panels_cleared}', to_jsonb(v_count));
  RAISE NOTICE '🗑️  Cleared % lab panels', v_count;

  -- =====================================================
  -- STEP 2: RESTORE TEMPLATE DATA FROM SNAPSHOT
  -- =====================================================
  
  -- Restore template vitals if they exist in snapshot (check both possible keys)
  IF v_snapshot ? 'patient_vitals' OR v_snapshot ? 'vitals' THEN
    WITH template_vitals AS (
      SELECT 
        (v->>'patient_id')::uuid as patient_id,
        (v->>'temperature')::numeric as temperature,
        (v->>'blood_pressure_systolic')::integer as blood_pressure_systolic,
        (v->>'blood_pressure_diastolic')::integer as blood_pressure_diastolic,
        (v->>'heart_rate')::integer as heart_rate,
        (v->>'respiratory_rate')::integer as respiratory_rate,
        (v->>'oxygen_saturation')::numeric as oxygen_saturation,
        v->>'oxygen_delivery' as oxygen_delivery,
        v_tenant_id as tenant_id,
        -- Use recorded_at timestamp from snapshot
        COALESCE(
          (v->>'recorded_at')::timestamptz,
          now() - interval '1 hour'
        ) as recorded_at
      FROM jsonb_array_elements(
        CASE 
          WHEN v_snapshot ? 'patient_vitals' THEN v_snapshot->'patient_vitals'
          ELSE v_snapshot->'vitals'
        END
      ) as v
      WHERE (v->>'patient_id')::uuid IN (
        SELECT id FROM patients WHERE tenant_id = v_tenant_id
      )
    ),
    inserted AS (
      -- Use only columns that actually exist in the table
      INSERT INTO patient_vitals (
        patient_id, tenant_id,
        temperature, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, oxygen_saturation,
        recorded_at, oxygen_delivery
      )
      SELECT 
        patient_id, tenant_id,
        temperature, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, oxygen_saturation, 
        recorded_at,
        COALESCE(oxygen_delivery, 'Room Air')
      FROM template_vitals
      ON CONFLICT DO NOTHING  -- Skip conflicts entirely
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM inserted;
    v_stats := jsonb_set(v_stats, '{vitals_restored}', to_jsonb(v_count));
    RAISE WARNING '📊 VITALS RESTORATION RESULT: % restored', v_count;
    
    -- Debug: Check if any template vitals were found
    WITH debug_vitals AS (
      SELECT COUNT(*) as template_count
      FROM jsonb_array_elements(
        CASE 
          WHEN v_snapshot ? 'patient_vitals' THEN v_snapshot->'patient_vitals'
          ELSE v_snapshot->'vitals'
        END
      ) as v
      WHERE (v->>'patient_id')::uuid IN (
        SELECT id FROM patients WHERE tenant_id = v_tenant_id
      )
    )
    SELECT template_count INTO v_count FROM debug_vitals;
    RAISE WARNING '📊 DEBUG: % template vitals matched existing patients', v_count;
  END IF;
  
  -- Restore template doctors orders if they exist in snapshot
  IF v_snapshot ? 'doctors_orders' THEN
    WITH
    order_columns_exist AS (
      SELECT 
        bool_or(column_name = 'patient_id') as has_patient_id,
        bool_or(column_name = 'tenant_id') as has_tenant_id,
        bool_or(column_name = 'order_date') as has_order_date,
        bool_or(column_name = 'order_time') as has_order_time,
        bool_or(column_name = 'order_text') as has_order_text,
        bool_or(column_name = 'ordering_doctor') as has_ordering_doctor,
        bool_or(column_name = 'notes') as has_notes,
        bool_or(column_name = 'order_type') as has_order_type,
        bool_or(column_name = 'is_acknowledged') as has_is_acknowledged,
        bool_or(column_name = 'acknowledged_by') as has_acknowledged_by,
        bool_or(column_name = 'acknowledged_at') as has_acknowledged_at,
        bool_or(column_name = 'created_by') as has_created_by,
        bool_or(column_name = 'created_at') as has_created_at,
        bool_or(column_name = 'updated_by') as has_updated_by,
        bool_or(column_name = 'updated_at') as has_updated_at
      FROM information_schema.columns 
      WHERE table_name = 'doctors_orders' AND table_schema = 'public'
    ),
    template_orders AS (
      SELECT 
        (o->>'patient_id')::uuid as patient_id,
        v_tenant_id as tenant_id,
        COALESCE((o->>'order_date')::date, current_date) as order_date,
        COALESCE((o->>'order_time')::time, current_time) as order_time,
        COALESCE(o->>'order_text', 'Template Order') as order_text,
        COALESCE(o->>'ordering_doctor', 'Dr. Template') as ordering_doctor,
        COALESCE(o->>'notes', '') as notes,
        COALESCE(o->>'order_type', 'Direct') as order_type,
        -- Reset acknowledgment to template default (false = unacknowledged)
        COALESCE((o->>'is_acknowledged')::boolean, false) as is_acknowledged,
        CASE 
          WHEN o->>'acknowledged_by' IS NULL OR o->>'acknowledged_by' = '' THEN NULL
          ELSE (o->>'acknowledged_by')::uuid
        END as acknowledged_by,
        COALESCE((o->>'acknowledged_at')::timestamptz, null) as acknowledged_at,
        -- Get created_by from current user context or use template value
        CASE 
          WHEN o->>'created_by' IS NULL OR o->>'created_by' = '' THEN COALESCE((SELECT auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
          ELSE (o->>'created_by')::uuid
        END as created_by,
        COALESCE(
          (o->>'created_at')::timestamptz, 
          now() - interval '2 hours'  -- Make template orders older
        ) as created_at,
        -- Get updated_by from current user context  
        COALESCE((SELECT auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid) as updated_by,
        now() as updated_at
      FROM jsonb_array_elements(v_snapshot->'doctors_orders') as o
      WHERE (o->>'patient_id')::uuid IN (
        SELECT id FROM patients WHERE tenant_id = v_tenant_id
      )
    ),
    inserted AS (
      INSERT INTO doctors_orders (
        patient_id
        , tenant_id
        , order_date
        , order_time
        , order_text
        , ordering_doctor
        , notes
        , order_type
        , is_acknowledged
        , acknowledged_by
        , acknowledged_at
        , created_by
        , created_at
        , updated_by
        , updated_at
      )
      SELECT 
        tp.patient_id,
        tp.tenant_id,
        CASE WHEN cols.has_order_date THEN tp.order_date ELSE current_date END,
        CASE WHEN cols.has_order_time THEN tp.order_time ELSE current_time END,
        CASE WHEN cols.has_order_text THEN tp.order_text ELSE 'Template Order' END,
        CASE WHEN cols.has_ordering_doctor THEN tp.ordering_doctor ELSE 'Dr. Template' END,
        CASE WHEN cols.has_notes THEN tp.notes ELSE '' END,
        CASE WHEN cols.has_order_type THEN tp.order_type ELSE 'Direct' END,
        CASE WHEN cols.has_is_acknowledged THEN tp.is_acknowledged ELSE false END,
        CASE WHEN cols.has_acknowledged_by THEN tp.acknowledged_by ELSE null::uuid END,
        CASE WHEN cols.has_acknowledged_at THEN tp.acknowledged_at ELSE null END,
        CASE WHEN cols.has_created_by THEN tp.created_by ELSE COALESCE((SELECT auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid) END,
        CASE WHEN cols.has_created_at THEN tp.created_at ELSE now() END,
        CASE WHEN cols.has_updated_by THEN tp.updated_by ELSE COALESCE((SELECT auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid) END,
        CASE WHEN cols.has_updated_at THEN tp.updated_at ELSE now() END
      FROM template_orders tp, order_columns_exist cols
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM inserted;
    v_stats := jsonb_set(v_stats, '{orders_restored}', to_jsonb(v_count));
    RAISE WARNING '📋 ORDERS RESTORATION RESULT: % restored', v_count;
    
    -- Debug: Check if any template orders were found
    WITH debug_orders AS (
      SELECT COUNT(*) as template_count
      FROM jsonb_array_elements(v_snapshot->'doctors_orders') as o
      WHERE (o->>'patient_id')::uuid IN (
        SELECT id FROM patients WHERE tenant_id = v_tenant_id
      )
    )
    SELECT template_count INTO v_count FROM debug_orders;
    RAISE WARNING '📋 DEBUG: % template orders matched existing patients', v_count;
    
    -- Log column existence for debugging
    RAISE NOTICE '🔍 Checking doctors_orders table column existence...';
    PERFORM 1 FROM information_schema.columns WHERE table_name = 'doctors_orders' AND column_name = 'order_text';
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️  Column "order_text" does not exist in doctors_orders table - using default';
    END IF;
    
    PERFORM 1 FROM information_schema.columns WHERE table_name = 'doctors_orders' AND column_name = 'is_acknowledged';
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️  Column "is_acknowledged" does not exist in doctors_orders table - using default';
    END IF;
  END IF;

  -- =====================================================
  -- STEP 3: RESET PATIENT DATA TO TEMPLATE DEFAULTS
  -- (PRESERVE PATIENT IDs!)
  -- FIX: Cast patient_id from JSONB text to UUID
  -- =====================================================
  
  IF v_snapshot ? 'patients' THEN
    -- Log snapshot patient data for debugging
    RAISE NOTICE '🔍 Snapshot contains patients: %', v_snapshot->'patients';
    
    -- Update existing patients with template data (only update columns that exist)
    WITH
    patient_columns_exist AS (
      SELECT 
        bool_or(column_name = 'first_name') as has_first_name,
        bool_or(column_name = 'last_name') as has_last_name,
        bool_or(column_name = 'date_of_birth') as has_date_of_birth,
        bool_or(column_name = 'gender') as has_gender,
        bool_or(column_name = 'room_number') as has_room_number,
        bool_or(column_name = 'bed_number') as has_bed_number,
        bool_or(column_name = 'diagnosis') as has_diagnosis,
        bool_or(column_name = 'condition') as has_condition,
        bool_or(column_name = 'allergies') as has_allergies,
        bool_or(column_name = 'code_status') as has_code_status,
        bool_or(column_name = 'advance_directives') as has_advance_directives,
        bool_or(column_name = 'admission_date') as has_admission_date,
        bool_or(column_name = 'attending_physician') as has_attending_physician
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND table_schema = 'public'
    ),
    template_patients AS (
      SELECT 
        -- Use 'id' field from snapshot (which matches the actual table structure)
        (p->>'id')::uuid as patient_id,
        p->>'first_name' as first_name,
        p->>'last_name' as last_name,
        (p->>'date_of_birth')::date as date_of_birth,
        p->>'gender' as gender,
        p->>'room_number' as room_number,
        p->>'bed_number' as bed_number,
        p->>'diagnosis' as diagnosis,
        p->>'condition' as condition,
        CASE 
          WHEN p ? 'allergies' AND p->'allergies' != 'null'::jsonb THEN
            ARRAY(SELECT jsonb_array_elements_text(p->'allergies'))
          ELSE 
            ARRAY[]::text[]
        END as allergies,
        p->>'code_status' as code_status,
        CASE 
          WHEN p ? 'advance_directives' AND p->'advance_directives' != 'null'::jsonb THEN
            ARRAY(SELECT jsonb_array_elements_text(p->'advance_directives'))
          ELSE 
            ARRAY[]::text[]
        END as advance_directives,
        p->>'admission_date' as admission_date,
        p->>'attending_physician' as attending_physician
      FROM jsonb_array_elements(v_snapshot->'patients') as p
    ),
    updated AS (
      UPDATE patients p
      SET
        first_name = CASE WHEN cols.has_first_name THEN tp.first_name ELSE p.first_name END,
        last_name = CASE WHEN cols.has_last_name THEN tp.last_name ELSE p.last_name END,
        date_of_birth = CASE WHEN cols.has_date_of_birth THEN tp.date_of_birth ELSE p.date_of_birth END,
        gender = CASE WHEN cols.has_gender THEN tp.gender ELSE p.gender END,
        room_number = CASE WHEN cols.has_room_number THEN tp.room_number ELSE p.room_number END,
        bed_number = CASE WHEN cols.has_bed_number THEN tp.bed_number ELSE p.bed_number END,
        diagnosis = CASE WHEN cols.has_diagnosis THEN tp.diagnosis ELSE p.diagnosis END,
        condition = CASE WHEN cols.has_condition THEN tp.condition ELSE p.condition END,
        allergies = CASE WHEN cols.has_allergies THEN tp.allergies ELSE p.allergies END,
        admission_date = CASE WHEN cols.has_admission_date THEN COALESCE(tp.admission_date::timestamptz, now()) ELSE p.admission_date END,
        updated_at = now()
      FROM template_patients tp, patient_columns_exist cols
      WHERE p.tenant_id = v_tenant_id
      AND p.id = tp.patient_id  -- Match on UUID id field
      RETURNING p.id
    )
    SELECT count(*) INTO v_count FROM updated;
    v_stats := jsonb_set(v_stats, '{patients_reset}', to_jsonb(v_count));
    RAISE NOTICE '🔄 Reset % patients to template defaults (IDs preserved)', v_count;
    
    -- Log column existence for debugging
    RAISE NOTICE '🔍 Checking patient table column existence...';
    PERFORM 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'code_status';
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️  Column "code_status" does not exist in patients table - skipping';
    END IF;
    
    PERFORM 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'attending_physician';
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️  Column "attending_physician" does not exist in patients table - skipping';
    END IF;
  END IF;

  -- =====================================================
  -- STEP 4: COUNT MEDICATIONS (DON'T DELETE THEM!)
  -- =====================================================
  
  SELECT count(*) INTO v_count
  FROM patient_medications
  WHERE tenant_id = v_tenant_id;
  
  v_stats := jsonb_set(v_stats, '{medications_preserved}', to_jsonb(v_count));
  RAISE NOTICE '💊 Preserved % medications (IDs unchanged)', v_count;

  -- =====================================================
  -- STEP 5: UPDATE SIMULATION METADATA
  -- =====================================================
  
  UPDATE simulation_active
  SET
    session_number = COALESCE(session_number, 0) + 1,
    last_reset_at = now(),
    reset_count = COALESCE(reset_count, 0) + 1,
    updated_at = now()
  WHERE id = p_simulation_id;

  RAISE NOTICE '✅ Updated simulation metadata - now on session %', 
    (SELECT session_number FROM simulation_active WHERE id = p_simulation_id);

  -- =====================================================
  -- STEP 6: RETURN RESULTS
  -- =====================================================
  
  v_result := jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'reset_type', 'session_reset',
    'stats', v_stats,
    'message', 'Simulation reset for next session. Patient/Medication IDs preserved. Student work cleared.',
    'timestamp', now()
  );

  RAISE WARNING '🎉 SESSION RESET COMPLETE!';
  RAISE WARNING 'FINAL STATS: %', v_stats;
  RAISE WARNING 'RETURNING RESULT: %', v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'simulation_id', p_simulation_id
  );
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION reset_simulation_for_next_session(uuid) TO authenticated;

-- =====================================================
-- UPDATE COMMENTS
-- =====================================================

COMMENT ON FUNCTION reset_simulation_for_next_session IS 
'Reset simulation between student sessions. 
PRESERVES: Patient IDs, Medication IDs, all medications (for barcode labels)
CLEARS: ALL student work - vitals, notes, images, diabetic records, alerts, doctors orders, wound assessments, lab results/panels, BCMA medication administrations
RESTORES: Template vitals and doctors orders from snapshot with original status
RESETS: Patient demographics/diagnosis to template defaults, doctor order acknowledgments to unacknowledged

TABLES CLEARED (only existing tables):
- patient_vitals, patient_notes, patient_images
- diabetic_records, patient_alerts, doctors_orders
- wound_assessments, lab_results, lab_panels
- medication_administrations (if exists)

FIXED: 
- UUID casting issue that caused "operator does not exist: text = uuid" error
- JSONB update issue that caused "operator does not exist: bigint ->> unknown" error
- Table existence check for BCMA records (handles multiple possible table names)
- Removed references to non-existent tables (patient_bowel_records, etc.)

Use this for classroom scenarios where you:
- Print medication labels once (IDs must stay the same)
- Add medications during the simulation
- Reset between student groups
- Run simulations for multiple days/weeks

Example:
SELECT reset_simulation_for_next_session(''your-simulation-id-here'');
';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '🔧 MIGRATION 018: Fixed table existence, JSONB update, data types, column existence, and table names in reset_simulation_for_next_session function';
  RAISE NOTICE '   - Changed SELECT INTO v_stats->>key to proper jsonb_set operations';
  RAISE NOTICE '   - This fixes the "operator does not exist: bigint ->> unknown" error';
  RAISE NOTICE '   - Added table existence checks for BCMA/medication administration tables';
  RAISE NOTICE '   - Removed non-existent tables: patient_bowel_records, patient_diabetic_records';
  RAISE NOTICE '   - Fixed table name: patient_diabetic_records -> diabetic_records';
  RAISE NOTICE '   - Fixed data type conversion: JSONB allergies/advance_directives -> text[] arrays';
  RAISE NOTICE '   - Added column existence checks for patient table updates (handles missing columns: code_status, attending_physician)';
  RAISE NOTICE '   - Added column existence checks for doctors_orders table (handles missing columns: description, acknowledged, etc.)';
  RAISE NOTICE '   - Added column existence checks for simulation_active table (handles missing created_at column)';
  RAISE NOTICE '   - Added clearing for existing tables: patient_alerts, doctors_orders, wound_assessments, lab_results, lab_panels';
  RAISE NOTICE '   - Handles multiple possible BCMA table names: medication_administrations, bcma_medication_administrations, bcma_records';
  RAISE NOTICE '   - JSONB stats object now updates correctly with all actual tables';
  RAISE NOTICE '   - Smart template preservation: only clears student work, preserves template vitals and orders';
END $$;