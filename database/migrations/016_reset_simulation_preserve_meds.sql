-- =====================================================
-- RESET SIMULATION FOR NEXT SESSION (PRESERVE MEDS/IDS)
-- =====================================================
-- PURPOSE: Reset simulation between student sessions
-- PRESERVES: Patient IDs, Medication IDs, all medications
-- CLEARS: Student work (vitals, notes, BCMA records)
-- RESETS: Patient data to template defaults
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
BEGIN
  -- Log the reset request
  RAISE NOTICE '🔄 Starting session reset for simulation: %', p_simulation_id;

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

  -- Initialize stats
  v_stats := jsonb_build_object(
    'vitals_cleared', 0,
    'notes_cleared', 0,
    'bcma_cleared', 0,
    'images_cleared', 0,
    'bowel_records_cleared', 0,
    'diabetic_records_cleared', 0,
    'patients_reset', 0,
    'medications_preserved', 0
  );

  -- =====================================================
  -- STEP 1: CLEAR STUDENT WORK (NOT IN TEMPLATE)
  -- =====================================================
  
  -- Clear all vitals (students will record new ones)
  WITH deleted AS (
    DELETE FROM patient_vitals 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_stats->>'vitals_cleared' FROM deleted;
  RAISE NOTICE '🗑️  Cleared % vitals records', v_stats->>'vitals_cleared';

  -- Clear all notes (keep only template notes)
  WITH deleted AS (
    DELETE FROM patient_notes 
    WHERE tenant_id = v_tenant_id
    AND note_type NOT IN ('admission', 'template')  -- Keep template notes
    RETURNING 1
  )
  SELECT count(*) INTO v_stats->>'notes_cleared' FROM deleted;
  RAISE NOTICE '🗑️  Cleared % note records', v_stats->>'notes_cleared';

  -- Clear BCMA records (medication administration history)
  WITH deleted AS (
    DELETE FROM bcma_records 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_stats->>'bcma_cleared' FROM deleted;
  RAISE NOTICE '🗑️  Cleared % BCMA records', v_stats->>'bcma_cleared';

  -- Clear patient images
  WITH deleted AS (
    DELETE FROM patient_images 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_stats->>'images_cleared' FROM deleted;
  RAISE NOTICE '🗑️  Cleared % patient images', v_stats->>'images_cleared';

  -- Clear bowel records
  WITH deleted AS (
    DELETE FROM patient_bowel_records 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_stats->>'bowel_records_cleared' FROM deleted;
  RAISE NOTICE '🗑️  Cleared % bowel records', v_stats->>'bowel_records_cleared';

  -- Clear diabetic records
  WITH deleted AS (
    DELETE FROM patient_diabetic_records 
    WHERE tenant_id = v_tenant_id
    RETURNING 1
  )
  SELECT count(*) INTO v_stats->>'diabetic_records_cleared' FROM deleted;
  RAISE NOTICE '🗑️  Cleared % diabetic records', v_stats->>'diabetic_records_cleared';

  -- =====================================================
  -- STEP 2: RESET PATIENT DATA TO TEMPLATE DEFAULTS
  -- (PRESERVE PATIENT IDs!)
  -- =====================================================
  
  IF v_snapshot ? 'patients' THEN
    -- Update existing patients with template data
    WITH template_patients AS (
      SELECT 
        (p->>'patient_id')::text as patient_id,
        p->>'first_name' as first_name,
        p->>'last_name' as last_name,
        (p->>'date_of_birth')::date as date_of_birth,
        p->>'gender' as gender,
        p->>'room_number' as room_number,
        p->>'bed_number' as bed_number,
        p->>'diagnosis' as diagnosis,
        p->>'condition' as condition,
        COALESCE((p->>'allergies')::jsonb, '[]'::jsonb) as allergies,
        p->>'code_status' as code_status,
        COALESCE((p->>'advance_directives')::jsonb, '[]'::jsonb) as advance_directives,
        p->>'admission_date' as admission_date,
        p->>'attending_physician' as attending_physician
      FROM jsonb_array_elements(v_snapshot->'patients') as p
    ),
    updated AS (
      UPDATE patients p
      SET
        first_name = tp.first_name,
        last_name = tp.last_name,
        date_of_birth = tp.date_of_birth,
        gender = tp.gender,
        room_number = tp.room_number,
        bed_number = tp.bed_number,
        diagnosis = tp.diagnosis,
        condition = tp.condition,
        allergies = tp.allergies,
        code_status = tp.code_status,
        advance_directives = tp.advance_directives,
        admission_date = COALESCE(tp.admission_date::timestamptz, now()),
        attending_physician = tp.attending_physician,
        updated_at = now()
      FROM template_patients tp
      WHERE p.tenant_id = v_tenant_id
      AND p.patient_id = tp.patient_id
      RETURNING p.id
    )
    SELECT count(*) INTO v_stats->>'patients_reset' FROM updated;
    RAISE NOTICE '🔄 Reset % patients to template defaults (IDs preserved)', v_stats->>'patients_reset';
  END IF;

  -- =====================================================
  -- STEP 3: COUNT MEDICATIONS (DON'T DELETE THEM!)
  -- =====================================================
  
  SELECT count(*) INTO v_stats->>'medications_preserved'
  FROM patient_medications
  WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE '💊 Preserved % medications (IDs unchanged)', v_stats->>'medications_preserved';

  -- =====================================================
  -- STEP 4: UPDATE SIMULATION METADATA
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
  -- STEP 5: RETURN RESULTS
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

  RAISE NOTICE '🎉 Session reset complete!';
  RAISE NOTICE 'Stats: %', v_stats;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'simulation_id', p_simulation_id
  );
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION reset_simulation_for_next_session(uuid) TO authenticated;

-- =====================================================
-- USAGE EXAMPLE
-- =====================================================

COMMENT ON FUNCTION reset_simulation_for_next_session IS 
'Reset simulation between student sessions. 
PRESERVES: Patient IDs, Medication IDs, all medications added during simulation
CLEARS: Vitals, notes, BCMA records, images (student work)
RESETS: Patient demographics/diagnosis to template defaults

Use this for classroom scenarios where you:
- Print medication labels once (IDs must stay the same)
- Add medications during the simulation
- Reset between student groups
- Run simulations for multiple days/weeks

Example:
SELECT reset_simulation_for_next_session(''your-simulation-id-here'');
';

-- =====================================================
-- ADD SESSION TRACKING COLUMNS (if not exists)
-- =====================================================

ALTER TABLE simulation_active 
  ADD COLUMN IF NOT EXISTS session_number integer DEFAULT 1;

ALTER TABLE simulation_active 
  ADD COLUMN IF NOT EXISTS last_reset_at timestamptz;

ALTER TABLE simulation_active 
  ADD COLUMN IF NOT EXISTS reset_count integer DEFAULT 0;

COMMENT ON COLUMN simulation_active.session_number IS 
  'Current session number (incremented on each reset)';

COMMENT ON COLUMN simulation_active.last_reset_at IS 
  'Timestamp of last session reset';

COMMENT ON COLUMN simulation_active.reset_count IS 
  'Total number of times this simulation has been reset';
