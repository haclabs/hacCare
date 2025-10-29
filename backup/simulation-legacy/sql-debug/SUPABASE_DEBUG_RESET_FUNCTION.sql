-- DEPLOY THIS TARGETED DEBUG VERSION TO FIND THE EXACT ERROR

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session_v2(p_simulation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_tenant_id UUID;
  v_snapshot JSONB;
  v_table_name TEXT;
  v_record JSONB;
  v_total_cleared INTEGER := 0;
  v_total_restored INTEGER := 0;
  v_count INTEGER;
  v_stats JSONB := '{}';
  
  -- For vitals cyclical distribution
  v_simulation_patients UUID[];
BEGIN
  RAISE NOTICE '🚀 Starting smart session reset for simulation %', p_simulation_id;

  -- Step 1: Get simulation metadata
  BEGIN
    SELECT template_id, tenant_id INTO v_template_id, v_tenant_id
    FROM simulation_active
    WHERE id = p_simulation_id
    LIMIT 1; -- Force single row
    
    RAISE NOTICE '✅ Step 1 SUCCESS: Found template % tenant %', v_template_id, v_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 1 FAILED: ' || SQLERRM,
      'detail', SQLSTATE,
      'simulation_id', p_simulation_id
    );
  END;

  IF v_template_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No template associated with simulation'
    );
  END IF;

  -- Step 2: Get template snapshot (this might be the culprit)
  BEGIN
    -- First, let's check what's in the snapshots table
    SELECT COUNT(*) INTO v_count 
    FROM simulation_template_snapshots 
    WHERE template_id = v_template_id;
    
    RAISE NOTICE '✅ Step 2A SUCCESS: Found % snapshot records for template %', v_count, v_template_id;
    
    -- Now try the aggregation
    SELECT jsonb_object_agg(table_name, records) INTO v_snapshot
    FROM (
      SELECT 
        table_name,
        jsonb_agg(data ORDER BY created_at) as records
      FROM simulation_template_snapshots
      WHERE template_id = v_template_id
      GROUP BY table_name
    ) grouped_records;
    
    RAISE NOTICE '✅ Step 2B SUCCESS: Snapshot aggregation complete';
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 2 FAILED (snapshot retrieval): ' || SQLERRM,
      'detail', SQLSTATE,
      'simulation_id', p_simulation_id,
      'template_id', v_template_id
    );
  END;

  -- Step 3: Clear data
  BEGIN
    FOR v_table_name IN 
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name LIKE 'patient_%'
        AND table_name NOT IN ('patient_medications')
    LOOP
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = v_table_name AND column_name = 'tenant_id') THEN
        CONTINUE;
      END IF;
      
      EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table_name) USING v_tenant_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_total_cleared := v_total_cleared + v_count;
    END LOOP;
    
    RAISE NOTICE '✅ Step 3 SUCCESS: Cleared % records', v_total_cleared;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 3 FAILED (data clearing): ' || SQLERRM,
      'detail', SQLSTATE
    );
  END;

  -- Step 4: Restore data (simplified for now)
  BEGIN
    v_total_restored := 0; -- Skip restoration for now to isolate the error
    RAISE NOTICE '✅ Step 4 SUCCESS: Skipped restoration for debug';
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 4 FAILED (data restoration): ' || SQLERRM,
      'detail', SQLSTATE
    );
  END;

  -- Step 5: Count medications (this might be the issue)
  BEGIN
    SELECT count(*) INTO v_count 
    FROM patient_medications 
    WHERE tenant_id = v_tenant_id;
    
    v_stats := v_stats || jsonb_build_object('medications_preserved', v_count);
    RAISE NOTICE '✅ Step 5 SUCCESS: Found % medications', v_count;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 5 FAILED (medication count): ' || SQLERRM,
      'detail', SQLSTATE
    );
  END;

  -- Step 6: Count vitals (this is very likely the culprit)
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_vitals' AND column_name = 'tenant_id') THEN
      SELECT count(*) INTO v_count FROM patient_vitals WHERE tenant_id = v_tenant_id;
      v_stats := v_stats || jsonb_build_object('vitals_restored', v_count);
      RAISE NOTICE '✅ Step 6A SUCCESS: Direct vitals count = %', v_count;
    ELSE
      SELECT count(*) INTO v_count 
      FROM patient_vitals pv 
      JOIN patients p ON p.id = pv.patient_id 
      WHERE p.tenant_id = v_tenant_id;
      v_stats := v_stats || jsonb_build_object('vitals_restored', v_count);
      RAISE NOTICE '✅ Step 6B SUCCESS: Joined vitals count = %', v_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 6 FAILED (vitals count): ' || SQLERRM,
      'detail', SQLSTATE
    );
  END;

  -- Step 7: Update simulation metadata
  BEGIN
    UPDATE simulation_active
    SET
      session_number = COALESCE(session_number, 0) + 1,
      last_reset_at = now(),
      reset_count = COALESCE(reset_count, 0) + 1,
      updated_at = now()
    WHERE id = p_simulation_id;
    
    RAISE NOTICE '✅ Step 7 SUCCESS: Updated simulation metadata';
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step 7 FAILED (metadata update): ' || SQLERRM,
      'detail', SQLSTATE
    );
  END;

  RAISE NOTICE '🎉 Debug reset complete - all steps successful!';
  
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'reset_type', 'debug_session_reset_v2',
    'total_cleared', v_total_cleared,
    'total_restored', v_total_restored,
    'stats', v_stats,
    'message', 'Debug reset complete - check logs to see which step failed.',
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'OUTER EXCEPTION: ' || SQLERRM,
    'detail', SQLSTATE,
    'simulation_id', p_simulation_id
  );
END;
$$;