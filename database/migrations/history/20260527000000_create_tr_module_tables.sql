-- Migration: Create Therapeutic Recreation (TR) module tables
-- Date: 2026-05-27
--
-- Creates 6 dedicated tables for the TR clinical workflow module:
--   tr_screening_entries           — Card 1: TR Screening Tool (Part 1 + Part 2)
--   tr_active_living_profiles      — Card 2: Student-written Active Living Profile narrative
--   tr_assessment_scores           — Cards 3/4: Assessment battery scores (LIM, FTB, LCM,
--                                    Berg, RAI MDS, Fitness — one row per tool)
--   tr_treatment_plan_rows         — Card 5: Repeating LAS treatment plan rows
--   tr_interdisciplinary_interps   — Card 4: Student interpretations of pre-seeded scores
--   tr_progress_notes              — Card 6: SOAP and narrative chart notes
--
-- All tables follow the same conventions as patient_system_assessments:
--   • tenant_id (NOT NULL) + RLS tenant isolation policy
--   • is_baseline BOOLEAN — TRUE = instructor template data (preserved on reset)
--                           FALSE = student entry (deleted on reset)
--   • Super admin bypass policy matching the psa_super_admin pattern
--   • No simulation_id — tenant_id IS the simulation identifier in hacCare
--
-- 4-part new-table checklist (copilot-instructions.md):
--   1. ✅ Tables created here
--   2. ✅ Registered in simulation_table_config below
--   3. 🔄 studentActivityService.ts — add queries in debrief integration phase
--   4. 🔄 EnhancedDebriefModal.tsx  — add render cases in debrief integration phase
--   5. ✅ Reset functions updated in migration 20260527000001

