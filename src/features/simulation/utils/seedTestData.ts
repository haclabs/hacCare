/**
 * Dev-only test data seeder for the simulation lifecycle validation tool.
 *
 * Fills ONE representative row into every clinical/patient table for each
 * patient in a template tenant, using the app's REAL save functions/hooks —
 * not raw SQL — so it exercises the actual save path, validation, and RLS,
 * the same as a human filling out every form by hand.
 *
 * Every row is tagged with QA_MARKER so seeded data is never confused with
 * real content and is trivially identifiable for cleanup or auditing.
 *
 * Used by TemplateEditingBanner (super_admin only) to validate that new
 * flowsheet tables are correctly wired through: template snapshot capture,
 * simulation launch, debrief reporting, and reset.
 */

import { getPatientsByTenant, addBBITEntry, addNeuroAssessment, saveNewbornAssessment } from '../../../services/patient/multiTenantPatientService';
import { updatePatientVitals, createPatientNote } from '../../../services/patient/patientService';
import { upsertAdmissionRecord } from '../../../services/patient/admissionService';
import { upsertAdvancedDirective } from '../../../api/advancedDirectives';
import { createHandoverNote } from '../../../services/patient/handoverService';
import { createIntakeOutputEvent } from '../../../services/clinical/intakeOutputService';
import { createMedication, recordMedicationAdministration } from '../../../services/clinical/medicationService';
import { createLabOrder } from '../../../services/clinical/labOrderService';
import { createLabPanel, createLabResult } from '../../../services/clinical/labService';
import { createDoctorsOrder } from '../../../services/clinical/doctorsOrdersService';
import { createBowelRecord } from '../../../services/clinical/bowelRecordService';
import { createAvatarLocation, createDevice, createWound } from '../../hacmap/api';
import { createAssessment } from '../../../services/hacmap/assessmentService';
import { createDeviceAssessment } from '../../../services/hacmap/deviceAssessmentService';
import { insertSystemAssessment } from '../../flowsheets/hooks/useSystemAssessment';
import { upsertScreening } from '../../therapeutic-recreation/hooks/useTRScreening';
import { upsertActiveLivingProfile } from '../../therapeutic-recreation/hooks/useActiveLivingProfile';
import { insertAssessmentScore } from '../../therapeutic-recreation/hooks/useAssessmentScores';
import { insertTreatmentPlanRow } from '../../therapeutic-recreation/hooks/useTreatmentPlan';
import { upsertInterpretation } from '../../therapeutic-recreation/hooks/useTRInterpretations';
import { insertProgressNote } from '../../therapeutic-recreation/hooks/useProgressNotes';

/** Recognizable marker written into every seeded row's name/notes field. */
export const QA_MARKER = 'QA_VALIDATION';

/** The 15 native flowsheet system_types that share patient_system_assessments. */
const NATIVE_SYSTEM_TYPES = [
  'pain', 'respiratory', 'cardiovascular', 'gastrointestinal', 'genitourinary',
  'musculoskeletal', 'integumentary', 'fall-risk', 'braden-scale', 'restraint',
  'biopsychosocial', 'cognitive', 'mood', 'consent', 'bpmh',
] as const;

export interface SeedDomainResult {
  domain: string;
  success: boolean;
  error?: string;
}

export interface SeedPatientResult {
  patientId: string;
  patientName: string;
  results: SeedDomainResult[];
}

