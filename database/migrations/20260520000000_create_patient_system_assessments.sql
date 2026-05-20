-- Migration: Create patient_system_assessments table for Flowsheets
-- Date: 2026-05-20
--
-- A single flexible table for all flowsheet-backed clinical assessment forms.
-- Using system_type + JSONB data pattern for extensibility:
--   Adding a new assessment type = new form component + registry entry, NO new migration needed.
--
-- 4-part new-table checklist:
--   1. ✅ This migration creates the table
--   2. ✅ Added to simulation_table_config below
--   3. 🔄 studentActivityService.ts — add query when first native form ships
--   4. 🔄 EnhancedDebriefModal.tsx  — add render case when first native form ships
--   5. 🔄 Reset functions           — add DELETE when first native form ships
--          Both reset_simulation_for_next_session and reset_simulation_with_template_updates
--          need: DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id;
--          Create a new migration with CREATE OR REPLACE FUNCTION for both when that time comes.

CREATE TABLE IF NOT EXISTS patient_system_assessments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,

  -- Registry key — matches FlowsheetDefinition.systemType in src/features/flowsheets/registry.ts
  -- Examples: 'respiratory', 'fall-risk', 'braden-scale', 'tr-leisure-interest', 'cognitive', etc.
  system_type   TEXT        NOT NULL,

  -- Flexible JSONB payload — form fields vary per system_type
  assessment_data JSONB     NOT NULL DEFAULT '{}',

  nurse_id      UUID,
  nurse_name    TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_psa_patient_tenant
  ON patient_system_assessments(patient_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_psa_system_type
  ON patient_system_assessments(system_type, tenant_id);

CREATE INDEX IF NOT EXISTS idx_psa_tenant
  ON patient_system_assessments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_psa_recorded_at
  ON patient_system_assessments(recorded_at DESC);

-- Row-Level Security
ALTER TABLE patient_system_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY psa_tenant_isolation
  ON patient_system_assessments
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Register in simulation_table_config so save_template_snapshot_v2 captures baseline entries
INSERT INTO simulation_table_config (
  table_name,
  category,
  has_patient_id,
  has_tenant_id,
  requires_id_mapping,
  delete_order,
  enabled,
  notes
)
SELECT
  'patient_system_assessments',
  'student_work',
  true,
  true,
  true,
  6,
  true,
  'Flexible flowsheet assessment forms (respiratory, cardiovascular, fall-risk, braden, TRG forms, etc.) — JSONB data field keyed by system_type'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config
  WHERE table_name = 'patient_system_assessments'
);
