import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'genitourinary' as const;

interface GenitourinaryFormData {
  studentName: string;
  voidingMethod: 'spontaneous' | 'catheter-foley' | 'catheter-straight' | 'condom-catheter' | 'incontinent' | 'unable-to-void' | '';
  urineColour: 'clear' | 'pale-yellow' | 'yellow' | 'dark-yellow' | 'amber' | 'orange' | 'red-pink' | 'brown' | 'cloudy' | '';
  urineClarity: 'clear' | 'slightly-cloudy' | 'cloudy' | 'turbid' | '';
  urineOdour: 'normal' | 'strong' | 'foul' | 'sweet-fruity' | '';
  urineOutput: string;
  catheterDetails: string;
  catheterSite: 'no-signs' | 'redness' | 'discharge' | 'encrustation' | '';
  urinarySymptoms: string[];
  notes: string;
}

const DEFAULT_FORM: GenitourinaryFormData = {
  studentName: '', voidingMethod: '', urineColour: '', urineClarity: '',
  urineOdour: '', urineOutput: '', catheterDetails: '', catheterSite: '',
  urinarySymptoms: [], notes: '',
};

const URINARY_SYMPTOMS = ['Dysuria', 'Frequency', 'Urgency', 'Hesitancy', 'Nocturia', 'Haematuria', 'Retention'];

function validate(form: GenitourinaryFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.voidingMethod) return 'Select voiding method.';
  return null;
}

export function formatGUSummary(data: Record<string, unknown>): AssessmentSummary {
  const output = data.urineOutput as string;
  const colour = data.urineColour as string;
  if (output) return { label: `Output ${output} mL`, color: 'blue' };
  if (colour) return { label: `Urine: ${colour.replace(/-/g, ' ')}`, color: colour === 'clear' || colour === 'pale-yellow' ? 'green' : 'amber' };
  return { label: 'Documented', color: 'blue' };
}

export const GenitourinaryAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<GenitourinaryFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof GenitourinaryFormData>(key: K, value: GenitourinaryFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleSymptom = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      urinarySymptoms: prev.urinarySymptoms.includes(item)
        ? prev.urinarySymptoms.filter(s => s !== item)
        : [...prev.urinarySymptoms, item],
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

  const hasCatheter = form.voidingMethod === 'catheter-foley' || form.voidingMethod === 'catheter-straight' || form.voidingMethod === 'condom-catheter';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatGUSummary} />

      <FlowsheetFormSection title="Voiding">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Voiding Method <span className="text-red-500">*</span></label>
          <select value={form.voidingMethod} onChange={e => set('voidingMethod', e.target.value as GenitourinaryFormData['voidingMethod'])}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="">Select…</option>
            <option value="spontaneous">Spontaneous</option>
            <option value="catheter-foley">Foley catheter (indwelling)</option>
            <option value="catheter-straight">Straight catheterisation</option>
            <option value="condom-catheter">Condom catheter</option>
            <option value="incontinent">Incontinent</option>
            <option value="unable-to-void">Unable to void</option>
          </select>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Urine Output (mL — last measurement period)</label>
          <input type="number" min={0} value={form.urineOutput} onChange={e => set('urineOutput', e.target.value)}
            placeholder="e.g. 250" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
        </div>
      </FlowsheetFormSection>

      {hasCatheter && (
        <FlowsheetFormSection title="Catheter Care">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catheter Details</label>
            <input type="text" value={form.catheterDetails} onChange={e => set('catheterDetails', e.target.value)}
              placeholder="e.g. 16Fr Foley, inserted 2 days ago, draining freely"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Insertion Site</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'no-signs', l: 'No signs of concern' }, { v: 'redness', l: 'Redness / irritation' }, { v: 'discharge', l: 'Discharge' }, { v: 'encrustation', l: 'Encrustation' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('catheterSite', v as GenitourinaryFormData['catheterSite'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.catheterSite === v ? v === 'no-signs' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </FlowsheetFormSection>
      )}

      <FlowsheetFormSection title="Urine Characteristics">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Colour</label>
            <select value={form.urineColour} onChange={e => set('urineColour', e.target.value as GenitourinaryFormData['urineColour'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="">Select…</option>
              {['clear', 'pale-yellow', 'yellow', 'dark-yellow', 'amber', 'orange', 'red-pink', 'brown', 'cloudy'].map(v => <option key={v} value={v}>{v.replace(/-/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Clarity</label>
            <select value={form.urineClarity} onChange={e => set('urineClarity', e.target.value as GenitourinaryFormData['urineClarity'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="">Select…</option>
              {['clear', 'slightly-cloudy', 'cloudy', 'turbid'].map(v => <option key={v} value={v}>{v.replace(/-/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Odour</label>
            <select value={form.urineOdour} onChange={e => set('urineOdour', e.target.value as GenitourinaryFormData['urineOdour'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="">Select…</option>
              <option value="normal">Normal</option>
              <option value="strong">Strong</option>
              <option value="foul">Foul / offensive</option>
              <option value="sweet-fruity">Sweet / fruity (ketones)</option>
            </select>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Urinary Symptoms">
        <div className="flex gap-2 flex-wrap">
          {URINARY_SYMPTOMS.map(opt => (
            <button key={opt} type="button" onClick={() => toggleSymptom(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.urinarySymptoms.includes(opt) ? 'bg-cyan-100 border-cyan-400 text-cyan-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
        {form.urinarySymptoms.length === 0 && <p className="text-xs text-gray-400 mt-1">Select all that apply, or leave blank if no symptoms.</p>}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional GU observations…"
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
