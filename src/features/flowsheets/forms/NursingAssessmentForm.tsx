import React, { useCallback, useState } from 'react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import { ChipMultiSelect, ChipSelect, StudentSaveFooter, TextField } from '../components/FormControls';
import type { ChipOption } from '../components/FormControls';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'nursing-assessment' as const;

type AssessmentKind = 'shift' | 'focused' | 'reassessment';
type Consciousness = 'alert' | 'drowsy' | 'stuporous' | 'comatose';
type Priority = 'routine' | 'urgent' | 'emergent';

interface NursingFormData {
  studentName: string;
  assessmentKind: AssessmentKind | '';
  generalAppearance: string;
  levelOfConsciousness: Consciousness | '';
  orientation: string;
  systemsReviewed: string[];
  keyFindings: string;
  priorityLevel: Priority | '';
  followUpRequired: boolean;
  plan: string;
  notes: string;
}

const DEFAULT_FORM: NursingFormData = {
  studentName: '', assessmentKind: '', generalAppearance: '', levelOfConsciousness: '',
  orientation: '', systemsReviewed: [], keyFindings: '', priorityLevel: '',
  followUpRequired: false, plan: '', notes: '',
};

const KIND_OPTIONS: ChipOption<AssessmentKind>[] = [
  { value: 'shift', label: 'Start of shift' },
  { value: 'focused', label: 'Focused' },
  { value: 'reassessment', label: 'Reassessment' },
];

const APPEARANCE_OPTIONS: ChipOption<string>[] = [
  { value: 'Comfortable, no distress', label: 'Comfortable, no distress', tone: 'good' },
  { value: 'Mild distress', label: 'Mild distress', tone: 'warn' },
  { value: 'Acute distress', label: 'Acute distress', tone: 'bad' },
  { value: 'Agitated', label: 'Agitated', tone: 'warn' },
  { value: 'Lethargic', label: 'Lethargic', tone: 'warn' },
];

const LOC_OPTIONS: ChipOption<Consciousness>[] = [
  { value: 'alert', label: 'Alert', tone: 'good' },
  { value: 'drowsy', label: 'Drowsy', tone: 'warn' },
  { value: 'stuporous', label: 'Stuporous', tone: 'bad' },
  { value: 'comatose', label: 'Comatose', tone: 'bad' },
];

const ORIENTATION_OPTIONS: ChipOption<string>[] = [
  { value: 'Oriented x4', label: 'Oriented x4', tone: 'good' },
  { value: 'Oriented x3', label: 'Oriented x3', tone: 'warn' },
  { value: 'Oriented x2', label: 'Oriented x2', tone: 'warn' },
  { value: 'Oriented x1', label: 'Oriented x1', tone: 'bad' },
  { value: 'Disoriented', label: 'Disoriented', tone: 'bad' },
];

const PRIORITY_OPTIONS: ChipOption<Priority>[] = [
  { value: 'routine', label: 'Routine', tone: 'good' },
  { value: 'urgent', label: 'Urgent', tone: 'warn' },
  { value: 'emergent', label: 'Emergent', tone: 'bad' },
];

const SYSTEMS = [
  'Neurological', 'Respiratory', 'Cardiovascular', 'Gastrointestinal', 'Genitourinary',
  'Musculoskeletal', 'Integumentary', 'Pain', 'Psychosocial',
];

function validate(form: NursingFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.levelOfConsciousness) return 'Document level of consciousness.';
  if (!form.priorityLevel) return 'Select a priority level.';
  return null;
}

function formatNursingSummary(data: Record<string, unknown>): AssessmentSummary {
  const priority = data.priorityLevel as Priority | undefined;
  const loc = data.levelOfConsciousness as Consciousness | undefined;
  if (priority === 'emergent') return { label: 'Emergent', color: 'red' };
  if (loc && loc !== 'alert') return { label: `LOC: ${loc}`, color: 'amber' };
  if (priority === 'urgent') return { label: 'Urgent', color: 'amber' };
  return { label: loc === 'alert' ? 'Alert · Routine' : 'Documented', color: loc === 'alert' ? 'green' : 'blue' };
}

export const NursingAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<NursingFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof NursingFormData>(key: K, value: NursingFormData[K]) => {
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE}
        formatSummary={formatNursingSummary} title="Nursing Assessment" />

      <FlowsheetFormSection title="General Survey"
        description="Your overall picture of the patient. Record detailed findings in the system flowsheets (Respiratory, Cardiovascular, Pain…).">
        <ChipSelect label="Assessment Type" options={KIND_OPTIONS} value={form.assessmentKind}
          onChange={v => set('assessmentKind', v)} />
        <ChipSelect label="General Appearance" options={APPEARANCE_OPTIONS} value={form.generalAppearance}
          onChange={v => set('generalAppearance', v)} />
        <ChipSelect label="Level of Consciousness" required options={LOC_OPTIONS} value={form.levelOfConsciousness}
          onChange={v => set('levelOfConsciousness', v)} />
        <ChipSelect label="Orientation" options={ORIENTATION_OPTIONS} value={form.orientation}
          onChange={v => set('orientation', v)} />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Findings">
        <ChipMultiSelect label="Systems Assessed" options={SYSTEMS} value={form.systemsReviewed}
          onChange={v => set('systemsReviewed', v)}
          hint="Tick the systems you assessed. Chart the detail in each system's flowsheet." />
        <TextField label="Key Findings & Changes" rows={3} value={form.keyFindings}
          onChange={v => set('keyFindings', v)}
          placeholder="Significant findings, changes since last assessment, patient concerns…" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Clinical Judgment & Plan">
        <ChipSelect label="Priority Level" required options={PRIORITY_OPTIONS} value={form.priorityLevel}
          onChange={v => set('priorityLevel', v)} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.followUpRequired}
            onChange={e => set('followUpRequired', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-haccare-teal focus:ring-haccare-mint" />
          Follow-up required
        </label>
        <TextField label="Plan / Interventions" rows={3} value={form.plan}
          onChange={v => set('plan', v)} placeholder="Nursing interventions, notifications made, reassessment timing…" />
        <TextField label="Additional Notes" rows={2} value={form.notes} onChange={v => set('notes', v)} />
      </FlowsheetFormSection>

      <StudentSaveFooter
        studentName={form.studentName}
        onStudentNameChange={v => set('studentName', v)}
        attestation="By entering your name, you verify that you assessed this patient and recorded these findings."
        error={validationError ?? (saveError ? 'Save failed. Please try again.' : null)}
        isSaving={isSaving}
        onCancel={onCancel}
      />
    </form>
  );
};
