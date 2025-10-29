-- ===========================================================================
-- EMERGENCY: Restore medications and vitals to active simulation from template
-- ===========================================================================
-- USE THIS to fix a simulation that lost data from a bad reset
-- WITHOUT changing patient or medication IDs (keeps your barcodes valid!)
-- ===========================================================================

-- Step 1: Run the corrected reset_simulation function first
-- (Copy from 015_reset_simulation_update_in_place.sql or 016_fix_reset_simulation_expiry.sql)

-- Step 2: Then run this to restore data to your CURRENT active simulation
-- Replace 'YOUR_SIMULATION_ID' with your actual simulation ID

DO $$
DECLARE
  v_simulation_id uuid := '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid;  -- ⚠️ CHANGE THIS!
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_patient record;
  v_medication record;
  v_template_medication jsonb;
  v_existing_med_id uuid;
BEGIN
  RAISE NOTICE '🚨 EMERGENCY RESTORE starting...';
  
  -- Get simulation details
  SELECT sa.tenant_id, sa.template_id
  INTO v_tenant_id, v_template_id
  FROM simulation_active sa
  WHERE sa.id = v_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found!';
  END IF;
  
  RAISE NOTICE '✓ Found simulation - Tenant: %, Template: %', v_tenant_id, v_template_id;
  
  -- Get template snapshot
  SELECT snapshot_data INTO v_snapshot
  FROM simulation_templates
  WHERE id = v_template_id;
  
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template snapshot not found!';
  END IF;
  
  RAISE NOTICE '✓ Found template snapshot';
  
  -- ===========================================================================
  -- RESTORE MEDICATIONS (preserving existing IDs where possible)
  -- ===========================================================================
  
  RAISE NOTICE '💊 Restoring medications from template...';
  
  IF v_snapshot ? 'patient_medications' THEN
    -- For each medication in the template
    FOR v_medication IN 
      SELECT 
        m->>'patient_id' as patient_id,
        m->>'name' as name,
        m->>'dosage' as dosage,
        m->>'route' as route,
        m->>'frequency' as frequency,
        m->>'instructions' as instructions,
        m->>'prescribed_by' as prescribed_by,
        m->>'status' as status
      FROM jsonb_array_elements(v_snapshot->'patient_medications') m
    LOOP
      -- Find the actual patient UUID in the simulation
      SELECT p.id INTO v_patient
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
      AND p.patient_id = v_medication.patient_id;
      
      IF v_patient.id IS NOT NULL THEN
        -- Check if this medication already exists
        SELECT pm.id INTO v_existing_med_id
        FROM patient_medications pm
        WHERE pm.patient_id = v_patient.id
        AND pm.name = v_medication.name
        AND pm.tenant_id = v_tenant_id;
        
        IF v_existing_med_id IS NOT NULL THEN
          -- Update existing medication
          UPDATE patient_medications SET
            dosage = v_medication.dosage,
            route = v_medication.route,
            frequency = v_medication.frequency,
            instructions = v_medication.instructions,
            prescribed_by = v_medication.prescribed_by,
            status = COALESCE(v_medication.status, 'Active'),
            start_date = NOW(),
            updated_at = NOW()
          WHERE id = v_existing_med_id;
          
          RAISE NOTICE '  ✓ Updated existing: % (ID preserved)', v_medication.name;
        ELSE
          -- Insert new medication
          INSERT INTO patient_medications (
            patient_id,
            tenant_id,
            name,
            dosage,
            route,
            frequency,
            instructions,
            prescribed_by,
            status,
            start_date,
            created_at,
            updated_at
          ) VALUES (
            v_patient.id,
            v_tenant_id,
            v_medication.name,
            v_medication.dosage,
            v_medication.route,
            v_medication.frequency,
            v_medication.instructions,
            v_medication.prescribed_by,
            COALESCE(v_medication.status, 'Active'),
            NOW(),
            NOW(),
            NOW()
          );
          
          RAISE NOTICE '  ✓ Inserted new: %', v_medication.name;
        END IF;
      END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Medications restored: % total', 
      (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = v_tenant_id);
  ELSE
    RAISE WARNING '⚠️ No patient_medications in snapshot';
  END IF;
  
  -- ===========================================================================
  -- RESTORE VITALS
  -- ===========================================================================
  
  RAISE NOTICE '📊 Restoring vitals from template...';
  
  -- Clear existing vitals first
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  
  IF v_snapshot ? 'patient_vitals' THEN
    INSERT INTO patient_vitals (
      patient_id, tenant_id, temperature, blood_pressure_systolic,
      blood_pressure_diastolic, heart_rate, respiratory_rate,
      oxygen_saturation, recorded_at, oxygen_delivery
    )
    SELECT 
      p.id,
      v_tenant_id,
      (v->>'temperature')::numeric,
      (v->>'blood_pressure_systolic')::integer,
      (v->>'blood_pressure_diastolic')::integer,
      (v->>'heart_rate')::integer,
      (v->>'respiratory_rate')::integer,
      (v->>'oxygen_saturation')::numeric,
      COALESCE((v->>'recorded_at')::timestamptz, NOW()),
      COALESCE(v->>'oxygen_delivery', 'Room Air')
    FROM jsonb_array_elements(v_snapshot->'patient_vitals') v
    JOIN patients p ON p.patient_id = v->>'patient_id' AND p.tenant_id = v_tenant_id;
    
    RAISE NOTICE '✅ Vitals restored: % records', 
      (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = v_tenant_id);
  ELSE
    RAISE WARNING '⚠️ No patient_vitals in snapshot';
  END IF;
  
  -- ===========================================================================
  -- RESTORE NOTES (SKIPPED - schema unknown)
  -- ===========================================================================
  
  -- RAISE NOTICE '📝 Restoring notes from template...';
  -- Commented out until we verify patient_notes table structure
  /*
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  
  IF v_snapshot ? 'patient_notes' THEN
    INSERT INTO patient_notes (
      patient_id, tenant_id, note_type, content, created_by
    )
    SELECT 
      p.id,
      v_tenant_id,
      n->>'note_type',
      n->>'content',
      (n->>'created_by')::uuid
    FROM jsonb_array_elements(v_snapshot->'patient_notes') n
    JOIN patients p ON p.patient_id = n->>'patient_id' AND p.tenant_id = v_tenant_id;
    
    RAISE NOTICE '✅ Notes restored: % records', 
      (SELECT COUNT(*) FROM patient_notes WHERE tenant_id = v_tenant_id);
  END IF;
  */
  
  RAISE NOTICE 'ℹ️  Notes restore skipped (enable after verifying schema)';
  
  RAISE NOTICE '🎉 EMERGENCY RESTORE COMPLETE!';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  - Medications: %', (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '  - Vitals: %', (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = v_tenant_id);
  -- RAISE NOTICE '  - Notes: %', (SELECT COUNT(*) FROM patient_notes WHERE tenant_id = v_tenant_id);
  
END $$;

-- Verification query
SELECT 
  'Simulation Data Summary' as check_type,
  (SELECT COUNT(*) FROM patients WHERE tenant_id = (SELECT tenant_id FROM simulation_active WHERE id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid)) as patients,
  (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = (SELECT tenant_id FROM simulation_active WHERE id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid)) as medications,
  (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = (SELECT tenant_id FROM simulation_active WHERE id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid)) as vitals;
