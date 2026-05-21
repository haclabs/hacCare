import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'biopsychosocial' as const;

interface BiopsychosocialFormData {
  studentName: string;
  presentingConcern: string;
  psychologicalMood: 'euthymic' | 'depressed' | 'anxious' | 'irritable' | 'elevated' | 'labile' | '';
  psychologicalAffect: 'congruent' | 'flat' | 'blunted' | 'incongruent' | '';
  insightJudgement: 'intact' | 'partial' | 'poor' | '';
  socialSupport: 'strong' | 'moderate' | 'limited' | 'none' | '';
  livingSituation: string;
  familyDynamics: string;
  spiritualCultural: string;
  copingStrategies: string[];
  stressors: string;
  safetyRisk: 'none' | 'low' | 'moderate' | 'high' | '';
  notes: string;
}

const DEFAULT_FORM: BiopsychosocialFormData = {
  studentName: '', presentingConcern: '', psychologicalMood: '',
  psychologicalAffect: '', insightJudgement: '', socialSupport: '',
  livingSituation: '', familyDynamics: '', spiritualCultural: '',
  copingStrategies: [], stressors: '', safetyRisk: '', notes: '',
};

const COPING_STRATEGIES = [
  'Exercise', 'Social support', 'Mindfulness / meditation', 'Journalling', 'Creative arts',
  'Prayer / spirituality', 'Problem solving', 'Distraction', 'Rest / sleep', 'Nature', 'Professional help',
];

function validate(form: BiopsychosocialFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.psychologicalMood) return 'Document psychological mood.';
  if (!form.safetyRisk) return 'Document safety risk level.';
  return null;
}

export function formatBiopsychosocialSummary(data: Record<string, unknown>): AssessmentSummary {
  const safety = data.safetyRisk as string;
  const mood = data.psychologicalMood as string;
  if (safety === 'high') return { label: 'High safety risk', color: 'red' };
  if (safety === 'moderate') return { label: 'Moderate safety risk', color: 'amber' };
  if (mood) return { label: `Mood: ${mood}`, color: mood === 'euthymic' ? 'green' : 'amber' };
  return { label: 'Documented', color: 'blue' };
}

export const BiopsychosocialAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<BiopsychosocialFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof BiopsychosocialFormData>(key: K, value: BiopsychosocialFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleCoping = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      copingStrategies: prev.copingStrategies.includes(item) ? prev.copingStrategies.filter(c => c !== item) : [...prev.copingStrategies, item],
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id, tenant_id: tenantId, system_type: SYSTEM_TYPE,
      assessment_data: clinicalFields as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    await save(payload);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatBiopsychosocialSummary} />

      <FlowsheetFormSection title="Presenting Concern">
        <textarea value={form.presentingConcern} onChange={e => set('presentingConcern', e.target.value)} rows={3}
          placeholder="Describe the patient's primary presenting concern in their own words where possible…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Psychological Assessment">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mood <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {['euthymic', 'depressed', 'anxious', 'irritable', 'elevated', 'labile'].map(v => (
                <button key={v} type="button" onClick={() => set('psychologicalMood', v as BiopsychosocialFormData['psychologicalMood'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.psychologicalMood === v ? v === 'euthymic' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Affect</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'congruent', l: 'Congruent' }, { v: 'flat', l: 'Flat' }, { v: 'blunted', l: 'Blunted' }, { v: 'incongruent', l: 'Incongruent' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('psychologicalAffect', v as BiopsychosocialFormData['psychologicalAffect'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.psychologicalAffect === v ? v === 'congruent' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insight & Judgement</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'intact', l: 'Intact' }, { v: 'partial', l: 'Partial' }, { v: 'poor', l: 'Poor' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('insightJudgement', v as BiopsychosocialFormData['insightJudgement'])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.insightJudgement === v ? v === 'intact' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Social Assessment">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Social Support</label>
            <div className="flex gap-2 flex-wrap">
              {['strong', 'moderate', 'limited', 'none'].map(v => (
                <button key={v} type="button" onClick={() => set('socialSupport', v as BiopsychosocialFormData['socialSupport'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.socialSupport === v ? v === 'strong' ? 'bg-green-100 border-green-400 text-green-800' : v === 'none' ? 'bg-red-100 border-red-400 text-red-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Living Situation</label>
            <input type="text" value={form.livingSituation} onChange={e => set('livingSituation', e.target.value)}
              placeholder="e.g. lives alone, with spouse, in care home"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Family Dynamics</label>
          <textarea value={form.familyDynamics} onChange={e => set('familyDynamics', e.target.value)} rows={2}
            placeholder="Family relationships, involvement, caregiving roles…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Spiritual & Cultural Considerations">
        <textarea value={form.spiritualCultural} onChange={e => set('spiritualCultural', e.target.value)} rows={2}
          placeholder="Cultural background, spiritual beliefs, religious practices relevant to care…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Coping & Stressors">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Coping Strategies (select all that patient uses)</label>
          <div className="flex gap-2 flex-wrap">
            {COPING_STRATEGIES.map(opt => (
              <button key={opt} type="button" onClick={() => toggleCoping(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.copingStrategies.includes(opt) ? 'bg-purple-100 border-purple-400 text-purple-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Stressors</label>
          <textarea value={form.stressors} onChange={e => set('stressors', e.target.value)} rows={2}
            placeholder="Financial, relationship, housing, work, health-related…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Safety Risk">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Overall Safety Risk Level <span className="text-red-500">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'none', l: 'No risk identified' }, { v: 'low', l: 'Low' }, { v: 'moderate', l: 'Moderate' }, { v: 'high', l: 'High — escalate' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('safetyRisk', v as BiopsychosocialFormData['safetyRisk'])}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.safetyRisk === v ? v === 'none' || v === 'low' ? 'bg-green-50 border-green-400 text-green-700' : v === 'moderate' ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {form.safetyRisk === 'high' && (
            <p className="mt-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">⚠ High risk identified — notify clinical supervisor immediately per facility protocol.</p>
          )}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Additional biopsychosocial assessment notes…"
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
