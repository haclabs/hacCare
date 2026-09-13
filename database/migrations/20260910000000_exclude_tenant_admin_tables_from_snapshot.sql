-- Migration: Exclude tenant-administration tables from schema-agnostic
-- template snapshots (save_template_snapshot_v2, save_patient_template_snapshot)
-- Date: 2026-09-10
--
-- Bug: Both snapshot functions auto-discover "ALL tables with a tenant_id
-- column" and dump their rows into the JSONB snapshot. This unintentionally
-- captures `tenant_users` — the instructor(s) who edited the template get
-- added there via enterTemplateTenant() for RLS access, so their membership
-- row gets treated as if it were template "data".
--
-- When restore_snapshot_to_tenant() later restores that snapshot into a
-- simulation tenant (on launch or session reset), it tries to re-insert
-- those tenant_users rows. launch_simulation() already adds the launching
-- instructor to the new tenant's tenant_users itself, so the snapshot's
-- copy collides on the tenant_users_tenant_id_user_id_key unique constraint:
--
--   duplicate key value violates unique constraint
--   "tenant_users_tenant_id_user_id_key"
--
-- This is caught by restore_snapshot_to_tenant's per-row EXCEPTION WHEN
-- OTHERS handler (RAISE WARNING only), so it never broke simulation launch
-- — it just spammed the logs with SQLSTATE 23505 warnings on every launch/
-- reset of a template an instructor had edited.
--
-- Fix: exclude `tenant_users` (and `programs`, which is likewise tenant
-- administration/org metadata, not clinical template data) from both
-- functions' auto-discovery queries.

CREATE OR REPLACE FUNCTION public.save_template_snapshot_v2(p_template_id uuid) RETURNS jsonb
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
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id 
  FROM simulation_templates 
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  RAISE NOTICE '📸 Creating dynamic snapshot for template % (tenant %)', p_template_id, v_tenant_id;
  
  -- STEP 1: Auto-discover and capture all tables with tenant_id column
  FOR v_table_record IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'  -- Skip simulation system tables
    AND t.table_name NOT IN ('tenant_users', 'programs')  -- Tenant admin/org metadata, not template data
    ORDER BY t.table_name
  LOOP
    -- Dynamically capture all data from this tenant-aware table
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t 
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;
    
    -- Add to snapshot if there's data
    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
      RAISE NOTICE '  ✅ Captured % records from %', v_count, v_table_record.table_name;
    END IF;
  END LOOP;
  
  -- STEP 2: Auto-discover tables linked via patient_id (but no tenant_id)
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
    -- Capture data linked to patients in this tenant
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t 
      JOIN patients p ON p.id = t.patient_id 
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;
    
    -- Add to snapshot if there's data
    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
      RAISE NOTICE '  ✅ Captured % records from % (via patient_id)', v_count, v_table_record.table_name;
    END IF;
  END LOOP;
  
  -- Add metadata
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
  
  -- Update template with new snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  RAISE NOTICE '🎉 Dynamic snapshot complete: % tables, % total records', v_total_tables, v_total_records;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Schema-agnostic snapshot created successfully'
  );
END;
$_$;

COMMENT ON FUNCTION public.save_template_snapshot_v2(p_template_id uuid) IS 'Schema-agnostic snapshot creation V2. Automatically discovers and captures ALL tenant clinical/template data (excludes tenant_users/programs admin metadata). Works with future schema changes automatically.';

CREATE OR REPLACE FUNCTION public.save_patient_template_snapshot(p_patient_template_id uuid) RETURNS jsonb
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
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient template not found: %', p_patient_template_id;
  END IF;

  -- STEP 1: tables with tenant_id
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name <> 'patient_templates'
    AND t.table_name NOT IN ('tenant_users', 'programs')  -- Tenant admin/org metadata, not template data
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

  -- STEP 2: tables linked via patient_id only (no tenant_id column)
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

  UPDATE patient_templates
  SET
    snapshot_data = v_snapshot,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_patient_template_id;

  RETURN jsonb_build_object(
    'success', true,
    'patient_template_id', p_patient_template_id,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Patient template snapshot saved successfully'
  );
END;
$_$;

COMMENT ON FUNCTION public.save_patient_template_snapshot(uuid) IS 'Schema-agnostic snapshot creation for patient templates. Mirrors save_template_snapshot_v2 but targets patient_templates (excludes tenant_users/programs admin metadata).';
