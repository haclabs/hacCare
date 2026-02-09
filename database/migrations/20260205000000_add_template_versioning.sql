-- ============================================================================
-- TEMPLATE VERSIONING SYSTEM
-- ============================================================================
-- Enables template version history and smart simulation syncing
-- Allows instructors to:
--   1. Archive every template change with notes
--   2. Compare template versions before syncing
--   3. Restore previous template versions
--   4. See which version each simulation is running
-- ============================================================================

-- Create template version history table
CREATE TABLE IF NOT EXISTS simulation_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES simulation_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot_data JSONB NOT NULL,
  
  -- Metadata
  saved_at TIMESTAMP DEFAULT NOW(),
  saved_by UUID REFERENCES auth.users(id),
  change_notes TEXT,
  
  -- Quick stats for version cards (avoid parsing JSONB every time)
  patient_count INT,
  medication_count INT,
  order_count INT,
  wound_count INT,
  device_count INT,
  
  -- Constraints
  UNIQUE(template_id, version),
  CHECK (version > 0)
);

-- Indexes for performance
CREATE INDEX idx_template_versions_template ON simulation_template_versions(template_id, version DESC);
CREATE INDEX idx_template_versions_saved_at ON simulation_template_versions(saved_at DESC);

-- RLS Policies (same as template access)
ALTER TABLE simulation_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY template_versions_tenant_isolation
  ON simulation_template_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM simulation_templates st
      WHERE st.id = template_id
      AND st.tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    )
  );

-- Super admin can see all versions
CREATE POLICY template_versions_super_admin
  ON simulation_template_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Add version tracking to simulation_active
ALTER TABLE simulation_active 
ADD COLUMN IF NOT EXISTS template_snapshot_version_launched INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS template_snapshot_version_synced INT;

-- Add helpful comments
COMMENT ON COLUMN simulation_active.template_snapshot_version_launched IS 'Template version when simulation was originally launched';
COMMENT ON COLUMN simulation_active.template_snapshot_version_synced IS 'Template version last synced to (NULL if never synced)';
COMMENT ON TABLE simulation_template_versions IS 'Archives every template snapshot change for version history and rollback';

-- ============================================================================
-- FUNCTION: Save Template Version
-- ============================================================================
-- Archives current template snapshot before updating
-- Automatically increments version number
-- ============================================================================

