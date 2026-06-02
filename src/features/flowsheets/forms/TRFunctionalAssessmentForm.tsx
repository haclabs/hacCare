import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'tr-functional' as const;

type IndependenceLevel = 'independent' | 'modified-independent' | 'supervision' | 'minimal-assist' | 'moderate-assist' | 'maximal-assist' | 'dependent' | '';

interface TRFunctionalFormData {
  studentName: string;
  adlCapacity: IndependenceLevel;
  physicalEndurance: 'excellent' | 'good' | 'fair' | 'poor' | '';
  enduranceMinutes: string;
  cognitiveFunctionForRecreation: 'intact' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment' | '';
  socialFunction: 'initiates-interactions' | 'responds-to-initiation' | 'limited-engagement' | 'withdrawn' | '';
  communicationAbility: 'verbal-clear' | 'verbal-limited' | 'non-verbal' | 'communication-device' | '';
  mobilityForRecreation: IndependenceLevel;
  recommendedActivities: string[];
  notes: string;
}

const DEFAULT_FORM: TRFunctionalFormData = {
  studentName: '', adlCapacity: '', physicalEndurance: '', enduranceMinutes: '',
  cognitiveFunctionForRecreation: '', socialFunction: '', communicationAbility: '',
  mobilityForRecreation: '', recommendedActivities: [], notes: '',
};

const INDEPENDENCE_OPTIONS: { v: IndependenceLevel; l: string }[] = [
  { v: 'independent', l: 'Independent' },
  { v: 'modified-independent', l: 'Modified independent' },
  { v: 'supervision', l: 'Supervision' },
  { v: 'minimal-assist', l: 'Minimal assist' },
  { v: 'moderate-assist', l: 'Moderate assist' },
  { v: 'maximal-assist', l: 'Maximal assist' },
  { v: 'dependent', l: 'Dependent' },
];

const RECOMMENDED_ACTIVITIES = [
  'Chair yoga', 'Art therapy', 'Music therapy', 'Games / puzzles', 'Reading group',
  'Social dining', 'Light exercise group', 'Pet therapy', 'Reminiscence therapy',
  'Sensory stimulation', 'Horticulture therapy', 'Technology / tablet use',
];

interface IndependenceSelectorProps {
  field: 'adlCapacity' | 'mobilityForRecreation';
  label: string;
  value: IndependenceLevel;
  onSelect: (value: IndependenceLevel) => void;
}

const IndependenceSelector: React.FC<IndependenceSelectorProps> = ({ field, label, value, onSelect }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="flex gap-2 flex-wrap">
      {INDEPENDENCE_OPTIONS.map(({ v, l }) => (
        <button key={`${field}-${v}`} type="button" onClick={() => onSelect(v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${value === v ? v === 'independent' || v === 'modified-independent' ? 'bg-green-100 border-green-400 text-green-800' : v === 'dependent' ? 'bg-red-100 border-red-400 text-red-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {l}
        </button>
      ))}
    </div>
  </div>
);

function validate(form: TRFunctionalFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.physicalEndurance) return 'Document physical endurance level.';
  return null;
}

export function formatTRFunctionalSummary(data: Record<string, unknown>): AssessmentSummary {
  const endurance = data.physicalEndurance as string;
  if (endurance) return { label: `Endurance: ${endurance}`, color: endurance === 'excellent' || endurance === 'good' ? 'green' : endurance === 'poor' ? 'amber' : 'blue' };
  return { label: 'Functional assessment', color: 'blue' };
}

export const TRFunctionalAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<TRFunctionalFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof TRFunctionalFormData>(key: K, value: TRFunctionalFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleActivity = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      recommendedActivities: prev.recommendedActivities.includes(item)
        ? prev.recommendedActivities.filter(a => a !== item)
        : [...prev.recommendedActivities, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatTRFunctionalSummary} />

      <FlowsheetFormSection title="Physical Function">
        <div className="space-y-4">
          <IndependenceSelector field="adlCapacity" label="ADL Capacity" value={form.adlCapacity} onSelect={(value) => set('adlCapacity', value)} />
          <IndependenceSelector field="mobilityForRecreation" label="Mobility for Recreation" value={form.mobilityForRecreation} onSelect={(value) => set('mobilityForRecreation', value)} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Physical Endurance <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {['excellent', 'good', 'fair', 'poor'].map(v => (
                  <button key={v} type="button" onClick={() => set('physicalEndurance', v as TRFunctionalFormData['physicalEndurance'])}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all capitalize ${form.physicalEndurance === v ? v === 'excellent' || v === 'good' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Activity Duration Tolerated (minutes)</label>
              <input type="number" min={0} value={form.enduranceMinutes} onChange={e => set('enduranceMinutes', e.target.value)}
                placeholder="e.g. 30"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Cognitive & Social Function for Recreation">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cognitive Function</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'intact', l: 'Intact' }, { v: 'mild-impairment', l: 'Mild impairment' }, { v: 'moderate-impairment', l: 'Moderate impairment' }, { v: 'severe-impairment', l: 'Severe impairment' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('cognitiveFunctionForRecreation', v as TRFunctionalFormData['cognitiveFunctionForRecreation'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.cognitiveFunctionForRecreation === v ? v === 'intact' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Social Function</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'initiates-interactions', l: 'Initiates interactions' }, { v: 'responds-to-initiation', l: 'Responds when approached' }, { v: 'limited-engagement', l: 'Limited engagement' }, { v: 'withdrawn', l: 'Withdrawn' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('socialFunction', v as TRFunctionalFormData['socialFunction'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.socialFunction === v ? v === 'initiates-interactions' ? 'bg-green-100 border-green-400 text-green-800' : v === 'withdrawn' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Communication Ability</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'verbal-clear', l: 'Verbal — clear' }, { v: 'verbal-limited', l: 'Verbal — limited' }, { v: 'non-verbal', l: 'Non-verbal' }, { v: 'communication-device', l: 'AAC device' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('communicationAbility', v as TRFunctionalFormData['communicationAbility'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.communicationAbility === v ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Recommended Therapeutic Activities">
        <div className="flex gap-2 flex-wrap">
          {RECOMMENDED_ACTIVITIES.map(opt => (
            <button key={opt} type="button" onClick={() => toggleActivity(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.recommendedActivities.includes(opt) ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Additional functional assessment observations and recommendations…"
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
