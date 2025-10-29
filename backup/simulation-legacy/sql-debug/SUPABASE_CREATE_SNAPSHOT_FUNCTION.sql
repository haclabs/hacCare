-- DEPLOY THIS SECOND: Create the save_template_snapshot_v2 function
-- Run after creating the table

CREATE OR REPLACE FUNCTION save_template_snapshot_v2(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_table_name TEXT;
  v_record_count INTEGER;
  v_total_records INTEGER := 0;
  v_tables_processed TEXT[] := '{}';
  v_snapshot_stats JSONB := '{}';
BEGIN
  RAISE NOTICE '📸 Starting template snapshot creation for %', p_template_id;

  -- Get tenant_id from the simulation
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_template_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation not found'
    );
  END IF;

  RAISE NOTICE '🏢 Creating snapshot for tenant: %', v_tenant_id;

  -- Clear any existing snapshots for this template
  DELETE FROM simulation_template_snapshots WHERE template_id = p_template_id;
  RAISE NOTICE '🗑️ Cleared existing snapshots';

  -- Dynamically discover and snapshot all patient-related tables
  FOR v_table_name IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'patient%'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = information_schema.tables.table_name 
          AND column_name = 'tenant_id'
      )
  LOOP
    -- Snapshot all records for this tenant
    EXECUTE format('
      INSERT INTO simulation_template_snapshots (template_id, table_name, data)
      SELECT $1, $2, row_to_json(t.*)
      FROM %I t
      WHERE t.tenant_id = $3
    ', v_table_name)
    USING p_template_id, v_table_name, v_tenant_id;
    
    GET DIAGNOSTICS v_record_count = ROW_COUNT;
    v_total_records := v_total_records + v_record_count;
    v_tables_processed := array_append(v_tables_processed, v_table_name);
    v_snapshot_stats := v_snapshot_stats || jsonb_build_object(v_table_name, v_record_count);
    
    RAISE NOTICE '📦 Captured % records from %', v_record_count, v_table_name;
  END LOOP;

  RAISE NOTICE '✅ Template snapshot complete! % records from % tables', v_total_records, array_length(v_tables_processed, 1);

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'tenant_id', v_tenant_id,
    'total_records', v_total_records,
    'tables_processed', v_tables_processed,
    'snapshot_stats', v_snapshot_stats,
    'message', format('Template snapshot saved: %s records from %s tables', v_total_records, array_length(v_tables_processed, 1)),
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error creating template snapshot: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'template_id', p_template_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_template_snapshot_v2(UUID) TO authenticated;