import React, { useCallback, useState } from 'react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import { ChipSelect, StudentSaveFooter, TextField } from '../components/FormControls';
import type { ChipOption } from '../components/FormControls';
import { AdmissionChartPanel } from '../components/AdmissionChartPanel';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'admission-assessment' as const;

type AllergyCheck = 'matches' | 'discrepancy' | 'unable';

interface AdmissionFormData {
  studentName: string;
  admittingDiagnosis: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  allergyVerification: AllergyCheck | '';
  allergyNotes: string;
  orientation: string;
  mobilityStatus: string;
  livingArrangements: string;
  supportPerson: string;
  carePriorities: string;
  notes: string;
}

const DEFAULT_FORM: AdmissionFormData = {
  studentName: '', admittingDiagnosis: '', chiefComplaint: '', historyOfPresentIllness: '',
  allergyVerification: '', allergyNotes: '', orientation: '', mobilityStatus: '',
  livingArrangements: '', supportPerson: '', carePriorities: '', notes: '',
};

const ALLERGY_OPTIONS: ChipOption<AllergyCheck>[] = [
  { value: 'matches', label: 'Verified, matches chart', tone: 'good' },
  { value: 'discrepancy', label: 'Discrepancy found', tone: 'bad' },
  { value: 'unable', label: 'Unable to verify', tone: 'warn' },
];

const ORIENTATION_OPTIONS: ChipOption<string>[] = [
  { value: 'Oriented x4', label: 'Oriented x4', tone: 'good' },
  { value: 'Oriented x3', label: 'Oriented x3', tone: 'warn' },
  { value: 'Oriented x2', label: 'Oriented x2', tone: 'warn' },
  { value: 'Oriented x1', label: 'Oriented x1', tone: 'bad' },
  { value: 'Disoriented', label: 'Disoriented', tone: 'bad' },
];

const MOBILITY_OPTIONS: ChipOption<string>[] = [
  { value: 'Independent', label: 'Independent', tone: 'good' },
  { value: 'Needs assistance', label: 'Needs assistance', tone: 'warn' },
  { value: 'Wheelchair', label: 'Wheelchair', tone: 'warn' },
  { value: 'Bedbound', label: 'Bedbound', tone: 'bad' },
];

function validate(form: AdmissionFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.admittingDiagnosis.trim()) return 'Enter the admitting diagnosis.';
  if (!form.chiefComplaint.trim()) return 'Enter the chief complaint.';
  return null;
}

function formatAdmissionSummary(data: Record<string, unknown>): AssessmentSummary {
  if (data.allergyVerification === 'discrepancy') return { label: 'Allergy discrepancy', color: 'red' };
  const dx = String(data.admittingDiagnosis ?? '').trim();
  if (!dx) return { label: 'Documented', color: 'blue' };
  return { label: dx.length > 22 ? `${dx.slice(0, 21)}…` : dx, color: 'blue' };
}

export const AdmissionAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<AdmissionFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof AdmissionFormData>(key: K, value: AdmissionFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id, tenant_id: tenantId, system_type: SYSTEM_TYPE,
      assessment_data: clinicalFields as unknown as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    try {
      await save(payload);
      onSaved();
    } catch {
      // saveError from the mutation renders the message below
    }
  };

  return (
    <div className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE}
        formatSummary={formatAdmissionSummary} title="Admission Assessment" />

      {/* Kept outside the <form> so its own inputs and buttons never submit the assessment. */}
      <AdmissionChartPanel patient={patient} tenantId={tenantId} userRole={currentUser?.role} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FlowsheetFormSection title="Reason for Admission">
          <TextField label="Admitting Diagnosis" required value={form.admittingDiagnosis}
            onChange={v => set('admittingDiagnosis', v)} placeholder="e.g. Community-acquired pneumonia" />
          <TextField label="Chief Complaint" required rows={2} value={form.chiefComplaint}
            onChange={v => set('chiefComplaint', v)} placeholder="In the patient's own words…" />
          <TextField label="History of Present Illness" rows={3} value={form.historyOfPresentIllness}
            onChange={v => set('historyOfPresentIllness', v)} placeholder="Onset, duration, severity, what makes it better or worse…" />
        </FlowsheetFormSection>

        <FlowsheetFormSection title="Allergies & Medications"
          description="Record home medications in the BPMH flowsheet and admission vitals in Vital Signs.">
          <ChipSelect label="Allergy Verification" options={ALLERGY_OPTIONS} value={form.allergyVerification}
            onChange={v => set('allergyVerification', v)} />
          <TextField label="Allergy Notes" rows={2} value={form.allergyNotes}
            onChange={v => set('allergyNotes', v)} placeholder="Allergen, reaction, severity, or what differs from the chart…" />
        </FlowsheetFormSection>

        <FlowsheetFormSection title="Initial Assessment">
          <ChipSelect label="Orientation" options={ORIENTATION_OPTIONS} value={form.orientation}
            onChange={v => set('orientation', v)} />
          <ChipSelect label="Mobility Status" options={MOBILITY_OPTIONS} value={form.mobilityStatus}
            onChange={v => set('mobilityStatus', v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Living Arrangements" value={form.livingArrangements}
              onChange={v => set('livingArrangements', v)} placeholder="Lives alone, with family, LTC…" />
            <TextField label="Support Person" value={form.supportPerson}
              onChange={v => set('supportPerson', v)} placeholder="Name and relationship" />
          </div>
        </FlowsheetFormSection>

        <FlowsheetFormSection title="Plan">
          <TextField label="Initial Care Priorities" rows={3} value={form.carePriorities}
            onChange={v => set('carePriorities', v)} placeholder="Top nursing priorities for this admission…" />
          <TextField label="Additional Notes" rows={2} value={form.notes} onChange={v => set('notes', v)} />
        </FlowsheetFormSection>

        <StudentSaveFooter
          studentName={form.studentName}
          onStudentNameChange={v => set('studentName', v)}
          attestation="By entering your name, you verify that you completed this admission assessment."
          error={validationError ?? (saveError ? 'Save failed. Please try again.' : null)}
          isSaving={isSaving}
          onCancel={onCancel}
        />
      </form>
    </div>
  );
};