-- ============================================================================
-- 1. tr_screening_entries — TR Screening Tool (Card 1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tr_screening_entries (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                  UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id                   UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  is_baseline                 BOOLEAN     NOT NULL DEFAULT false,

  -- Part 1: Leisure Participation / Attitude
  experiences_boredom         BOOLEAN,
  boredom_frequency           TEXT,         -- 'daily'|'regularly'|'occasionally'|'rarely'
  takes_initiative            BOOLEAN,

  -- Part 1: Social Contact
  social_contact_frequency    TEXT,
  social_support              TEXT[],
  social_contact_performance  TEXT,
  social_engagement_rating    INTEGER     CHECK (social_engagement_rating BETWEEN 1 AND 5),
  social_comments             TEXT,

  -- Part 1: Community Participation
  community_frequency         TEXT,
  community_participation_pattern TEXT[],
  balance_active_passive      BOOLEAN,
  community_accessibility     TEXT[],

  -- Part 1: Leisure Satisfaction
  leisure_satisfaction_rating INTEGER     CHECK (leisure_satisfaction_rating BETWEEN 1 AND 4),
  leisure_participation_notes TEXT,

  -- Part 2: Barriers
  leisure_barriers_description TEXT,
  personal_barriers           TEXT[],
  functional_barriers         TEXT[],
  social_barriers             TEXT[],
  environmental_barriers      TEXT[],
  readiness_to_participate    INTEGER     CHECK (readiness_to_participate BETWEEN 1 AND 10),

  -- LCM Screen Summary Scores (out of 7 each)
  lcm_leisure_attitude_score  INTEGER,
  lcm_social_contact_score    INTEGER,
  lcm_community_participation_score INTEGER,

  -- Recommendation
  tr_recommendation           TEXT,         -- 'treatment'|'independent'|'not_priority'

  clinician_signature         TEXT,
  completed_at                TIMESTAMPTZ,
  recorded_by                 TEXT,
  recorded_by_user_id         UUID,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_screening_patient_tenant
  ON tr_screening_entries(patient_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tr_screening_tenant
  ON tr_screening_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tr_screening_baseline
  ON tr_screening_entries(tenant_id, is_baseline);

ALTER TABLE tr_screening_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_screening_tenant_isolation ON tr_screening_entries
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tr_screening_super_admin ON tr_screening_entries
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 2. tr_active_living_profiles — Student Active Living Profile narrative (Card 2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tr_active_living_profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  is_baseline         BOOLEAN     NOT NULL DEFAULT false,

  narrative           TEXT,

  recorded_by         TEXT,
  recorded_by_user_id UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_alp_patient_tenant
  ON tr_active_living_profiles(patient_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tr_alp_tenant
  ON tr_active_living_profiles(tenant_id);

ALTER TABLE tr_active_living_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_alp_tenant_isolation ON tr_active_living_profiles
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tr_alp_super_admin ON tr_active_living_profiles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 3. tr_assessment_scores — Assessment battery scores (Cards 3 & 4)
--
-- One row per administered tool. tool_name values:
--   'lcm'     — Leisure Competence Measure (8 components, pre-seeded)
--   'lim'     — Leisure Interest Measure (8 subscales, student-entered, copyrighted)
--   'lam'     — Leisure Attitude Measure  (3 subscales, template-only)
--   'lsm'     — Leisure Satisfaction Measure (6 subscales, template-only)
--   'ftb'     — Free Time Boredom (4 subscales + total, student-entered, copyrighted)
--   'berg'    — Berg Balance Scale (pre-seeded, physiotherapy)
--   'rai_mds' — RAI MDS Home Care Outcome Measures (pre-seeded, interdisciplinary)
--   'fitness' — Fitness Testing (pre-seeded, Recreation Therapist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tr_assessment_scores (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  is_baseline         BOOLEAN     NOT NULL DEFAULT false,

  tool_name           TEXT        NOT NULL,  -- discriminator; see values above
  subscale_scores     JSONB,                 -- { "Physical": 3.0, "Outdoor": 4.25, ... }
  total_score         NUMERIC,
  interpretation      TEXT,                 -- student-written clinical interpretation
  date_administered   DATE,
  administered_by     TEXT,                 -- professional role / department

  recorded_by         TEXT,
  recorded_by_user_id UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_scores_patient_tenant
  ON tr_assessment_scores(patient_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tr_scores_tool
  ON tr_assessment_scores(tenant_id, tool_name);
CREATE INDEX IF NOT EXISTS idx_tr_scores_baseline
  ON tr_assessment_scores(tenant_id, is_baseline);

ALTER TABLE tr_assessment_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_scores_tenant_isolation ON tr_assessment_scores
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tr_scores_super_admin ON tr_assessment_scores
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 4. tr_treatment_plan_rows — LAS Treatment Plan (Card 5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tr_treatment_plan_rows (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  is_baseline         BOOLEAN     NOT NULL DEFAULT false,

  sort_order          INTEGER     NOT NULL DEFAULT 0,
  -- target_area: 'psychosocial'|'emotional'|'physical'|'cognitive'
  --              |'leisure_education'|'community_integration'
  target_area         TEXT,
  goal                TEXT,
  objective_1         TEXT,
  objective_2         TEXT,
  objective_3         TEXT,
  intervention        TEXT,

  clinician_signature TEXT,
  plan_date           DATE,
  recorded_by         TEXT,
  recorded_by_user_id UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_plan_patient_tenant
  ON tr_treatment_plan_rows(patient_id, tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tr_plan_tenant
  ON tr_treatment_plan_rows(tenant_id);

ALTER TABLE tr_treatment_plan_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_plan_tenant_isolation ON tr_treatment_plan_rows
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tr_plan_super_admin ON tr_treatment_plan_rows
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 5. tr_interdisciplinary_interps — Student interpretations of Card 4 scores
--
-- score_group values: 'berg' | 'rai_mds' | 'fitness'
-- ============================================================================

CREATE TABLE IF NOT EXISTS tr_interdisciplinary_interps (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  is_baseline         BOOLEAN     NOT NULL DEFAULT false,

  score_group         TEXT        NOT NULL,
  interpretation      TEXT,

  recorded_by         TEXT,
  recorded_by_user_id UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_interps_patient_tenant
  ON tr_interdisciplinary_interps(patient_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tr_interps_group
  ON tr_interdisciplinary_interps(tenant_id, score_group);

ALTER TABLE tr_interdisciplinary_interps ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_interps_tenant_isolation ON tr_interdisciplinary_interps
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tr_interps_super_admin ON tr_interdisciplinary_interps
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 6. tr_progress_notes — SOAP / Narrative chart notes (Card 6)
--
-- No is_baseline — progress notes are always student entries.
-- History is the full list ordered by created_at DESC.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tr_progress_notes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,

  note_type           TEXT        NOT NULL DEFAULT 'soap', -- 'soap'|'narrative'

  -- SOAP fields
  subjective          TEXT,
  objective           TEXT,
  assessment          TEXT,
  plan                TEXT,

  -- Narrative field
  narrative           TEXT,

  note_date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  note_time           TIME,
  clinician_name      TEXT,
  recorded_by_user_id UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_notes_patient_tenant
  ON tr_progress_notes(patient_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tr_notes_tenant
  ON tr_progress_notes(tenant_id);

ALTER TABLE tr_progress_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_notes_tenant_isolation ON tr_progress_notes
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tr_notes_super_admin ON tr_progress_notes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- Register all TR tables in simulation_table_config
-- Controls which tables save_template_snapshot_v2 captures
-- ============================================================================

INSERT INTO simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT 'tr_screening_entries', 'student_work', true, true, true, 7, true,
  'TR Screening Tool entries — is_baseline=true entries are instructor baseline'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config WHERE table_name = 'tr_screening_entries'
);

INSERT INTO simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT 'tr_active_living_profiles', 'student_work', true, true, true, 7, true,
  'TR Active Living Profile narratives — student-written biographical summaries'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config WHERE table_name = 'tr_active_living_profiles'
);

INSERT INTO simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT 'tr_assessment_scores', 'student_work', true, true, true, 7, true,
  'TR assessment battery scores (LCM, LIM, FTB, Berg, RAI MDS, Fitness) — is_baseline=true for pre-seeded instructor data'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config WHERE table_name = 'tr_assessment_scores'
);

INSERT INTO simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT 'tr_treatment_plan_rows', 'student_work', true, true, true, 7, true,
  'TR LAS treatment plan rows — student-entered goals and interventions'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config WHERE table_name = 'tr_treatment_plan_rows'
);

INSERT INTO simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT 'tr_interdisciplinary_interps', 'student_work', true, true, true, 7, true,
  'TR student interpretations of interdisciplinary scores (Berg, RAI MDS, Fitness)'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config WHERE table_name = 'tr_interdisciplinary_interps'
);

INSERT INTO simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT 'tr_progress_notes', 'student_work', true, true, false, 7, true,
  'TR SOAP and narrative progress notes — student entries only (no instructor baseline)'
WHERE NOT EXISTS (
  SELECT 1 FROM simulation_table_config WHERE table_name = 'tr_progress_notes'
);
