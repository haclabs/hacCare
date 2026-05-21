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
 * ── Database wiring (required per project guide) ─────────────────────────────
 *   Follow the 4-part checklist in .github/copilot-instructions.md under
 *   "CRITICAL: Adding a New Clinical Table" for reset functions, snapshot
 *   config, studentActivityService, and EnhancedDebriefModal.
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
  'cognitive': React.lazy(() =>
    import('./forms/CognitiveScreeningForm').then(({ CognitiveScreeningForm }) => ({ default: CognitiveScreeningForm }))
  ),
  'mood': React.lazy(() =>
    import('./forms/MoodAssessmentForm').then(({ MoodAssessmentForm }) => ({ default: MoodAssessmentForm }))
  ),
  'tr-leisure-interest': React.lazy(() =>
    import('./forms/TRLeisureInterestForm').then(({ TRLeisureInterestForm }) => ({ default: TRLeisureInterestForm }))
  ),
  'tr-functional': React.lazy(() =>
    import('./forms/TRFunctionalAssessmentForm').then(({ TRFunctionalAssessmentForm }) => ({ default: TRFunctionalAssessmentForm }))
  ),
  'tr-social': React.lazy(() =>
    import('./forms/TRSocialParticipationForm').then(({ TRSocialParticipationForm }) => ({ default: TRSocialParticipationForm }))
  ),
  'tr-goals': React.lazy(() =>
    import('./forms/TRGoalSettingForm').then(({ TRGoalSettingForm }) => ({ default: TRGoalSettingForm }))
  ),
  'tr-participation': React.lazy(() =>
    import('./forms/TRActivityNoteForm').then(({ TRActivityNoteForm }) => ({ default: TRActivityNoteForm }))
  ),
  'tr-qol': React.lazy(() =>
    import('./forms/TRQualityOfLifeForm').then(({ TRQualityOfLifeForm }) => ({ default: TRQualityOfLifeForm }))
  ),
};
