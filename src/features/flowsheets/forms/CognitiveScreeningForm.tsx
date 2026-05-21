import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'cognitive' as const;

interface CognitiveFormData {
  studentName: string;
  orientationPerson: boolean | null;
  orientationPlace: boolean | null;
  orientationTime: boolean | null;
  orientationSituation: boolean | null;
  attention: 'intact' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment' | '';
  shortTermMemory: 'intact' | 'mild-impairment' | 'moderate-impairment' | 'severe-impairment' | '';
  language: 'intact' | 'expressive-difficulty' | 'receptive-difficulty' | 'global-aphasia' | '';
  // CAM (Confusion Assessment Method) for delirium
  camAcuteOnset: boolean | null;
  camFluctuating: boolean | null;
  camInattention: boolean | null;
  camDisorganisedThinking: boolean | null;
  camAlteredLOC: boolean | null;
  cognitiveConcerns: string;
  notes: string;
}

const DEFAULT_FORM: CognitiveFormData = {
  studentName: '', orientationPerson: null, orientationPlace: null, orientationTime: null,
  orientationSituation: null, attention: '', shortTermMemory: '', language: '',
  camAcuteOnset: null, camFluctuating: null, camInattention: null,
  camDisorganisedThinking: null, camAlteredLOC: null, cognitiveConcerns: '', notes: '',
};

function validate(form: CognitiveFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.attention) return 'Document attention level.';
  return null;
}

function getDeliriumPositive(form: CognitiveFormData): boolean {
  // CAM positive = features 1 AND 2 present, PLUS feature 3 OR 4
  return (form.camAcuteOnset === true && form.camFluctuating === true &&
    (form.camInattention === true || form.camDisorganisedThinking === true));
}

export function formatCognitiveSummary(data: Record<string, unknown>): AssessmentSummary {
  const deliriumPos = (data.camAcuteOnset as boolean) && (data.camFluctuating as boolean) &&
    ((data.camInattention as boolean) || (data.camDisorganisedThinking as boolean));
  if (deliriumPos) return { label: 'CAM+ — Possible delirium', color: 'red' };
  const attention = data.attention as string;
  if (attention === 'intact') return { label: 'Cognition intact', color: 'green' };
  if (attention) return { label: `Attention: ${attention.replace(/-/g, ' ')}`, color: 'amber' };
  return { label: 'Documented', color: 'blue' };
}

export const CognitiveScreeningForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<CognitiveFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof CognitiveFormData>(key: K, value: CognitiveFormData[K]) => {
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
      assessment_data: clinicalFields as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    await save(payload);
    onSaved();
  };

  const deliriumPositive = getDeliriumPositive(form);

  const IMPAIRMENT_OPTIONS = [
    { v: 'intact', l: 'Intact' },
    { v: 'mild-impairment', l: 'Mild impairment' },
    { v: 'moderate-impairment', l: 'Moderate impairment' },
    { v: 'severe-impairment', l: 'Severe impairment' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatCognitiveSummary} />

      <FlowsheetFormSection title="Orientation">
        <div className="grid grid-cols-2 gap-3">
          {([
            ['orientationPerson', 'Person (knows own name/identity)'],
            ['orientationPlace', 'Place (knows where they are)'],
            ['orientationTime', 'Time (knows date/day/year)'],
            ['orientationSituation', 'Situation (understands why hospitalised)'],
          ] as const).map(([field, label]) => (
            <div key={field}>
              <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
              <div className="flex gap-2">
                {([{ label: 'Oriented', value: true }, { label: 'Disoriented', value: false }] as const).map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => set(field, opt.value)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${form[field] === opt.value ? opt.value ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Cognitive Function">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attention <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {IMPAIRMENT_OPTIONS.map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('attention', v)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.attention === v ? v === 'intact' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short-term Memory</label>
            <div className="flex gap-2 flex-wrap">
              {IMPAIRMENT_OPTIONS.map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('shortTermMemory', v)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.shortTermMemory === v ? v === 'intact' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language & Communication</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'intact', l: 'Intact' }, { v: 'expressive-difficulty', l: 'Expressive difficulty' }, { v: 'receptive-difficulty', l: 'Receptive difficulty' }, { v: 'global-aphasia', l: 'Global aphasia' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('language', v as CognitiveFormData['language'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.language === v ? v === 'intact' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Delirium Screening — CAM (Confusion Assessment Method)">
        {deliriumPositive && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
            ⚠ CAM Positive — Possible delirium. Notify clinical supervisor.
          </div>
        )}
        <div className="space-y-3">
          {([
            ['camAcuteOnset', 'Feature 1: Acute onset & fluctuating course', 'Sudden change from baseline, symptoms fluctuate during the day'],
            ['camFluctuating', 'Feature 2: Inattention', 'Difficulty focusing attention, easily distracted, difficulty keeping track of conversation'],
            ['camInattention', 'Feature 3: Disorganised thinking', 'Rambling or incoherent speech, unclear or illogical flow of ideas'],
            ['camDisorganisedThinking', 'Feature 4: Altered level of consciousness', 'Anything other than alert (vigilant, lethargic, stupor, coma)'],
            ['camAlteredLOC', 'Feature 5 (supplemental): Psychomotor agitation or retardation', 'Hyperactivity, restlessness, or slowed behaviour'],
          ] as const).map(([field, label, description]) => (
            <div key={field} className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">{description}</p>
              <div className="flex gap-2">
                {([{ label: 'Present', value: true }, { label: 'Absent', value: false }] as const).map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => set(field, opt.value)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${form[field] === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">CAM positive = Features 1 AND 2 present, PLUS Feature 3 OR 4</p>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Cognitive Concerns / Plan">
        <textarea value={form.cognitiveConcerns} onChange={e => set('cognitiveConcerns', e.target.value)} rows={2}
          placeholder="Any specific cognitive concerns or plan of action…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Any additional cognitive screening observations…"
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