CREATE OR REPLACE FUNCTION save_template_version(
  p_template_id UUID,
  p_new_snapshot JSONB,
  p_change_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INT;
  v_current_snapshot JSONB;
  v_new_version INT;
  v_patient_count INT := 0;
  v_medication_count INT := 0;
  v_order_count INT := 0;
  v_wound_count INT := 0;
  v_device_count INT := 0;
  v_version_id UUID;
BEGIN
  -- Get current template data
  SELECT snapshot_version, snapshot_data
  INTO v_current_version, v_current_snapshot
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  -- Calculate new version
  v_new_version := COALESCE(v_current_version, 0) + 1;
  
  -- Archive CURRENT version (before updating)
  IF v_current_snapshot IS NOT NULL THEN
    -- Calculate stats from current snapshot
    IF v_current_snapshot ? 'patients' THEN
      v_patient_count := jsonb_array_length(v_current_snapshot->'patients');
    END IF;
    
    IF v_current_snapshot ? 'patient_medications' THEN
      v_medication_count := jsonb_array_length(v_current_snapshot->'patient_medications');
    END IF;
    
    IF v_current_snapshot ? 'doctors_orders' THEN
      v_order_count := jsonb_array_length(v_current_snapshot->'doctors_orders');
    END IF;
    
    IF v_current_snapshot ? 'wounds' THEN
      v_wound_count := jsonb_array_length(v_current_snapshot->'wounds');
    END IF;
    
    IF v_current_snapshot ? 'devices' THEN
      v_device_count := jsonb_array_length(v_current_snapshot->'devices');
    END IF;
    
    -- Insert archived version
    INSERT INTO simulation_template_versions (
      template_id,
      version,
      snapshot_data,
      saved_by,
      change_notes,
      patient_count,
      medication_count,
      order_count,
      wound_count,
      device_count
    ) VALUES (
      p_template_id,
      v_current_version,
      v_current_snapshot,
      COALESCE(p_user_id, auth.uid()),
      p_change_notes,
      v_patient_count,
      v_medication_count,
      v_order_count,
      v_wound_count,
      v_device_count
    )
    RETURNING id INTO v_version_id;
    
    RAISE NOTICE '📦 Archived template v% (version_id: %)', v_current_version, v_version_id;
  END IF;
  
  -- Update template with new snapshot and version
  UPDATE simulation_templates
  SET 
    snapshot_data = p_new_snapshot,
    snapshot_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  RAISE NOTICE '✅ Updated template to v%', v_new_version;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_version', v_current_version,
    'new_version', v_new_version,
    'archived_version_id', v_version_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION save_template_version TO authenticated;

-- ============================================================================
-- FUNCTION: Restore Template Version
-- ============================================================================
-- Restores a previous template version as current
-- Creates new version entry (doesn't delete history)
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_template_version(
  p_template_id UUID,
  p_version_to_restore INT,
  p_user_id UUID DEFAULT NULL,
  p_restore_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_to_restore JSONB;
  v_result JSONB;
BEGIN
  -- Get the snapshot from version history
  SELECT snapshot_data
  INTO v_snapshot_to_restore
  FROM simulation_template_versions
  WHERE template_id = p_template_id
  AND version = p_version_to_restore;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found for template %', p_version_to_restore, p_template_id;
  END IF;
  
  -- Save current version and update to restored snapshot
  SELECT save_template_version(
    p_template_id,
    v_snapshot_to_restore,
    COALESCE(p_restore_notes, 'Restored from version ' || p_version_to_restore),
    p_user_id
  ) INTO v_result;
  
  RETURN v_result || jsonb_build_object('restored_from_version', p_version_to_restore);
END;
$$;

GRANT EXECUTE ON FUNCTION restore_template_version TO authenticated;

-- ============================================================================
-- FUNCTION: Compare Template Versions
-- ============================================================================
-- Returns diff between two template versions
-- Used for UI comparison views
-- ============================================================================

CREATE OR REPLACE FUNCTION compare_template_versions(
  p_template_id UUID,
  p_version_old INT,
  p_version_new INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_old JSONB;
  v_snapshot_new JSONB;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Get old version snapshot
  IF p_version_old = 0 THEN
    -- Version 0 means "nothing" (for initial version comparison)
    v_snapshot_old := '{}'::jsonb;
  ELSE
    SELECT snapshot_data INTO v_snapshot_old
    FROM simulation_template_versions
    WHERE template_id = p_template_id AND version = p_version_old;
  END IF;
  
  -- Get new version snapshot (could be current or history)
  SELECT CASE
    WHEN p_version_new = (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id)
    THEN (SELECT snapshot_data FROM simulation_templates WHERE id = p_template_id)
    ELSE (SELECT snapshot_data FROM simulation_template_versions WHERE template_id = p_template_id AND version = p_version_new)
  END INTO v_snapshot_new;
  
  -- Calculate diffs (simplified - full diff logic in frontend)
  v_result := jsonb_build_object(
    'template_id', p_template_id,
    'version_old', p_version_old,
    'version_new', p_version_new,
    'patient_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'patients'), 0),
    'patient_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'patients'), 0),
    'medication_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'patient_medications'), 0),
    'medication_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'patient_medications'), 0),
    'order_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'doctors_orders'), 0),
    'order_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'doctors_orders'), 0),
    'wound_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'wounds'), 0),
    'wound_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'wounds'), 0),
    'device_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'devices'), 0),
    'device_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'devices'), 0),
    'snapshot_old', v_snapshot_old,
    'snapshot_new', v_snapshot_new
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION compare_template_versions TO authenticated;

-- ============================================================================
-- Migration: Initialize versioning for existing templates
-- ============================================================================
-- Give all existing templates a version number if they don't have one
-- ============================================================================

UPDATE simulation_templates
SET snapshot_version = 1
WHERE snapshot_version IS NULL OR snapshot_version = 0;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Template versioning system initialized';
  RAISE NOTICE '📦 Existing templates set to version 1';
  RAISE NOTICE '🔄 Future template saves will auto-archive versions';
END $$;
