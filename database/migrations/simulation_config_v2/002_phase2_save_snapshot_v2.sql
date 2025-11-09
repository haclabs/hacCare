-- ============================================================================
-- PHASE 2: CONFIG-DRIVEN SNAPSHOT FUNCTION
-- ============================================================================
-- Purpose: Create save_template_snapshot_v2 that reads from simulation_table_config
-- Safe: 100% safe - only adds new function, doesn't modify existing V1
-- Time: 2 minutes
-- Rollback: Simple DROP FUNCTION
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Config-Driven Snapshot Function V2
-- ---------------------------------------------------------------------------

-- Drop existing function if it exists (in case of signature mismatch)
DROP FUNCTION IF EXISTS save_template_snapshot_v2(uuid);

CREATE OR REPLACE FUNCTION save_template_snapshot_v2(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_user_id uuid;
  v_result json;
  v_table_record RECORD;
  v_query text;
  v_table_data json;
  v_row_count integer;
  v_total_rows integer := 0;
  v_tables_captured integer := 0;
BEGIN
  v_user_id := auth.uid();
  
  -- Get template tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  RAISE NOTICE 'Starting snapshot for template % (tenant %)', p_template_id, v_tenant_id;
  
  -- Loop through all enabled tables in config
  FOR v_table_record IN
    SELECT 
      table_name,
      category,
      has_tenant_id,
      has_patient_id,
      parent_table,
      parent_column
    FROM simulation_table_config
    WHERE enabled = true
    ORDER BY delete_order DESC -- Capture parents first (highest order first)
  LOOP
    -- Build dynamic query based on table structure
    IF v_table_record.has_tenant_id THEN
      -- Table has direct tenant_id column
      v_query := format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) FROM %I t WHERE t.tenant_id = $1',
        v_table_record.table_name
      );
      
    ELSIF v_table_record.has_patient_id THEN
      -- Table links via patient_id (no tenant_id)
      v_query := format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) 
         FROM %I t 
         JOIN patients p ON p.id = t.patient_id 
         WHERE p.tenant_id = $1',
        v_table_record.table_name
      );
      
    ELSIF v_table_record.parent_table IS NOT NULL THEN
      -- Table links via parent (e.g., lab_results -> lab_panels)
      -- This case is handled by has_patient_id above for nested tables
      -- Skip if somehow both are null (shouldn't happen with proper config)
      CONTINUE;
      
    ELSE
      -- No tenant or patient link - skip this table
      RAISE NOTICE 'Skipping % - no tenant or patient link', v_table_record.table_name;
      CONTINUE;
    END IF;
    
    -- Execute query and capture data
    BEGIN
      EXECUTE v_query INTO v_table_data USING v_tenant_id;
      
      -- Count rows captured
      SELECT json_array_length(v_table_data) INTO v_row_count;
      
      -- Add to snapshot
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      
      v_total_rows := v_total_rows + v_row_count;
      v_tables_captured := v_tables_captured + 1;
      
      RAISE NOTICE 'Captured %: % rows (category: %)', 
        v_table_record.table_name, 
        v_row_count, 
        v_table_record.category;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to capture % - %: %', 
        v_table_record.table_name, 
        SQLSTATE, 
        SQLERRM;
      -- Continue with other tables even if one fails
      CONTINUE;
    END;
  END LOOP;
  
  -- Add metadata
  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'tenant_id', v_tenant_id,
      'version', 2,
      'tables_captured', v_tables_captured,
      'total_rows', v_total_rows,
      'config_driven', true
    )
  );
  
  -- Update template with snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  v_result := json_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'tables_captured', v_tables_captured,
    'total_rows', v_total_rows,
    'message', format('Snapshot V2 saved successfully. Captured %s tables with %s total rows.', v_tables_captured, v_total_rows)
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Snapshot failed: % - %', SQLSTATE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_template_snapshot_v2(uuid) IS 
'Config-driven snapshot function V2 - automatically captures all tables listed in simulation_table_config. 
Returns JSON with success status, tables captured, and total rows.';

-- ---------------------------------------------------------------------------
-- Verification Query
-- ---------------------------------------------------------------------------

-- Check function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN ('save_template_snapshot', 'save_template_snapshot_v2')
ORDER BY proname;

-- ============================================================================
-- TESTING GUIDE
-- ============================================================================

/*

-- STEP 1: Compare V1 and V2 on same template
-- Run V1 (existing)
SELECT save_template_snapshot('<your-template-id>');

-- Save the snapshot_data
SELECT snapshot_data, snapshot_version 
FROM simulation_templates 
WHERE id = '<your-template-id>';

-- Run V2 (new)
SELECT save_template_snapshot_v2('<your-template-id>');

-- Save the NEW snapshot_data
SELECT snapshot_data, snapshot_version 
FROM simulation_templates 
WHERE id = '<your-template-id>';

-- STEP 2: Compare the two snapshot_data JSONs
-- Check they have same tables
SELECT jsonb_object_keys(snapshot_data) as table_name
FROM simulation_templates 
WHERE id = '<your-template-id>'
ORDER BY table_name;

-- Check row counts match
SELECT 
  jsonb_object_keys(snapshot_data) as table_name,
  jsonb_array_length(snapshot_data->jsonb_object_keys(snapshot_data)) as row_count
FROM simulation_templates 
WHERE id = '<your-template-id>'
ORDER BY table_name;

-- STEP 3: Check metadata
SELECT snapshot_data->'snapshot_metadata' FROM simulation_templates WHERE id = '<your-template-id>';

-- Should show:
-- V2 metadata includes: version=2, tables_captured, total_rows, config_driven=true

*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*

-- Remove V2 function (keeps V1 intact)
DROP FUNCTION IF EXISTS save_template_snapshot_v2(uuid);

*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '✅ PHASE 2 COMPLETE!' as status;
SELECT 'save_template_snapshot_v2 created - config-driven snapshot function' as details;
SELECT '📝 Test both functions side-by-side to compare output' as next_action;
SELECT '🎉 Ready for Phase 3: restore_snapshot_to_tenant_v2' as next_step;
