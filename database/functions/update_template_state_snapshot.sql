-- ============================================================================
-- UPDATE TEMPLATE STATE SNAPSHOT
-- ============================================================================
-- Overwrites an existing named template state's snapshot_data in place with
-- the template tenant's current live data, keeping id/label/changelog_note
-- stable. Companion to load_template_state (which loads a state INTO the
-- tenant for editing) — this saves edits BACK into that same state.
--
-- Reference copy — the live migration is
-- database/migrations/20260912000004_add_update_template_state_snapshot_function.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_template_state_snapshot(
  p_template_id UUID,
  p_state_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = v_tenant_id AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit this template';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM simulation_template_states WHERE id = p_state_id AND template_id = p_template_id
  ) THEN
    RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
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

  UPDATE simulation_template_states
  SET snapshot_data = v_snapshot,
      updated_at = now()
  WHERE id = p_state_id AND template_id = p_template_id;

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'state_id', p_state_id,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_template_state_snapshot(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_template_state_snapshot(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.update_template_state_snapshot(uuid, uuid) IS 'Overwrites an existing named template state''s snapshot_data in place with the template tenant''s current live data, keeping the state''s id/label/changelog_note stable (so simulation_active.current_state_id references referencing it stay valid). Companion to load_template_state.';
