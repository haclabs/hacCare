-- ============================================================================
-- PHASE 1: CONFIG TABLE + RLS SECURITY
-- ============================================================================
-- Purpose: Create simulation_table_config and add RLS to simulation tables
-- Safe: 100% safe - only adds metadata and security, doesn't modify data
-- Time: 5 minutes
-- Rollback: Simple DROP TABLE and DISABLE RLS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Create Config Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS simulation_table_config (
  id serial PRIMARY KEY,
  table_name text NOT NULL UNIQUE,
  category text NOT NULL, -- 'core', 'clinical', 'assessments', 'labs', 'medications'
  
  -- Table structure metadata
  has_tenant_id boolean DEFAULT false,
  has_patient_id boolean DEFAULT false,
  
  -- Relationship metadata
  parent_table text, -- For nested relationships (e.g., lab_results -> lab_panels)
  parent_column text, -- Column name that links to parent (e.g., 'panel_id')
  
  -- Simulation behavior
  requires_id_mapping boolean DEFAULT false, -- TRUE for tables where IDs must be preserved (patients, medications, wounds)
  delete_order integer NOT NULL, -- Lower numbers deleted first in reset (children before parents)
  
  -- Control
  enabled boolean DEFAULT true,
  notes text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_delete_order CHECK(delete_order > 0)
);

COMMENT ON TABLE simulation_table_config IS 'Configuration for patient-related tables in simulation snapshot/restore system';
COMMENT ON COLUMN simulation_table_config.requires_id_mapping IS 'TRUE if IDs must be preserved for barcodes (patients, medications, wounds, lab_panels)';
COMMENT ON COLUMN simulation_table_config.delete_order IS 'Order for deletion in reset: lower numbers first (delete children before parents)';

-- ---------------------------------------------------------------------------
-- Step 2: Populate Config with ALL Current Tables
-- ---------------------------------------------------------------------------

INSERT INTO simulation_table_config 
  (table_name, category, has_tenant_id, has_patient_id, parent_table, parent_column, requires_id_mapping, delete_order, notes)
VALUES
  -- CORE PATIENT DATA (delete last - highest order)
  ('patients', 'core', true, false, null, null, true, 999, 'Core patient records - IDs must be preserved for barcodes'),
  
  -- MEDICATIONS (ID mapping required for labels)
  ('patient_medications', 'medications', true, true, null, null, true, 10, 'Medication records - IDs must be preserved for barcode labels'),
  ('medication_administrations', 'medications', true, false, null, 'patient_id', false, 5, 'Med admin records - patient_id is TEXT not UUID'),
  
  -- CLINICAL DATA (no ID mapping needed)
  ('patient_vitals', 'clinical', true, true, null, null, false, 5, 'Vital signs recordings'),
  ('patient_notes', 'clinical', true, true, null, null, false, 5, 'Patient notes (nursing, progress, etc)'),
  ('patient_alerts', 'clinical', true, false, null, null, false, 5, 'Patient alerts - uses tenant_id directly'),
  ('patient_images', 'clinical', true, true, null, null, false, 5, 'Uploaded patient images'),
  
  -- ASSESSMENTS (no tenant_id, use patient_id join)
  ('patient_admission_records', 'assessments', false, true, null, null, false, 8, 'Admission assessment data'),
  ('patient_advanced_directives', 'assessments', false, true, null, null, false, 8, 'Advanced directives and DNR status'),
  ('bowel_records', 'assessments', false, true, null, null, false, 8, 'Bowel assessment records'),
  ('diabetic_records', 'assessments', true, true, null, null, false, 8, 'Blood glucose and insulin records'),
  
  -- LABS (NEW! - panel_id mapping required)
  ('lab_panels', 'labs', true, true, null, null, true, 6, 'Lab panel containers - IDs must be preserved for lab_results relationship'),
  ('lab_results', 'labs', true, false, 'lab_panels', 'panel_id', false, 5, 'Individual lab test results - nested under lab_panels'),
  
  -- WOUNDS (wound_id mapping required)
  ('patient_wounds', 'clinical', true, true, null, null, true, 7, 'Wound records - IDs must be preserved for wound_assessments relationship'),
  ('wound_assessments', 'clinical', true, true, 'patient_wounds', 'wound_id', false, 6, 'Wound assessment records - nested under patient_wounds'),
  
  -- HACMAP (avatar_locations mapping required for devices/wounds)
  ('avatar_locations', 'hacmap', true, true, null, null, true, 7, 'hacMap body locations - IDs must be preserved for devices/wounds relationship'),
  ('devices', 'hacmap', true, true, 'avatar_locations', 'location_id', false, 6, 'hacMap device placements - nested under avatar_locations'),
  ('wounds', 'hacmap', true, true, 'avatar_locations', 'location_id', false, 6, 'hacMap wound assessments - nested under avatar_locations'),
  
  -- ORDERS & HANDOVER (no ID mapping needed)
  ('handover_notes', 'clinical', false, true, null, null, false, 8, 'SBAR handover notes between shifts'),
  ('doctors_orders', 'clinical', true, true, null, null, false, 8, 'Doctor orders and prescriptions')
  