async function attempt(domain: string, fn: () => Promise<unknown>): Promise<SeedDomainResult> {
  try {
    await fn();
    return { domain, success: true };
  } catch (error) {
    return { domain, success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Seeds one representative row into every clinical table for every patient
 * in the given tenant. Sequential (not parallel) — some domains are upserts
 * keyed on patient_id and must not race each other.
 */
export async function seedTestDataForTenant(
  tenantId: string,
  currentUser: { id: string; name: string },
): Promise<SeedPatientResult[]> {
  const { data: patients, error: patientsError } = await getPatientsByTenant(tenantId);
  if (patientsError || !patients) {
    throw new Error(`Could not load patients for tenant: ${patientsError?.message ?? 'unknown error'}`);
  }

  const patientResults: SeedPatientResult[] = [];

  for (const patient of patients) {
    const patientId = patient.id;
    const patientName = `${patient.first_name} ${patient.last_name}`;
    const results: SeedDomainResult[] = [];

    // ── Vitals ────────────────────────────────────────────────────────────
    results.push(await attempt('vitals', () =>
      updatePatientVitals(patientId, {
        temperature: 37.1,
        bloodPressure: { systolic: 118, diastolic: 76 },
        heartRate: 78,
        respiratoryRate: 16,
        oxygenSaturation: 98,
      }, QA_MARKER)
    ));

    // ── Notes & alerts ────────────────────────────────────────────────────
    results.push(await attempt('patient_notes', () =>
      createPatientNote({
        patient_id: patientId,
        nurse_id: currentUser.id,
        nurse_name: QA_MARKER,        student_name: QA_MARKER,        type: 'General',
        content: `${QA_MARKER} seeded note`,
        priority: 'low',
      })
    ));

    // ── Medications + administration ─────────────────────────────────────
    results.push(await attempt('patient_medications', async () => {
      const med = await createMedication({
        patient_id: patientId,
        name: `${QA_MARKER} Medication`,
        dosage: '10mg',
        frequency: 'Once daily',
        route: 'PO',
        start_date: new Date().toISOString(),
        next_due: new Date().toISOString(),
        prescribed_by: QA_MARKER,
        status: 'Active',
        category: 'scheduled',
      });
      await recordMedicationAdministration({
        medication_id: med.id,
        patient_id: patientId,
        administered_by: QA_MARKER,
        administered_by_id: currentUser.id,
        student_name: QA_MARKER,
        timestamp: new Date().toISOString(),
        notes: `${QA_MARKER} seeded administration`,
      });
    }));

    // ── Labs (panel -> order -> result) ───────────────────────────────────
    results.push(await attempt('lab_orders', () =>
      createLabOrder({
        patient_id: patientId,
        order_date: new Date().toISOString().slice(0, 10),
        order_time: new Date().toISOString().slice(11, 16),
        procedure_category: 'Blood',
        procedure_type: 'CBC',
        source_category: 'Venipuncture',
        source_type: 'Lab',
        student_name: QA_MARKER,
        verified_by: currentUser.id, // uuid column — references the verifying user, not a display name
      }, tenantId)
    ));

    results.push(await attempt('lab_panels_and_results', async () => {
      const { data: panel, error } = await createLabPanel({
        patient_id: patientId,
        panel_time: new Date().toISOString(),
        source: `${QA_MARKER} seeded panel`,
      }, tenantId);
      if (error || !panel) throw new Error(error?.message ?? 'Failed to create lab panel');

      const { error: resultError } = await createLabResult({
        panel_id: panel.id,
        category: 'chemistry',
        test_code: 'NA',
        test_name: 'Sodium',
        value: 140,
        units: 'mmol/L',
        ref_low: 135,
        ref_high: 145,
        ref_operator: 'between',
        comments: `${QA_MARKER} seeded result`,
      }, patientId, tenantId);
      if (resultError) throw new Error(resultError.message ?? 'Failed to create lab result');
    }));

    // ── hacMap: avatar locations, devices, wounds, assessments ────────────
    results.push(await attempt('devices_and_avatar_locations', async () => {
      const deviceLocation = await createAvatarLocation({
        tenant_id: tenantId,
        patient_id: patientId,
        region_key: 'left-arm',
        x_percent: 40,
        y_percent: 50,
        created_by: currentUser.id,
      });
      const device = await createDevice({
        tenant_id: tenantId,
        patient_id: patientId,
        location_id: deviceLocation.id,
        type: 'iv-peripheral',
        placement_date: new Date().toISOString().slice(0, 10),
        notes: `${QA_MARKER} seeded device`,
        inserted_by: QA_MARKER,
        created_by: currentUser.id,
      });
      await createDeviceAssessment({
        device_id: device.id,
        patient_id: patientId,
        tenant_id: tenantId,
        student_name: QA_MARKER,
        device_type: 'iv-peripheral',
        notes: `${QA_MARKER} seeded device assessment`,
      });
    }));

    results.push(await attempt('wounds_and_assessments', async () => {
      const woundLocation = await createAvatarLocation({
        tenant_id: tenantId,
        patient_id: patientId,
        region_key: 'lower-back',
        x_percent: 50,
        y_percent: 60,
        created_by: currentUser.id,
      });
      const wound = await createWound({
        tenant_id: tenantId,
        patient_id: patientId,
        location_id: woundLocation.id,
        wound_type: 'pressure-injury',
        wound_length_cm: 2,
        wound_width_cm: 1,
        notes: `${QA_MARKER} seeded wound`,
        entered_by: QA_MARKER,
        created_by: currentUser.id,
      });
      await createAssessment({
        wound_id: wound.id,
        patient_id: patientId,
        tenant_id: tenantId,
        student_name: QA_MARKER,
        notes: `${QA_MARKER} seeded wound assessment`,
      });
    }));

    // ── Admission / advanced directives ──────────────────────────────────
    results.push(await attempt('patient_admission_records', () =>
      upsertAdmissionRecord({
        patient_id: patientId,
        admission_type: 'Elective',
        attending_physician: QA_MARKER,
        insurance_provider: QA_MARKER,
        insurance_policy: QA_MARKER,
        admission_source: 'Emergency',
        chief_complaint: `${QA_MARKER} seeded chief complaint`,
        height: '170cm',
        weight: '70kg',
        bmi: '24.2',
        smoking_status: 'Never',
        alcohol_use: 'None',
        exercise: 'Moderate',
        occupation: QA_MARKER,
        family_history: QA_MARKER,
        marital_status: 'Single',
        secondary_contact_name: QA_MARKER,
        secondary_contact_relationship: 'Friend',
        secondary_contact_phone: '555-0100',
        secondary_contact_address: QA_MARKER,
      })
    ));

    results.push(await attempt('patient_advanced_directives', () =>
      upsertAdvancedDirective({
        patient_id: patientId,
        student_name: QA_MARKER,
        dnr_status: 'R1',
        living_will_exists: false,
        organ_donation_status: false,
        healthcare_proxy_name: QA_MARKER,
        religious_preference: QA_MARKER,
        special_instructions: `${QA_MARKER} seeded directive`,
      })
    ));

    // ── BBIT / neuro / newborn ────────────────────────────────────────────
    results.push(await attempt('patient_bbit_entries', () =>
      addBBITEntry(patientId, tenantId, {
        time_label: '0800',
        glucose_value: 5.5,
        recorded_at: new Date().toISOString(),
      }, QA_MARKER)
    ));

    results.push(await attempt('patient_neuro_assessments', () =>
      addNeuroAssessment(patientId, tenantId, {
        level_of_consciousness: 'Alert',
        gcs_eye: 4,
        gcs_verbal: 5,
        gcs_motor: 6,
        recorded_at: new Date().toISOString(),
      }, QA_MARKER)
    ));

    results.push(await attempt('patient_newborn_assessments', () =>
      saveNewbornAssessment(patientId, tenantId, {
        weight_grams: 3200,
        apgar_1min: 8,
        apgar_5min: 9,
        student_name: QA_MARKER,
        recorded_at: new Date().toISOString(),
      })
    ));

    results.push(await attempt('patient_intake_output_events', () =>
      createIntakeOutputEvent({
        patient_id: patientId,
        tenant_id: tenantId,
        direction: 'intake',
        category: 'oral',
        amount_ml: 250,
        event_timestamp: new Date().toISOString(),
        student_name: QA_MARKER,
      })
    ));

    // ── Doctors orders / handover / bowel ─────────────────────────────────
    results.push(await attempt('doctors_orders', () =>
      createDoctorsOrder({
        patient_id: patientId,
        order_date: new Date().toISOString().slice(0, 10),
        order_time: new Date().toISOString().slice(11, 16),
        order_text: `${QA_MARKER} seeded order`,
        ordering_doctor: QA_MARKER,
        order_type: 'Direct',
      })
    ));

    results.push(await attempt('handover_notes', () =>
      createHandoverNote({
        patient_id: patientId,
        situation: `${QA_MARKER} seeded situation`,
        background: `${QA_MARKER} seeded background`,
        assessment: `${QA_MARKER} seeded assessment`,
        recommendations: `${QA_MARKER} seeded recommendations`,
        shift: 'day',
        priority: 'low',
        created_by: currentUser.id,
        created_by_name: QA_MARKER,
        created_by_role: 'nurse',
        student_name: QA_MARKER,
      })
    ));

    results.push(await attempt('bowel_records', () =>
      createBowelRecord({
        patient_id: patientId,
        nurse_id: currentUser.id,
        nurse_name: QA_MARKER,
        student_name: QA_MARKER,
        recorded_at: new Date().toISOString(),
        bowel_incontinence: 'Continent',
        stool_appearance: 'Normal',
        stool_consistency: 'Formed',
        stool_colour: 'Brown',
        stool_amount: 'Moderate',
        notes: `${QA_MARKER} seeded bowel record`,
      })
    ));

    // ── 15 native system assessments (shared patient_system_assessments) ──
    for (const systemType of NATIVE_SYSTEM_TYPES) {
      results.push(await attempt(`system_assessment:${systemType}`, () =>
        insertSystemAssessment({
          patient_id: patientId,
          tenant_id: tenantId,
          system_type: systemType,
          assessment_data: { note: `${QA_MARKER} seeded ${systemType} assessment`, seeded: true },
          nurse_id: currentUser.id,
          nurse_name: QA_MARKER,
          is_baseline: false,
        })
      ));
    }

    // ── Therapeutic Recreation module (6 tables) ──────────────────────────
    results.push(await attempt('tr_screening_entries', () =>
      upsertScreening({
        patient_id: patientId,
        tenant_id: tenantId,
        is_baseline: false,
        experiences_boredom: false,
        boredom_frequency: null,
        takes_initiative: true,
        social_contact_frequency: 'Daily',
        social_support: null,
        social_contact_performance: null,
        social_engagement_rating: 4,
        social_comments: `${QA_MARKER} seeded screening`,
        community_frequency: null,
        community_participation_pattern: null,
        balance_active_passive: null,
        community_accessibility: null,
        leisure_satisfaction_rating: 4,
        leisure_participation_notes: null,
        leisure_barriers_description: null,
        personal_barriers: null,
        functional_barriers: null,
        social_barriers: null,
        environmental_barriers: null,
        readiness_to_participate: 4,
        lcm_leisure_attitude_score: null,
        lcm_social_contact_score: null,
        lcm_community_participation_score: null,
        tr_recommendation: 'independent',
        clinician_signature: QA_MARKER,
        completed_at: new Date().toISOString(),
        recorded_by: QA_MARKER,
      })
    ));

    results.push(await attempt('tr_active_living_profiles', () =>
      upsertActiveLivingProfile({
        patient_id: patientId,
        tenant_id: tenantId,
        is_baseline: false,
        narrative: `${QA_MARKER} seeded active living profile`,
        recorded_by: QA_MARKER,
        recorded_by_user_id: currentUser.id,
      })
    ));

    results.push(await attempt('tr_assessment_scores', () =>
      insertAssessmentScore({
        patient_id: patientId,
        tenant_id: tenantId,
        is_baseline: false,
        tool_name: 'berg',
        subscale_scores: { total: 45 },
        total_score: 45,
        interpretation: `${QA_MARKER} seeded score`,
        date_administered: new Date().toISOString().slice(0, 10),
        administered_by: QA_MARKER,
        recorded_by: QA_MARKER,
        recorded_by_user_id: currentUser.id,
      })
    ));

    results.push(await attempt('tr_treatment_plan_rows', () =>
      insertTreatmentPlanRow({
        patient_id: patientId,
        tenant_id: tenantId,
        is_baseline: false,
        sort_order: 0,
        target_area: `${QA_MARKER} seeded target`,
        goal: `${QA_MARKER} seeded goal`,
        objective_1: `${QA_MARKER} seeded objective`,
        objective_2: null,
        objective_3: null,
        intervention: `${QA_MARKER} seeded intervention`,
        clinician_signature: QA_MARKER,
        plan_date: new Date().toISOString().slice(0, 10),
        recorded_by: QA_MARKER,
      })
    ));

    results.push(await attempt('tr_interdisciplinary_interps', () =>
      upsertInterpretation({
        patient_id: patientId,
        tenant_id: tenantId,
        is_baseline: false,
        score_group: 'berg',
        interpretation: `${QA_MARKER} seeded interpretation`,
        recorded_by: QA_MARKER,
        recorded_by_user_id: currentUser.id,
      })
    ));

    results.push(await attempt('tr_progress_notes', () =>
      insertProgressNote({
        patient_id: patientId,
        tenant_id: tenantId,
        note_type: 'narrative',
        subjective: null,
        objective: null,
        assessment: null,
        plan: null,
        narrative: `${QA_MARKER} seeded progress note`,
        note_date: new Date().toISOString().slice(0, 10),
        note_time: new Date().toISOString().slice(11, 16),
        clinician_name: QA_MARKER,
        recorded_by_user_id: currentUser.id,
      })
    ));

    patientResults.push({ patientId, patientName, results });
  }

  return patientResults;
}

/**
 * Not yet wired into the seeder — no create function exists in the TypeScript
 * layer for these tables (patient_alerts is system-generated by triggers on
 * medication/vitals events, not user-authored; diabetic_records has no
 * service layer at all — possibly dead). Flagged here rather than silently
 * skipped so future maintainers know they were considered.
 */
export const SEEDER_KNOWN_GAPS = ['patient_alerts', 'diabetic_records'] as const;
