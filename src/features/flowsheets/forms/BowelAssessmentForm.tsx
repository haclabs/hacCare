import React, { useCallback, useState } from 'react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import { ChipMultiSelect, ChipSelect, StudentSaveFooter, TextField } from '../components/FormControls';
import type { ChipOption } from '../components/FormControls';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'bowel-assessment' as const;

type Occurred = 'yes' | 'no';
type Bristol = '1' | '2' | '3' | '4' | '5' | '6' | '7';

interface BowelFormData {
  studentName: string;
  bowelMovement: Occurred | '';
  lastBowelMovement: string;
  bristolType: Bristol | '';
  colour: string;
  amount: string;
  appearance: string[];
  continence: string;
  management: string[];
  notes: string;
}

const DEFAULT_FORM: BowelFormData = {
  studentName: '', bowelMovement: '', lastBowelMovement: '', bristolType: '', colour: '',
  amount: '', appearance: [], continence: '', management: [], notes: '',
};

const OCCURRED_OPTIONS: ChipOption<Occurred>[] = [
  { value: 'yes', label: 'Bowel movement this shift' },
  { value: 'no', label: 'No bowel movement' },
];

const BRISTOL_OPTIONS: ChipOption<Bristol>[] = [
  { value: '1', label: '1 · Hard lumps', tone: 'warn' },
  { value: '2', label: '2 · Lumpy sausage', tone: 'warn' },
  { value: '3', label: '3 · Cracked sausage', tone: 'good' },
  { value: '4', label: '4 · Smooth, soft', tone: 'good' },
  { value: '5', label: '5 · Soft blobs', tone: 'good' },
  { value: '6', label: '6 · Mushy', tone: 'warn' },
  { value: '7', label: '7 · Watery', tone: 'bad' },
];

const COLOUR_OPTIONS: ChipOption<string>[] = [
  { value: 'Brown', label: 'Brown', tone: 'good' },
  { value: 'Green', label: 'Green', tone: 'warn' },
  { value: 'Yellow', label: 'Yellow', tone: 'warn' },
  { value: 'Clay-coloured', label: 'Clay-coloured', tone: 'warn' },
  { value: 'Black / tarry', label: 'Black / tarry', tone: 'bad' },
  { value: 'Red / maroon', label: 'Red / maroon', tone: 'bad' },
];

const AMOUNT_OPTIONS: ChipOption<string>[] = [
  { value: 'Small', label: 'Small' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Large', label: 'Large' },
];

const CONTINENCE_OPTIONS: ChipOption<string>[] = [
  { value: 'Continent', label: 'Continent', tone: 'good' },
  { value: 'Partially continent', label: 'Partially continent', tone: 'warn' },
  { value: 'Incontinent', label: 'Incontinent', tone: 'warn' },
  { value: 'Ostomy', label: 'Ostomy' },
];

const APPEARANCE = ['Blood present', 'Mucus present', 'Undigested food', 'Foul odour', 'Fatty / floating'];

const MANAGEMENT = [
  'Increase fluids', 'Increase fibre', 'Ambulation encouraged', 'Stool softener given',
  'Laxative given', 'Suppository given', 'Enema given', 'Stool sample sent',
  'Perineal / skin care', 'Ostomy care', 'Physician notified',
];

const RED_FLAG_COLOURS = new Set(['Black / tarry', 'Red / maroon']);

function validate(form: BowelFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.bowelMovement) return 'Record whether the patient had a bowel movement.';
  if (form.bowelMovement === 'yes' && !form.bristolType) return 'Select the Bristol stool type.';
  return null;
}

function formatBowelSummary(data: Record<string, unknown>): AssessmentSummary {
  if (data.bowelMovement === 'no') return { label: 'No BM', color: 'gray' };
  const appearance = (data.appearance as string[] | undefined) ?? [];
  if (appearance.includes('Blood present') || RED_FLAG_COLOURS.has(String(data.colour))) {
    return { label: 'Blood / red flag', color: 'red' };
  }
  const type = Number(data.bristolType);
  if (!type) return { label: 'Documented', color: 'blue' };
  if (type <= 2) return { label: `Type ${type} · constipated`, color: 'amber' };
  if (type >= 6) return { label: `Type ${type} · loose`, color: 'amber' };
  return { label: `Type ${type} · normal`, color: 'green' };
}

export const BowelAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<BowelFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof BowelFormData>(key: K, value: BowelFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const { studentName, ...fields } = form;
    // Stool characteristics are meaningless when no movement occurred, so drop them.
    const clinicalFields = fields.bowelMovement === 'no'
      ? { ...fields, bristolType: '', colour: '', amount: '', appearance: [], continence: '' }
      : { ...fields, lastBowelMovement: '' };
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
        formatSummary={formatBowelSummary} title="Bowel Assessment" />

      <FlowsheetFormSection title="Elimination">
        <ChipSelect label="Bowel Movement" required options={OCCURRED_OPTIONS} value={form.bowelMovement}
          onChange={v => set('bowelMovement', v)} />
        {form.bowelMovement === 'no' && (
          <TextField label="Last Bowel Movement" value={form.lastBowelMovement}
            onChange={v => set('lastBowelMovement', v)} placeholder="e.g. 2 days ago, per patient" />
        )}
      </FlowsheetFormSection>

      {form.bowelMovement === 'yes' && (
        <FlowsheetFormSection title="Stool Characteristics" description="Bristol Stool Scale: types 3–5 are considered normal.">
          <ChipSelect label="Bristol Stool Type" required options={BRISTOL_OPTIONS} value={form.bristolType}
            onChange={v => set('bristolType', v)} />
          <ChipSelect label="Colour" options={COLOUR_OPTIONS} value={form.colour} onChange={v => set('colour', v)} />
          <ChipSelect label="Amount" options={AMOUNT_OPTIONS} value={form.amount} onChange={v => set('amount', v)} />
          <ChipMultiSelect label="Appearance" options={APPEARANCE} value={form.appearance}
            onChange={v => set('appearance', v)} />
          <ChipSelect label="Continence" options={CONTINENCE_OPTIONS} value={form.continence}
            onChange={v => set('continence', v)} />
          {(form.appearance.includes('Blood present') || RED_FLAG_COLOURS.has(form.colour)) && (
            <p className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">
              ⚠ Possible GI bleeding. Notify the physician and follow facility protocol.
            </p>
          )}
        </FlowsheetFormSection>
      )}

      <FlowsheetFormSection title="Bowel Management">
        <ChipMultiSelect label="Interventions" options={MANAGEMENT} value={form.management}
          onChange={v => set('management', v)} />
        <TextField label="Additional Notes" rows={2} value={form.notes} onChange={v => set('notes', v)}
          placeholder="Abdominal discomfort, bowel routine, patient report…" />
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
