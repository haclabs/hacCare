-- ============================================================================
-- CREATE PATIENT NEURO ASSESSMENTS TABLE
-- ============================================================================
-- Migration: Neurological assessment tick chart for ongoing clinical charting
-- Date: 2026-03-24
-- ============================================================================
-- Supports: LOC (AVPU), Orientation (A×n), GCS (E+V+M), Pupils, Limb Strength,
--           Sensation, Speech, Pain Score
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.patient_neuro_assessments (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID         NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tenant_id       UUID         NOT NULL,
  recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  student_name    TEXT,

  -- Level of Consciousness (AVPU scale)
  level_of_consciousness TEXT CHECK (
    level_of_consciousness IN ('Alert', 'Voice', 'Pain', 'Unresponsive')
  ),

  -- Orientation
  oriented_person BOOLEAN,
  oriented_place  BOOLEAN,
  oriented_time   BOOLEAN,
  oriented_event  BOOLEAN,

  -- Glasgow Coma Scale
  gcs_eye    SMALLINT CHECK (gcs_eye    BETWEEN 1 AND 4),
  gcs_verbal SMALLINT CHECK (gcs_verbal BETWEEN 1 AND 5),
  gcs_motor  SMALLINT CHECK (gcs_motor  BETWEEN 1 AND 6),

  -- Pupils
  pupils_equal          BOOLEAN,
  pupil_left_size       NUMERIC(3,1) CHECK (pupil_left_size  BETWEEN 1 AND 9),
  pupil_left_reaction   TEXT CHECK (pupil_left_reaction  IN ('Brisk', 'Sluggish', 'Fixed', 'Absent')),
  pupil_right_size      NUMERIC(3,1) CHECK (pupil_right_size BETWEEN 1 AND 9),
  pupil_right_reaction  TEXT CHECK (pupil_right_reaction IN ('Brisk', 'Sluggish', 'Fixed', 'Absent')),

  -- Limb Strength (MRC scale 0–5)
  strength_right_arm SMALLINT CHECK (strength_right_arm BETWEEN 0 AND 5),
  strength_left_arm  SMALLINT CHECK (strength_left_arm  BETWEEN 0 AND 5),
  strength_right_leg SMALLINT CHECK (strength_right_leg BETWEEN 0 AND 5),
  strength_left_leg  SMALLINT CHECK (strength_left_leg  BETWEEN 0 AND 5),

  -- Sensation, Speech, Pain
  sensation  TEXT CHECK (sensation IN ('Normal', 'Reduced', 'Absent', 'Abnormal')),
  speech     TEXT CHECK (speech    IN ('Clear', 'Slurred', 'Confused', 'Aphasia', 'None')),
  pain_score SMALLINT CHECK (pain_score BETWEEN 0 AND 10),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_neuro_patient
  ON public.patient_neuro_assessments (patient_id);

CREATE INDEX IF NOT EXISTS idx_neuro_tenant
  ON public.patient_neuro_assessments (tenant_id);

CREATE INDEX IF NOT EXISTS idx_neuro_recorded_at
  ON public.patient_neuro_assessments (patient_id, recorded_at ASC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.patient_neuro_assessments ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation
CREATE POLICY neuro_assessments_tenant_isolation
  ON public.patient_neuro_assessments
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Super admin cross-tenant access
CREATE POLICY neuro_assessments_super_admin
  ON public.patient_neuro_assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================

SELECT '✅ Migration Complete' AS status,
       'Created patient_neuro_assessments table with RLS' AS description;
