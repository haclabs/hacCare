-- ============================================================================
-- CREATE PATIENT BBIT ENTRIES TABLE
-- ============================================================================
-- Migration: Basal-Bolus Insulin Therapy (BBIT) charting flowsheet
-- Date: 2026-03-24
-- Replaces: diabetic_records table (old form-per-visit pattern)
-- ============================================================================
-- Supports: BGM, Basal Insulin, Bolus Insulin, Correction Insulin,
--           Hypoglycemia Management, Carb Intake, Quick Notes
-- Design:   Horizontal flowsheet — each row = a time-stamped entry (column)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.patient_bbit_entries (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID         NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tenant_id       UUID         NOT NULL,
  recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  time_label      TEXT,          -- e.g. '0600', '0800', 'HS', 'PRN', 'Breakfast'
  student_name    TEXT,

  -- ── Blood Glucose Monitoring ─────────────────────────────────────────────
  glucose_value   NUMERIC(5,2)   CHECK (glucose_value >= 0 AND glucose_value <= 50),  -- mmol/L

  -- ── Basal Insulin (Long-Acting, once daily) ──────────────────────────────
  basal_name           TEXT,
  basal_dose           NUMERIC(6,2)  CHECK (basal_dose >= 0),     -- units
  basal_status         TEXT          CHECK (basal_status IN ('given', 'held')),
  basal_held_reason    TEXT          CHECK (basal_held_reason IN ('Low BG', 'NPO', 'Provider order', 'Other')),
  basal_held_other     TEXT,

  -- ── Bolus Insulin (Nutritional / Mealtime) ───────────────────────────────
  bolus_dose             NUMERIC(6,2)  CHECK (bolus_dose >= 0),   -- units
  bolus_meal             TEXT          CHECK (bolus_meal IN ('Breakfast', 'Lunch', 'Supper')),
  bolus_status           TEXT          CHECK (bolus_status IN ('given', 'not_given')),
  bolus_not_given_reason TEXT          CHECK (bolus_not_given_reason IN ('Patient not eating', 'NPO', 'Refused')),

  -- ── Correction Insulin (Sliding Scale) ───────────────────────────────────
  correction_dose           NUMERIC(6,2)  CHECK (correction_dose >= 0),           -- units given
  correction_suggested_dose NUMERIC(6,2)  CHECK (correction_suggested_dose >= 0), -- protocol dose
  correction_status         TEXT          CHECK (correction_status IN ('given', 'not_required')),

  -- ── Hypoglycemia Management (populated when glucose < 4.0) ───────────────
  hypo_juice             BOOLEAN,
  hypo_dextrose_tabs     BOOLEAN,
  hypo_iv_dextrose       BOOLEAN,
  hypo_glucagon          BOOLEAN,
  hypo_other             TEXT,
  hypo_recheck_completed BOOLEAN,

  -- ── Carb Intake ──────────────────────────────────────────────────────────
  carb_intake  TEXT  CHECK (carb_intake IN ('full', 'partial', 'none')),

  -- ── Quick Notes ──────────────────────────────────────────────────────────
  note_symptomatic_hypo       BOOLEAN,
  note_hyperglycemia_symptoms BOOLEAN,
  note_insulin_delay          BOOLEAN,
  note_other                  TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bbit_patient
  ON public.patient_bbit_entries (patient_id);

CREATE INDEX IF NOT EXISTS idx_bbit_tenant
  ON public.patient_bbit_entries (tenant_id);

CREATE INDEX IF NOT EXISTS idx_bbit_recorded_at
  ON public.patient_bbit_entries (patient_id, recorded_at ASC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.patient_bbit_entries ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation
CREATE POLICY bbit_entries_tenant_isolation
  ON public.patient_bbit_entries
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Super admin cross-tenant access
CREATE POLICY bbit_entries_super_admin
  ON public.patient_bbit_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- NOTE: The old `diabetic_records` table is intentionally left in place.
-- Drop it manually once confirmed no simulation snapshots reference it:
--   DROP TABLE IF EXISTS public.diabetic_records;
-- ============================================================================

SELECT '✅ Migration Complete' AS status,
       'Created patient_bbit_entries table with RLS (replaces diabetic_records)' AS description;
