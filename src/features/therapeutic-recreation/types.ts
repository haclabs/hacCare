/**
 * types.ts — Therapeutic Recreation Module
 *
 * TypeScript interfaces matching every TR table defined in:
 *   database/migrations/20260527000000_create_tr_module_tables.sql
 */

// ── Database row types ────────────────────────────────────────────────────────

export interface TRScreeningEntry {
  id: string;
  patient_id: string;
  tenant_id: string;
  is_baseline: boolean;

  // Part 1 — Leisure Participation / Attitude
  experiences_boredom: boolean | null;
  boredom_frequency: string | null;
  takes_initiative: boolean | null;

  // Part 1 — Social Contact
  social_contact_frequency: string | null;
  social_support: string[] | null;
  social_contact_performance: string | null;
  social_engagement_rating: number | null;
  social_comments: string | null;

  // Part 1 — Community Participation
  community_frequency: string | null;
  community_participation_pattern: string[] | null;
  balance_active_passive: boolean | null;
  community_accessibility: string[] | null;

  // Part 1 — Leisure Satisfaction
  leisure_satisfaction_rating: number | null;
  leisure_participation_notes: string | null;

  // Part 2 — Barriers
  leisure_barriers_description: string | null;
  personal_barriers: string[] | null;
  functional_barriers: string[] | null;
  social_barriers: string[] | null;
  environmental_barriers: string[] | null;
  readiness_to_participate: number | null;

  // LCM Screen Summary
  lcm_leisure_attitude_score: number | null;
  lcm_social_contact_score: number | null;
  lcm_community_participation_score: number | null;

  // Recommendation
  tr_recommendation: 'treatment' | 'independent' | 'not_priority' | null;

  clinician_signature: string | null;
  completed_at: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TRActiveLivingProfile {
  id: string;
  patient_id: string;
  tenant_id: string;
  is_baseline: boolean;
  narrative: string | null;
  recorded_by: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * tr_assessment_scores — one row per tool submission.
 *
 * tool_name discriminator values:
 *   'lcm'         — Leisure Competence Measure (8-component, pre-seeded)
 *   'lim'         — Leisure Interest Measure (student-entered, copyrighted)
 *   'lam'         — Leisure Attitude Measure (template-only)
 *   'lsm'         — Leisure Satisfaction Measure (template-only)
 *   'ftb'         — Free Time Boredom (student-entered, copyrighted)
 *   'berg'        — Berg Balance Scale (pre-seeded, physiotherapy)
 *   'rai_mds'     — RAI MDS Home Care (pre-seeded, interdisciplinary team)
 *   'fitness'     — Fitness Testing (pre-seeded, Recreation Therapist)
 *   'life_history'— Life History biographical form (pre-seeded)
 *   'rii'         — Recreation Interest Inventory (pre-seeded)
 */
export interface TRAssessmentScore {
  id: string;
  patient_id: string;
  tenant_id: string;
  is_baseline: boolean;
  tool_name: string;
  subscale_scores: Record<string, unknown> | null;
  total_score: number | null;
  interpretation: string | null;
  date_administered: string | null;
  administered_by: string | null;
  recorded_by: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TRTreatmentPlanRow {
  id: string;
  patient_id: string;
  tenant_id: string;
  is_baseline: boolean;
  sort_order: number;
  target_area: string | null;
  goal: string | null;
  objective_1: string | null;
  objective_2: string | null;
  objective_3: string | null;
  intervention: string | null;
  clinician_signature: string | null;
  plan_date: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TRInterdisciplinaryInterp {
  id: string;
  patient_id: string;
  tenant_id: string;
  is_baseline: boolean;
  score_group: 'berg' | 'rai_mds' | 'fitness';
  interpretation: string | null;
  recorded_by: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TRProgressNote {
  id: string;
  patient_id: string;
  tenant_id: string;
  note_type: 'soap' | 'narrative';
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  narrative: string | null;
  note_date: string;
  note_time: string | null;
  clinician_name: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
}

// ── Component / UI types ──────────────────────────────────────────────────────

/** One row of the 8-component LCM table */
export interface LCMComponentData {
  name: string;
  score: number;
  description: string;
}

/** Config for a single subscale row in the IALB score panel */
export interface SubscaleConfig {
  key: string;
  label: string;
}

/** Draft state for writing a new treatment plan row */
export interface TreatmentPlanDraft {
  target_area: string;
  goal: string;
  objective_1: string;
  objective_2: string;
  objective_3: string;
  intervention: string;
}

/** Current user passed down from ModuleContent */
export interface TRCurrentUser {
  id: string;
  name: string;
  role: string;
  department?: string;
}
