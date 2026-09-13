-- ============================================================================
-- SAVE TEMPLATE STATE
-- ============================================================================
-- Captures the template tenant's current clinical data as a new named state
-- (e.g. "Week 2"), independent of the template's default snapshot_data.
-- Mirrors save_template_snapshot_v2's auto-discovery capture loop.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_template_state(
  p_template_id uuid,
  p_label text,
  p_changelog_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
  v_state_id uuid;
  v_state_count integer;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF p_label IS NULL OR trim(p_label) = '' THEN
    RAISE EXCEPTION 'A label is required to save a template state';
  END IF;

  SELECT COUNT(*) INTO v_state_count FROM simulation_template_states WHERE template_id = p_template_id;
  IF v_state_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum of 10 states per template reached');
  END IF;

  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name NOT IN ('tenant_users', 'programs')
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  FOR v_table_record IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2
      WHERE c2.table_name = t.table_name
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      JOIN patients p ON p.id = t.patient_id
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );

  BEGIN
    INSERT INTO simulation_template_states (
      tenant_id, template_id, label, changelog_note, snapshot_data, sort_order, created_by
    ) VALUES (
      v_tenant_id, p_template_id, trim(p_label), p_changelog_note, v_snapshot, v_state_count, auth.uid()
    )
    RETURNING id INTO v_state_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'A state with that label already exists for this template');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'template_id', p_template_id,
    'label', p_label,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Template state saved successfully'
  );
END;
$_$;

COMMENT ON FUNCTION public.save_template_state(uuid, text, text) IS 'Captures the template tenant''s current clinical data as a new named state (e.g. "Week 2"), independent of the template''s default snapshot_data.';

GRANT EXECUTE ON FUNCTION public.save_template_state(uuid, text, text) TO authenticated;