ON CONFLICT (table_name) DO NOTHING;

-- Verify config populated
SELECT 
  category,
  COUNT(*) as table_count,
  COUNT(*) FILTER (WHERE requires_id_mapping) as requires_mapping,
  COUNT(*) FILTER (WHERE enabled) as enabled_count
FROM simulation_table_config
GROUP BY category
ORDER BY category;

-- Show all tables in config
SELECT 
  table_name,
  category,
  has_tenant_id,
  has_patient_id,
  requires_id_mapping,
  delete_order,
  enabled
FROM simulation_table_config
ORDER BY delete_order, table_name;

-- ---------------------------------------------------------------------------
-- Step 3: Add RLS to Simulation Tables
-- ---------------------------------------------------------------------------

-- Enable RLS on all simulation tables
ALTER TABLE simulation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_active ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_activity_log ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on config table
ALTER TABLE simulation_table_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE simulation_templates IS 'Simulation templates with snapshot data - RLS enforced';
COMMENT ON TABLE simulation_active IS 'Active running simulations - RLS enforced';
COMMENT ON TABLE simulation_participants IS 'User access to simulations - RLS enforced';
COMMENT ON TABLE simulation_history IS 'Completed simulation history - RLS enforced';
COMMENT ON TABLE simulation_activity_log IS 'Simulation activity audit log - RLS enforced';

-- ---------------------------------------------------------------------------
-- Step 4: Create RLS Policies
-- ---------------------------------------------------------------------------

-- ===== SIMULATION_TEMPLATES POLICIES =====

-- Super admins and admins can see all templates
CREATE POLICY "templates_select_super_admin" ON simulation_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Instructors and admins can see all templates (no tenant restriction since templates are in template tenants)
CREATE POLICY "templates_select_instructor" ON simulation_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('instructor', 'admin', 'super_admin')
    )
  );

-- Students can see ready templates
CREATE POLICY "templates_select_student" ON simulation_templates
  FOR SELECT
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Only instructors and admins can create templates
CREATE POLICY "templates_insert_policy" ON simulation_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only creator or admins can update templates
CREATE POLICY "templates_update_policy" ON simulation_templates
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Only creator or admins can delete templates
CREATE POLICY "templates_delete_policy" ON simulation_templates
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- ===== SIMULATION_ACTIVE POLICIES =====

