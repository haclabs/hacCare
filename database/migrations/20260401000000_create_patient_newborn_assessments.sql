-- ============================================================================
-- CREATE PATIENT NEWBORN ASSESSMENTS TABLE
-- ============================================================================
-- Migration: Initial Newborn Assessment Record
-- Date: 2026-04-01
-- ============================================================================
-- Based on Initial Newborn Assessment Record (Form 20117) — open clinical form.
-- Single UPSERT record per patient. Physical observations stored as JSONB
-- (Normal/Variance checkbox arrays per body system).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.patient_newborn_assessments (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                  UUID         NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tenant_id                   UUID         NOT NULL,

  -- Birth Details
  time_of_birth               TIME,
  weight_grams                NUMERIC(6,1),
  length_cm                   NUMERIC(5,1),
  head_circumference_cm       NUMERIC(4,1),
  head_circumference_1hr_cm   NUMERIC(4,1),   -- AVB 1-hour measurement
  head_circumference_2hr_cm   NUMERIC(4,1),   -- AVB 2-hour measurement

  -- APGAR Scores (0–10 each)
  apgar_1min                  SMALLINT CHECK (apgar_1min  BETWEEN 0 AND 10),
  apgar_5min                  SMALLINT CHECK (apgar_5min  BETWEEN 0 AND 10),
  apgar_10min                 SMALLINT CHECK (apgar_10min BETWEEN 0 AND 10),

  -- Vitamin K Administration
  vitamin_k_given             BOOLEAN DEFAULT FALSE,
  vitamin_k_declined          BOOLEAN DEFAULT FALSE,
  vitamin_k_dose              TEXT CHECK (vitamin_k_dose IN ('0.5mg', '1.0mg')),
  vitamin_k_site              TEXT,
  vitamin_k_date              DATE,
  vitamin_k_time              TEXT,
  vitamin_k_signature         TEXT,

  -- Erythromycin Eye Ointment
  erythromycin_given          BOOLEAN DEFAULT FALSE,
  erythromycin_date           DATE,
  erythromycin_time           TEXT,
  erythromycin_signature      TEXT,

  -- Physical Observations
  -- JSONB stores Normal/Variance checkbox arrays per body system section.
  -- Structure: { "head": { "scalp_skull_normal": [...], "scalp_skull_variance": [...], ... }, "neck": {...}, ... }
  physical_observations       JSONB DEFAULT '{}'::jsonb,

  -- Completion fields
  completed_by                TEXT,
  completed_initials          TEXT,
  student_name                TEXT,         -- for simulation debrief tracking

  recorded_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at                  TIMESTAMPTZ  DEFAULT NOW(),

  -- One assessment record per patient per tenant
  CONSTRAINT patient_newborn_assessments_unique UNIQUE (patient_id, tenant_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_newborn_patient
  ON public.patient_newborn_assessments (patient_id);

CREATE INDEX IF NOT EXISTS idx_newborn_tenant
  ON public.patient_newborn_assessments (tenant_id);

CREATE INDEX IF NOT EXISTS idx_newborn_tenant_recorded
  ON public.patient_newborn_assessments (tenant_id, recorded_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.patient_newborn_assessments ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation
CREATE POLICY newborn_assessments_tenant_isolation
  ON public.patient_newborn_assessments
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Super admin cross-tenant access
CREATE POLICY newborn_assessments_super_admin
  ON public.patient_newborn_assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- SIMULATION TABLE CONFIG REGISTRY
-- Tells save_template_snapshot_v2() to capture this table in snapshots.
-- ============================================================================

INSERT INTO public.simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT
  'patient_newborn_assessments',
  'student_work',
  true,
  true,
  true,
  5,
  true,
  'Initial Newborn Assessment record — physical observations (Normal/Variance) + birth details + medications'
WHERE NOT EXISTS (
  SELECT 1 FROM public.simulation_table_config
  WHERE table_name = 'patient_newborn_assessments'
);

-- ============================================================================

SELECT '✅ Migration Complete' AS status,
       'Created patient_newborn_assessments table with RLS and simulation_table_config entry' AS description;
