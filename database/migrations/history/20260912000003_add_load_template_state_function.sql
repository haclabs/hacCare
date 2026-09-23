-- Migration: Load a named template state (or the template's default snapshot) back
-- into the template's tenant for editing / discarding changes
-- Date: 2026-09-12
-- Companion to 20260912000000 (simulation_template_states). Previously there was only
-- a one-way path: "Save as New State" captured the live template tenant into a named
-- state, but there was no way to bring a previously-saved state (e.g. "Week 2") back
-- into the template tenant to actually edit it — instructors could rename/delete states
-- but never load one for editing. This adds that missing path.
--
-- Also doubles as a "Discard Changes" path: template editing is LIVE (every edit is a
-- real write against the template's tenant, see TemplateEditingBanner/enterTemplateTenant),
-- with no cancel button — the only way back to a known-good state was Save. Passing
-- p_state_id := NULL reloads the template's own default snapshot_data instead of a named
-- state, letting the instructor discard live edits back to the last save.

CREATE OR REPLACE FUNCTION public.load_template_state(
  p_template_id UUID,
  p_state_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb;
  v_table_record record;
  v_result jsonb;
  v_tables_cleared integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Caller must have editing access to this template's tenant (mirrors the
  -- tenant_users check used by enterTemplateTenant()/the states RLS policies).
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

  IF p_state_id IS NULL THEN
    -- Discard path: reload the template's own default snapshot
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_templates
    WHERE id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'This template has no saved snapshot yet — nothing to discard back to';
    END IF;
  ELSE
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
    END IF;
  END IF;

  RAISE NOTICE '🔄 Loading state % into template tenant % for editing', p_state_id, v_tenant_id;

  -- STEP 1: Clear patient_id-only tables (no tenant_id column) BEFORE patients
  -- are deleted below, same discovery criteria save_template_state() uses to
  -- capture them — keeps this in sync automatically as new clinical tables
  -- are added, without needing a hand-maintained delete list.
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
      WHERE c2.table_name = t.table_name AND c2.column_name = 'tenant_id'
    )
  LOOP
    EXECUTE format(
      'DELETE FROM %I WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = $1)',
      v_table_record.table_name
    ) USING v_tenant_id;
    v_tables_cleared := v_tables_cleared + 1;
  END LOOP;

  -- STEP 2: Clear all tenant_id-scoped tables (patients last, since STEP 1
  -- above still needs them to resolve patient_id -> tenant_id).
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name NOT IN ('tenant_users', 'programs')
    ORDER BY CASE WHEN t.table_name = 'patients' THEN 2 ELSE 1 END
  LOOP
    EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table_record.table_name) USING v_tenant_id;
    v_tables_cleared := v_tables_cleared + 1;
  END LOOP;

  RAISE NOTICE '🗑️  Cleared % tables in template tenant before restoring state', v_tables_cleared;

  -- STEP 3: Restore the named state's snapshot fresh. Unlike an active
  -- simulation reset, template barcodes aren't load-bearing (real barcodes
  -- are only assigned when a simulation is launched from this template), so
  -- this intentionally does NOT preserve barcodes — same behavior as
  -- importing a template from an export package.
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot
  ) INTO v_result;

  RAISE NOTICE '✅ State loaded for editing: %', jsonb_pretty(v_result);

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'state_id', p_state_id,
    'restore_details', v_result
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error loading template state: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.load_template_state(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_template_state(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.load_template_state(uuid, uuid) IS 'Loads a named template state (simulation_template_states) into the template''s own tenant, replacing current live data, so an instructor can edit that state via the normal template editing flow. p_state_id NULL reloads the template''s own default snapshot instead (discard-changes path). Does not preserve barcodes (not load-bearing for templates — real barcodes are assigned on simulation launch).';
