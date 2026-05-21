import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'mood' as const;

interface MoodFormData {
  studentName: string;
  affect: 'flat' | 'blunted' | 'normal' | 'elevated' | 'labile' | 'anxious' | '';
  moodPatientReported: string;
  // PHQ-2 items (scored 0-3 each)
  phq2LittleInterest: 0 | 1 | 2 | 3 | -1;
  phq2FeelingDown: 0 | 1 | 2 | 3 | -1;
  // Anxiety
  anxietyLevel: 'none' | 'mild' | 'moderate' | 'severe' | '';
  // Safety
  suicidalIdeation: boolean | null;
  suicidalIdeationDetails: string;
  homicidalIdeation: boolean | null;
  selfHarmHistory: boolean | null;
  currentStressors: string;
  notes: string;
}

const DEFAULT_FORM: MoodFormData = {
  studentName: '', affect: '', moodPatientReported: '',
  phq2LittleInterest: -1, phq2FeelingDown: -1,
  anxietyLevel: '', suicidalIdeation: null, suicidalIdeationDetails: '',
  homicidalIdeation: null, selfHarmHistory: null, currentStressors: '', notes: '',
};

const PHQ2_OPTIONS = [
  { value: 0 as const, label: 'Not at all' },
  { value: 1 as const, label: 'Several days' },
  { value: 2 as const, label: 'More than half the days' },
  { value: 3 as const, label: 'Nearly every day' },
];

function validate(form: MoodFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.affect) return 'Document observed affect.';
  if (form.suicidalIdeation === null) return 'Document suicidal ideation screening result.';
  return null;
}

export function formatMoodSummary(data: Record<string, unknown>): AssessmentSummary {
  const si = data.suicidalIdeation as boolean | null;
  const affect = data.affect as string;
  const phq2Sum = ((data.phq2LittleInterest as number ?? -1) + (data.phq2FeelingDown as number ?? -1));
  if (si === true) return { label: 'Suicidal ideation present', color: 'red' };
  if (phq2Sum >= 3) return { label: `PHQ-2 score ${phq2Sum} — screen positive`, color: 'amber' };
  if (affect) return { label: `Affect: ${affect}`, color: affect === 'normal' ? 'green' : 'amber' };
  return { label: 'Documented', color: 'blue' };
}

export const MoodAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<MoodFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof MoodFormData>(key: K, value: MoodFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const phq2Total = (form.phq2LittleInterest >= 0 ? form.phq2LittleInterest : 0) + (form.phq2FeelingDown >= 0 ? form.phq2FeelingDown : 0);
    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id, tenant_id: tenantId, system_type: SYSTEM_TYPE,
      assessment_data: { ...clinicalFields, phq2Total } as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    await save(payload);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatMoodSummary} />

      <FlowsheetFormSection title="Observed Affect & Reported Mood">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observed Affect <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {['flat', 'blunted', 'normal', 'elevated', 'labile', 'anxious'].map(v => (
                <button key={v} type="button" onClick={() => set('affect', v as MoodFormData['affect'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.affect === v ? v === 'normal' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mood (patient-reported)</label>
            <input type="text" value={form.moodPatientReported} onChange={e => set('moodPatientReported', e.target.value)}
              placeholder={`e.g. "I feel okay" or "I've been feeling really down"`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="PHQ-2 Depression Screening" description="Over the last 2 weeks, how often have you been bothered by…">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Little interest or pleasure in doing things</p>
            <div className="flex gap-2 flex-wrap">
              {PHQ2_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('phq2LittleInterest', opt.value)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${form.phq2LittleInterest === opt.value ? opt.value === 0 ? 'bg-green-50 border-green-400 text-green-700' : opt.value <= 1 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Feeling down, depressed, or hopeless</p>
            <div className="flex gap-2 flex-wrap">
              {PHQ2_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('phq2FeelingDown', opt.value)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${form.phq2FeelingDown === opt.value ? opt.value === 0 ? 'bg-green-50 border-green-400 text-green-700' : opt.value <= 1 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {form.phq2LittleInterest >= 0 && form.phq2FeelingDown >= 0 && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${(form.phq2LittleInterest + form.phq2FeelingDown) >= 3 ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              PHQ-2 Score: {form.phq2LittleInterest + form.phq2FeelingDown} / 6 —{' '}
              {(form.phq2LittleInterest + form.phq2FeelingDown) >= 3 ? 'Positive screen — consider further assessment (PHQ-9)' : 'Negative screen'}
            </div>
          )}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Anxiety">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Anxiety Level</label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'none', l: 'None' }, { v: 'mild', l: 'Mild' }, { v: 'moderate', l: 'Moderate' }, { v: 'severe', l: 'Severe' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('anxietyLevel', v as MoodFormData['anxietyLevel'])}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.anxietyLevel === v ? v === 'none' ? 'bg-green-50 border-green-400 text-green-700' : v === 'severe' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Safety Screening">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suicidal Ideation <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {([{ label: 'Yes — present', value: true }, { label: 'No — denied', value: false }] as const).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => set('suicidalIdeation', opt.value)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.suicidalIdeation === opt.value ? opt.value ? 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form.suicidalIdeation === true && (
              <>
                <p className="mt-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">⚠ Notify clinical supervisor immediately. Follow facility suicide risk protocol.</p>
                <textarea value={form.suicidalIdeationDetails} onChange={e => set('suicidalIdeationDetails', e.target.value)} rows={2}
                  placeholder="Document: passive/active, plan present, intent, means, protective factors…"
                  className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-400 focus:ring-1 focus:ring-red-300 outline-none resize-none" />
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Homicidal Ideation</label>
              <div className="flex gap-2">
                {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => set('homicidalIdeation', opt.value)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${form.homicidalIdeation === opt.value ? opt.value ? 'bg-red-50 border-red-400 text-red-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">History of Self-Harm</label>
              <div className="flex gap-2">
                {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => set('selfHarmHistory', opt.value)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${form.selfHarmHistory === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Current Stressors">
        <textarea value={form.currentStressors} onChange={e => set('currentStressors', e.target.value)} rows={2}
          placeholder="Current life stressors contributing to mood…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Additional mood assessment observations…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Student Name <span className="text-red-500 ml-1">*</span></label>
        <input type="text" value={form.studentName} onChange={e => set('studentName', e.target.value)}
          placeholder="e.g. Jane Smith" autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none" />
        <p className="text-xs text-gray-500">By entering your name, you verify that you assessed this patient and recorded these findings.</p>
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