-- Users can see simulations they're participants in
CREATE POLICY "active_select_participant" ON simulation_active
  FOR SELECT
  USING (
    id IN (
      SELECT simulation_id FROM simulation_participants
      WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Only instructors and admins can create simulations
CREATE POLICY "active_insert_policy" ON simulation_active
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only creator or admins can update simulations
CREATE POLICY "active_update_policy" ON simulation_active
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Only creator or admins can delete simulations
CREATE POLICY "active_delete_policy" ON simulation_active
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- ===== SIMULATION_PARTICIPANTS POLICIES =====

-- Users can see participants in simulations they're part of
CREATE POLICY "participants_select_policy" ON simulation_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR simulation_id IN (
      SELECT simulation_id FROM simulation_participants WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM simulation_active sa
      WHERE sa.id = simulation_id AND sa.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only simulation creator or admins can add participants
CREATE POLICY "participants_insert_policy" ON simulation_participants
  FOR INSERT
  WITH CHECK (
    granted_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM simulation_active sa
        WHERE sa.id = simulation_id AND sa.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role IN ('super_admin', 'admin', 'instructor')
      )
    )
  );

-- Only grantor or admins can update participants
CREATE POLICY "participants_update_policy" ON simulation_participants
  FOR UPDATE
  USING (
    granted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Only grantor or admins can remove participants
CREATE POLICY "participants_delete_policy" ON simulation_participants
  FOR DELETE
  USING (
    granted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- ===== SIMULATION_HISTORY POLICIES =====

-- Users can see history of simulations they participated in
CREATE POLICY "history_select_policy" ON simulation_history
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR participants::jsonb @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only system can insert history (via complete_simulation function)
CREATE POLICY "history_insert_policy" ON simulation_history
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only creator or admins can update history
CREATE POLICY "history_update_policy" ON simulation_history
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Only admins can delete history
CREATE POLICY "history_delete_policy" ON simulation_history
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- ===== SIMULATION_ACTIVITY_LOG POLICIES =====

-- Users can see their own activity and activity in their simulations
CREATE POLICY "activity_log_select_policy" ON simulation_activity_log
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR simulation_id IN (
      SELECT simulation_id FROM simulation_participants WHERE user_id = auth.uid()
    )
    OR simulation_id IN (
      SELECT id FROM simulation_active WHERE created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Users can log their own activity
CREATE POLICY "activity_log_insert_policy" ON simulation_activity_log
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- No updates allowed on activity log (audit trail)
-- No policy = no updates

-- Only admins can delete activity logs
CREATE POLICY "activity_log_delete_policy" ON simulation_activity_log
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );

-- ===== SIMULATION_TABLE_CONFIG POLICIES =====

-- Everyone can read config (needed for functions)
CREATE POLICY "config_select_policy" ON simulation_table_config
  FOR SELECT
  USING (true); -- Public read

-- Only super admins can modify config
CREATE POLICY "config_modify_policy" ON simulation_table_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Step 5: Grant Permissions
-- ---------------------------------------------------------------------------

-- Grant usage on config table to authenticated users
GRANT SELECT ON simulation_table_config TO authenticated;
GRANT SELECT ON simulation_table_config TO anon;

-- Grant usage on sequence
GRANT USAGE ON SEQUENCE simulation_table_config_id_seq TO authenticated;

-- ---------------------------------------------------------------------------
-- Step 6: Verification Queries
-- ---------------------------------------------------------------------------

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'simulation_templates',
    'simulation_active',
    'simulation_participants',
    'simulation_history',
    'simulation_activity_log',
    'simulation_table_config'
  )
ORDER BY tablename;

-- Check policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as applies_to
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'simulation_%'
ORDER BY tablename, policyname;

-- Check config table populated
SELECT 
  COUNT(*) as total_tables,
  COUNT(*) FILTER (WHERE enabled = true) as enabled_tables,
  COUNT(*) FILTER (WHERE requires_id_mapping = true) as requires_mapping,
  COUNT(DISTINCT category) as categories
FROM simulation_table_config;

-- Show summary by category
SELECT 
  category,
  COUNT(*) as table_count,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM simulation_table_config
WHERE enabled = true
GROUP BY category
ORDER BY category;

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================

/*

-- Disable RLS (back to unrestricted)
ALTER TABLE simulation_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_active DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_table_config DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "templates_select_super_admin" ON simulation_templates;
DROP POLICY IF EXISTS "templates_select_instructor" ON simulation_templates;
DROP POLICY IF EXISTS "templates_select_student" ON simulation_templates;
DROP POLICY IF EXISTS "templates_insert_policy" ON simulation_templates;
DROP POLICY IF EXISTS "templates_update_policy" ON simulation_templates;
DROP POLICY IF EXISTS "templates_delete_policy" ON simulation_templates;

DROP POLICY IF EXISTS "active_select_participant" ON simulation_active;
DROP POLICY IF EXISTS "active_insert_policy" ON simulation_active;
DROP POLICY IF EXISTS "active_update_policy" ON simulation_active;
DROP POLICY IF EXISTS "active_delete_policy" ON simulation_active;

DROP POLICY IF EXISTS "participants_select_policy" ON simulation_participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON simulation_participants;
DROP POLICY IF EXISTS "participants_update_policy" ON simulation_participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON simulation_participants;

DROP POLICY IF EXISTS "history_select_policy" ON simulation_history;
DROP POLICY IF EXISTS "history_insert_policy" ON simulation_history;
DROP POLICY IF EXISTS "history_update_policy" ON simulation_history;
DROP POLICY IF EXISTS "history_delete_policy" ON simulation_history;

DROP POLICY IF EXISTS "activity_log_select_policy" ON simulation_activity_log;
DROP POLICY IF EXISTS "activity_log_insert_policy" ON simulation_activity_log;
DROP POLICY IF EXISTS "activity_log_delete_policy" ON simulation_activity_log;

DROP POLICY IF EXISTS "config_select_policy" ON simulation_table_config;
DROP POLICY IF EXISTS "config_modify_policy" ON simulation_table_config;

-- Drop config table
DROP TABLE IF EXISTS simulation_table_config CASCADE;

-- System back to original unrestricted state

*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '✅ PHASE 1 COMPLETE!' as status,
       'Config table created with ' || COUNT(*) || ' tables' as details
FROM simulation_table_config;

SELECT '✅ RLS ENABLED on all simulation tables' as status;

SELECT '✅ ' || COUNT(*) || ' RLS policies created' as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'simulation_%';

SELECT '🎉 Ready for Phase 2: save_template_snapshot_v2' as next_step;
