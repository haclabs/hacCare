/**
 * formRegistry.ts
 *
 * Maps flowsheet IDs to their native form components using React.lazy() for
 * automatic code-splitting. Each form module is only downloaded when its card
 * is first opened — keeping the initial Flowsheets Hub bundle lean.
 *
 * ── Adding a new native form (only this file + registry.ts change) ───────────
 *
 *   Step 1 — Create the form component:
 *     src/features/flowsheets/forms/[Name]Form.tsx
 *     Must export a named const implementing FlowsheetFormProps.
 *
 *   Step 2 — Register it here:
 *     'system-type-id': React.lazy(() =>
 *       import('./forms/[Name]Form').then(({ [Name]Form }) => ({ default: [Name]Form }))
 *     ),
 *
 *   Step 3 — Flip status in registry.ts:
 *     status: 'active'   ← was 'coming-soon'
 *
 *   FlowsheetsHub, FlowsheetFormWrapper, and all other files stay unchanged.
 *
 * ── Database wiring: none ─────────────────────────────────────────────────────
 *   All forms share patient_system_assessments, which reset, snapshot, debrief
 *   and print already handle. The form's save payload must include
 *   system_type (= the card's systemType), nurse_name (required student name)
 *   and is_baseline: isBaseline — registry.test.ts checks all three.
 */

import React from 'react';
import type { FlowsheetFormProps } from './types';

/** A lazily-loaded flowsheet form component. */
export type LazyFormComponent = React.LazyExoticComponent<
  React.ComponentType<FlowsheetFormProps>
>;

/**
 * Registry of active native form components, keyed by FlowsheetDefinition.id.
 * All values use React.lazy() — FlowsheetFormWrapper provides the Suspense
 * boundary so the form header is always visible during the load.
 *
 * Entries are added here one-by-one as forms graduate from 'coming-soon'.
 */
export const FORM_COMPONENTS: Readonly<Partial<Record<string, LazyFormComponent>>> = {
  'pain': React.lazy(() =>
    import('./forms/PainAssessmentForm').then(({ PainAssessmentForm }) => ({ default: PainAssessmentForm }))
  ),
  'respiratory': React.lazy(() =>
    import('./forms/RespiratoryAssessmentForm').then(({ RespiratoryAssessmentForm }) => ({ default: RespiratoryAssessmentForm }))
  ),
  'cardiovascular': React.lazy(() =>
    import('./forms/CardiovascularAssessmentForm').then(({ CardiovascularAssessmentForm }) => ({ default: CardiovascularAssessmentForm }))
  ),
  'gastrointestinal': React.lazy(() =>
    import('./forms/GastrointestinalAssessmentForm').then(({ GastrointestinalAssessmentForm }) => ({ default: GastrointestinalAssessmentForm }))
  ),
  'genitourinary': React.lazy(() =>
    import('./forms/GenitourinaryAssessmentForm').then(({ GenitourinaryAssessmentForm }) => ({ default: GenitourinaryAssessmentForm }))
  ),
  'musculoskeletal': React.lazy(() =>
    import('./forms/MusculoskeletalAssessmentForm').then(({ MusculoskeletalAssessmentForm }) => ({ default: MusculoskeletalAssessmentForm }))
  ),
  'integumentary': React.lazy(() =>
    import('./forms/IntegumentaryAssessmentForm').then(({ IntegumentaryAssessmentForm }) => ({ default: IntegumentaryAssessmentForm }))
  ),
  'fall-risk': React.lazy(() =>
    import('./forms/FallRiskAssessmentForm').then(({ FallRiskAssessmentForm }) => ({ default: FallRiskAssessmentForm }))
  ),
  'braden-scale': React.lazy(() =>
    import('./forms/BradenScaleForm').then(({ BradenScaleForm }) => ({ default: BradenScaleForm }))
  ),
  'restraint': React.lazy(() =>
    import('./forms/RestraintAssessmentForm').then(({ RestraintAssessmentForm }) => ({ default: RestraintAssessmentForm }))
  ),
  'biopsychosocial': React.lazy(() =>
    import('./forms/BiopsychosocialAssessmentForm').then(({ BiopsychosocialAssessmentForm }) => ({ default: BiopsychosocialAssessmentForm }))
  ),
  'cognitive-screening': React.lazy(() =>
    import('./forms/CognitiveScreeningForm').then(({ CognitiveScreeningForm }) => ({ default: CognitiveScreeningForm }))
  ),
  'mood-assessment': React.lazy(() =>
    import('./forms/MoodAssessmentForm').then(({ MoodAssessmentForm }) => ({ default: MoodAssessmentForm }))
  ),
  'bowel': React.lazy(() =>
    import('./forms/BowelAssessmentForm').then(({ BowelAssessmentForm }) => ({ default: BowelAssessmentForm }))
  ),
  'nursing-assessment': React.lazy(() =>
    import('./forms/NursingAssessmentForm').then(({ NursingAssessmentForm }) => ({ default: NursingAssessmentForm }))
  ),
  'admission-assessment': React.lazy(() =>
    import('./forms/AdmissionAssessmentForm').then(({ AdmissionAssessmentForm }) => ({ default: AdmissionAssessmentForm }))
  ),
  'consents': React.lazy(() =>
    import('./forms/ConsentForm').then(({ ConsentForm }) => ({ default: ConsentForm }))
  ),
  'bpmh': React.lazy(() =>
    import('./forms/BPMHForm').then(({ BPMHForm }) => ({ default: BPMHForm }))
  ),
};
