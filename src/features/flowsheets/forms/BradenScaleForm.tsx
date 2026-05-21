import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'braden-scale' as const;

interface BradenFormData {
  studentName: string;
  sensoryPerception: 1 | 2 | 3 | 4 | 0;
  moisture: 1 | 2 | 3 | 4 | 0;
  activity: 1 | 2 | 3 | 4 | 0;
  mobility: 1 | 2 | 3 | 4 | 0;
  nutrition: 1 | 2 | 3 | 4 | 0;
  frictionShear: 1 | 2 | 3 | 0;
  notes: string;
}

const DEFAULT_FORM: BradenFormData = {
  studentName: '', sensoryPerception: 0, moisture: 0, activity: 0,
  mobility: 0, nutrition: 0, frictionShear: 0, notes: '',
};

interface BradenSubScale {
  field: keyof Omit<BradenFormData, 'studentName' | 'notes'>;
  label: string;
  max: 3 | 4;
  options: { value: 1 | 2 | 3 | 4; label: string; description: string }[];
}

const SUBSCALES: BradenSubScale[] = [
  {
    field: 'sensoryPerception', label: 'Sensory Perception', max: 4,
    options: [
      { value: 1, label: 'Completely limited', description: 'Does not respond to painful stimuli' },
      { value: 2, label: 'Very limited', description: 'Responds only to pain, cannot communicate discomfort' },
      { value: 3, label: 'Slightly limited', description: 'Responds to verbal commands, mild sensory impairment' },
      { value: 4, label: 'No impairment', description: 'Responds to verbal commands, no sensory deficits' },
    ],
  },
  {
    field: 'moisture', label: 'Moisture', max: 4,
    options: [
      { value: 1, label: 'Constantly moist', description: 'Skin kept moist almost constantly' },
      { value: 2, label: 'Very moist', description: 'Skin often but not always moist' },
      { value: 3, label: 'Occasionally moist', description: 'Skin occasionally moist, extra linen change ~once/day' },
      { value: 4, label: 'Rarely moist', description: 'Skin usually dry, routine changes only' },
    ],
  },
  {
    field: 'activity', label: 'Activity', max: 4,
    options: [
      { value: 1, label: 'Bedfast', description: 'Confined to bed' },
      { value: 2, label: 'Chairfast', description: 'Walks very little or cannot bear own weight' },
      { value: 3, label: 'Walks occasionally', description: 'Walks occasionally with or without assistance' },
      { value: 4, label: 'Walks frequently', description: 'Walks outside room at least twice a day' },
    ],
  },
  {
    field: 'mobility', label: 'Mobility', max: 4,
    options: [
      { value: 1, label: 'Completely immobile', description: 'Does not make even slight body position changes' },
      { value: 2, label: 'Very limited', description: 'Occasionally makes slight changes, cannot independently make frequent or significant position changes' },
      { value: 3, label: 'Slightly limited', description: 'Makes frequent small changes in body or extremity position' },
      { value: 4, label: 'No limitations', description: 'Makes major and frequent changes without assistance' },
    ],
  },
  {
    field: 'nutrition', label: 'Nutrition', max: 4,
    options: [
      { value: 1, label: 'Very poor', description: 'Never eats a complete meal, rarely eats more than 1/3 offered' },
      { value: 2, label: 'Probably inadequate', description: 'Rarely eats a complete meal, eats about half' },
      { value: 3, label: 'Adequate', description: 'Eats more than half of most meals' },
      { value: 4, label: 'Excellent', description: 'Eats most of every meal, never refuses' },
    ],
  },
  {
    field: 'frictionShear', label: 'Friction & Shear', max: 3,
    options: [
      { value: 1, label: 'Problem', description: 'Requires moderate to maximum assistance in moving, constant sliding against sheets' },
      { value: 2, label: 'Potential problem', description: 'Moves feebly or requires minimum assistance, some sliding against sheets' },
      { value: 3, label: 'No apparent problem', description: 'Moves in bed and in chair independently, sufficient muscle strength' },
    ],
  },
];

function getRiskLevel(score: number): { level: string; color: AssessmentSummary['color'] } {
  if (score === 0) return { level: 'Not calculated', color: 'gray' };
  if (score <= 9) return { level: 'Very High Risk', color: 'red' };
  if (score <= 12) return { level: 'High Risk', color: 'red' };
  if (score <= 14) return { level: 'Moderate Risk', color: 'amber' };
  if (score <= 18) return { level: 'Mild Risk', color: 'amber' };
  return { level: 'No Risk', color: 'green' };
}

function validate(form: BradenFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  const allRated = SUBSCALES.every(s => form[s.field] > 0);
  if (!allRated) return 'Rate all six Braden subscales before saving.';
  return null;
}

export function formatBradenSummary(data: Record<string, unknown>): AssessmentSummary {
  const score = (data.totalScore as number) ?? (
    (data.sensoryPerception as number ?? 0) +
    (data.moisture as number ?? 0) +
    (data.activity as number ?? 0) +
    (data.mobility as number ?? 0) +
    (data.nutrition as number ?? 0) +
    (data.frictionShear as number ?? 0)
  );
  const { level, color } = getRiskLevel(score);
  return { label: `Score ${score} — ${level}`, color };
}

export const BradenScaleForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<BradenFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof BradenFormData>(key: K, value: BradenFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const totalScore = useMemo(() => (
    (form.sensoryPerception || 0) + (form.moisture || 0) + (form.activity || 0) +
    (form.mobility || 0) + (form.nutrition || 0) + (form.frictionShear || 0)
  ), [form]);

  const { level, color } = getRiskLevel(totalScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id, tenant_id: tenantId, system_type: SYSTEM_TYPE,
      assessment_data: { ...clinicalFields, totalScore } as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    await save(payload);
    onSaved();
  };

  const scoreBadge = color === 'green' ? 'bg-green-100 border-green-300 text-green-800'
    : color === 'amber' ? 'bg-amber-100 border-amber-300 text-amber-800'
    : color === 'red' ? 'bg-red-100 border-red-300 text-red-800'
    : 'bg-gray-100 border-gray-300 text-gray-700';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatBradenSummary} />

      {/* Running Score Banner */}
      <div className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 ${scoreBadge}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Braden Scale — Total Score</p>
          <p className="text-3xl font-bold mt-0.5">{totalScore > 0 ? totalScore : '—'}<span className="text-base font-normal opacity-60"> / 23</span></p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{level}</p>
          <p className="text-xs opacity-70">Lower score = higher risk</p>
        </div>
      </div>

      <FlowsheetFormSection title="Braden Scale Subscales">
        <div className="space-y-5">
          {SUBSCALES.map(subscale => (
            <div key={subscale.field}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {subscale.label}
                {form[subscale.field] > 0 && (
                  <span className="ml-2 text-xs font-bold text-gray-500">({form[subscale.field]}/{subscale.max})</span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {subscale.options.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => set(subscale.field, opt.value as never)}
                    className={`rounded-lg border p-3 text-left transition-all ${form[subscale.field] === opt.value ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-200' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                    <p className="text-xs font-bold">{opt.value} — {opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Pressure injury prevention plan or additional notes…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Student Name <span className="text-red-500 ml-1">*</span></label>
        <input type="text" value={form.studentName} onChange={e => set('studentName', e.target.value)}
          placeholder="e.g. Jane Smith" autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none" />
        <p className="text-xs text-gray-500">By entering your name, you verify that you completed this assessment.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {(validationError ?? saveError) && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{validationError ?? 'Save failed — please try again.'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={onCancel} disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">Cancel</button>
          <button type="submit" disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>
    </form>
  );
};
