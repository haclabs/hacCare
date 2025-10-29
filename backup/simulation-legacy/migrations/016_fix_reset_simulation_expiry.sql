-- ===========================================================================
-- FIX: Reset Simulation Expiry Issue
-- ===========================================================================
-- Problem: When resetting a simulation, starts_at was updated but status was
--          not set to 'running', causing simulations to remain expired.
-- Solution: Update reset_simulation to set status = 'running' and starts_at,
--           which triggers the calculate_simulation_ends_at trigger to
--           recalculate ends_at based on duration_minutes from the template.
-- ===========================================================================
-- URGENT FIX: Simulations showing as expired after reset
-- ===========================================================================

DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE;

CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_session_number integer;
  v_simulation_config jsonb;
  v_result json;
  v_patient record;
  v_medication record;
  v_template_patient jsonb;
  v_template_medication jsonb;
BEGIN
  -- Get simulation details
  SELECT 
    sa.tenant_id, 
    sa.template_id,
    t.simulation_config
  INTO 
    v_tenant_id, 
    v_template_id,
    v_simulation_config
  FROM simulation_active sa
  JOIN tenants t ON t.id = sa.tenant_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Get session number if available
  v_session_number := (v_simulation_config->>'session_number')::integer;
  
  RAISE NOTICE '🔄 Resetting simulation (UPDATE in place) - Session: %', 
    COALESCE(v_session_number::text, 'N/A');
  
  -- Get template snapshot
  SELECT snapshot_data INTO v_snapshot
  FROM simulation_templates
  WHERE id = v_template_id;
  
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template snapshot not found';
  END IF;
  
  -- ===========================================================================
  -- STEP 1: Delete all related records (NOT patients or medications YET)
  -- ===========================================================================
  
  RAISE NOTICE '📝 Clearing related records...';
  
  -- Clear medication administration records (BCMA) - if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_medication_administrations') THEN
    DELETE FROM bcma_medication_administrations 
    WHERE medication_id IN (
      SELECT id FROM patient_medications WHERE tenant_id = v_tenant_id
    );
    RAISE NOTICE '  ✓ Cleared BCMA medication administration records';
  END IF;
  
  -- Clear patient-related data (but NOT vitals and notes yet - we'll handle those after medications)
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  
  -- Delete from tables without tenant_id (use patient_id join)
  DELETE FROM patient_admission_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_advanced_directives WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM bowel_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_wounds WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM handover_notes WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  RAISE NOTICE '✅ Related records cleared';
  
  -- ===========================================================================
  -- STEP 2: Update patients back to template defaults (PRESERVE IDs!)
  -- ===========================================================================
  
  RAISE NOTICE '🔄 Updating patients to template defaults...';
  
  -- For each existing patient in the simulation
  FOR v_patient IN 
    SELECT * FROM patients WHERE tenant_id = v_tenant_id
  LOOP
    -- Find matching template patient by patient_id
    SELECT p INTO v_template_patient
    FROM jsonb_array_elements(v_snapshot->'patients') p
    WHERE p->>'patient_id' = v_patient.patient_id;
    
    IF v_template_patient IS NOT NULL THEN
      -- Update patient record with template values (keep same UUID id)
      UPDATE patients SET
        first_name = v_template_patient->>'first_name',
        last_name = v_template_patient->>'last_name',
        date_of_birth = (v_template_patient->>'date_of_birth')::date,
        gender = v_template_patient->>'gender',
        room_number = v_template_patient->>'room_number',
        bed_number = v_template_patient->>'bed_number',
        admission_date = COALESCE((v_template_patient->>'admission_date')::timestamptz, NOW()),
        diagnosis = v_template_patient->>'diagnosis',
        condition = v_template_patient->>'condition',
        allergies = COALESCE((v_template_patient->>'allergies')::jsonb, '[]'::jsonb),
        code_status = v_template_patient->>'code_status',
        isolation_precautions = v_template_patient->>'isolation_precautions',
        attending_physician = v_template_patient->>'attending_physician',
        assigned_nurse = v_template_patient->>'assigned_nurse',
        emergency_contact = v_template_patient->>'emergency_contact',
        insurance_info = v_template_patient->>'insurance_info',
        updated_at = NOW()
      WHERE id = v_patient.id;
      
      RAISE NOTICE '  ✓ Updated patient: % % (ID preserved: %)', 
        v_template_patient->>'first_name',
        v_template_patient->>'last_name',
        v_patient.patient_id;
    ELSE
      RAISE WARNING '  ⚠ No template found for patient_id: %', v_patient.patient_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Patients updated';
  
  -- ===========================================================================
  -- STEP 3: Update medications back to template defaults (PRESERVE IDs!)
  -- ===========================================================================
  
  RAISE NOTICE '🔄 Updating medications to template defaults...';
  
  -- For each existing medication in the simulation
  FOR v_medication IN 
    SELECT pm.*, p.patient_id as patient_patient_id
    FROM patient_medications pm
    JOIN patients p ON pm.patient_id = p.id
    WHERE pm.tenant_id = v_tenant_id
  LOOP
    -- Find matching template medication by patient_id and medication name
    SELECT m INTO v_template_medication
    FROM jsonb_array_elements(v_snapshot->'patient_medications') m
    WHERE m->>'patient_id' = v_medication.patient_patient_id
    AND m->>'name' = v_medication.name;
    
    IF v_template_medication IS NOT NULL THEN
      -- Update medication record with template values (keep same UUID id)
      UPDATE patient_medications SET
        name = v_template_medication->>'name',
        dosage = v_template_medication->>'dosage',
        route = v_template_medication->>'route',
        frequency = v_template_medication->>'frequency',
        instructions = v_template_medication->>'instructions',
        start_date = COALESCE((v_template_medication->>'start_date')::timestamptz, NOW()),
        end_date = (v_template_medication->>'end_date')::timestamptz,
        status = COALESCE(v_template_medication->>'status', 'active'),
        prescribed_by = v_template_medication->>'prescribed_by',
        updated_at = NOW()
      WHERE id = v_medication.id;
      
      RAISE NOTICE '  ✓ Updated medication: % (ID preserved)', 
        v_template_medication->>'name';
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Medications updated';
  
  -- ===========================================================================
  -- STEP 3.5: Delete medications that are NOT in the template
  -- ===========================================================================
  
  RAISE NOTICE '🔄 Removing medications not in template...';
  
  -- Check if template has medications
  IF v_snapshot ? 'patient_medications' THEN
    IF jsonb_array_length(v_snapshot->'patient_medications') > 0 THEN
      -- Keep only medications that exist in template (match by name and patient)
      DELETE FROM patient_medications pm
      WHERE pm.tenant_id = v_tenant_id
      AND pm.id NOT IN (
        SELECT pm2.id
        FROM patient_medications pm2
        JOIN patients p ON pm2.patient_id = p.id
        WHERE pm2.tenant_id = v_tenant_id
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_snapshot->'patient_medications') m
          WHERE m->>'patient_id' = p.patient_id
          AND m->>'name' = pm2.name
        )
      );
    ELSE
      -- Empty medications array in template, delete all
      DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
    END IF;
  ELSE
    -- No medications key in template, delete all
    DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  END IF;
  
  RAISE NOTICE '✅ Extra medications removed';
  
  -- ===========================================================================
  -- STEP 4: Restore initial vitals, notes, and other template data
  -- ===========================================================================
  
  RAISE NOTICE '🔄 Restoring initial vitals and notes...';
  
  -- Clear ALL existing vitals and notes (they will be restored from template)
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  
  -- Restore initial vitals from snapshot
  IF v_snapshot ? 'patient_vitals' THEN
    INSERT INTO patient_vitals (
      patient_id, tenant_id, temperature, heart_rate, blood_pressure_systolic,
      blood_pressure_diastolic, respiratory_rate, oxygen_saturation, pain_level,
      recorded_at, recorded_by, notes, created_at, updated_at
    )
    SELECT 
      p.id,  -- Use current patient UUID
      v_tenant_id,
      (v->>'temperature')::numeric,
      (v->>'heart_rate')::integer,
      (v->>'blood_pressure_systolic')::integer,
      (v->>'blood_pressure_diastolic')::integer,
      (v->>'respiratory_rate')::integer,
      (v->>'oxygen_saturation')::numeric,
      (v->>'pain_level')::integer,
      COALESCE((v->>'recorded_at')::timestamptz, NOW()),
      v->>'recorded_by',
      v->>'notes',
      NOW(),
      NOW()
    FROM jsonb_array_elements(v_snapshot->'patient_vitals') v
    JOIN patients p ON p.patient_id = v->>'patient_id' AND p.tenant_id = v_tenant_id;
  END IF;
  
  -- Restore initial notes from snapshot
  IF v_snapshot ? 'patient_notes' THEN
    INSERT INTO patient_notes (
      patient_id, tenant_id, note_type, content, created_by,
      created_at, updated_at
    )
    SELECT 
      p.id,  -- Use current patient UUID
      v_tenant_id,
      n->>'note_type',
      n->>'content',
      n->>'created_by',
      NOW(),
      NOW()
    FROM jsonb_array_elements(v_snapshot->'patient_notes') n
    JOIN patients p ON p.patient_id = n->>'patient_id' AND p.tenant_id = v_tenant_id;
  END IF;
  
  RAISE NOTICE '✅ Initial vitals and notes restored';
  
  -- ===========================================================================
  -- CRITICAL FIX: Reset simulation timestamps and status to 'running'
  -- This triggers the calculate_simulation_ends_at trigger to recalculate
  -- ends_at based on starts_at + duration_minutes, fixing the expiry issue
  -- ===========================================================================
  UPDATE simulation_active 
  SET 
    starts_at = NOW(),
    status = 'running',
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  RAISE NOTICE '✅ Simulation timestamps and status reset (starts_at updated, ends_at will be recalculated by trigger)';
  
  -- Build result summary
  SELECT json_build_object(
    'success', true,
    'message', 'Simulation reset successfully (IDs preserved, timer restarted)',
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'patients_updated', (SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant_id),
    'medications_updated', (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = v_tenant_id),
    'vitals_restored', (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = v_tenant_id),
    'reset_at', NOW()
  ) INTO v_result;
  
  RAISE NOTICE '✅ Simulation reset complete with proper timer restart!';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO authenticated;

COMMENT ON FUNCTION reset_simulation IS 
'Reset simulation to template defaults while preserving patient and medication IDs.
Updates records in place, resets timer by setting starts_at and status to running,
which triggers automatic recalculation of ends_at. Labels remain valid across resets.';

-- Verification output
SELECT '✅ reset_simulation FIXED - Simulations will no longer show as expired after reset!' as status,
       '⏱️ Timer will restart with proper countdown from template duration' as fix,
       '🏷️ Patient and medication IDs preserved for barcode compatibility' as note;
