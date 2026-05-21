import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'respiratory' as const;

interface RespiratoryFormData {
  studentName: string;
  rate: string;
  rhythm: 'regular' | 'irregular' | '';
  depth: 'normal' | 'shallow' | 'deep' | '';
  effort: 'unlaboured' | 'mild' | 'moderate' | 'severe' | '';
  breathSoundsRight: string[];
  breathSoundsLeft: string[];
  oxygenTherapy: 'none' | 'nasal-cannula' | 'simple-mask' | 'non-rebreather' | 'venturi' | 'hfnc' | 'bipap' | 'cpap' | 'ventilator' | '';
  oxygenFlowRate: string;
  spo2: string;
  cough: 'none' | 'non-productive' | 'productive' | '';
  sputumColour: 'clear' | 'white' | 'yellow' | 'green' | 'rust' | 'pink-frothy' | '';
  sputumAmount: 'scant' | 'small' | 'moderate' | 'large' | '';
  notes: string;
}

const DEFAULT_FORM: RespiratoryFormData = {
  studentName: '', rate: '', rhythm: '', depth: '', effort: '',
  breathSoundsRight: [], breathSoundsLeft: [],
  oxygenTherapy: '', oxygenFlowRate: '', spo2: '',
  cough: '', sputumColour: '', sputumAmount: '', notes: '',
};

const BREATH_SOUND_OPTIONS = ['Clear', 'Diminished', 'Absent', 'Crackles (fine)', 'Crackles (coarse)', 'Wheeze', 'Rhonchi', 'Stridor', 'Pleural rub'];
const O2_THERAPY_LABELS: Record<string, string> = {
  'none': 'None (room air)', 'nasal-cannula': 'Nasal cannula', 'simple-mask': 'Simple mask',
  'non-rebreather': 'Non-rebreather mask', 'venturi': 'Venturi mask',
  'hfnc': 'High-flow nasal cannula', 'bipap': 'BiPAP', 'cpap': 'CPAP', 'ventilator': 'Ventilator',
};

function validate(form: RespiratoryFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.rhythm) return 'Select respiratory rhythm.';
  if (!form.effort) return 'Select work of breathing.';
  return null;
}

export function formatRespiratorySummary(data: Record<string, unknown>): AssessmentSummary {
  const spo2 = data.spo2 as string;
  const effort = data.effort as string;
  if (spo2) {
    const val = parseInt(spo2);
    const color = val < 90 ? 'red' : val < 94 ? 'amber' : 'green';
    return { label: `SpO₂ ${spo2}%${effort ? ` · ${effort}` : ''}`, color };
  }
  return { label: effort || 'Documented', color: 'blue' };
}

export const RespiratoryAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<RespiratoryFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof RespiratoryFormData>(key: K, value: RespiratoryFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleSound = useCallback((side: 'breathSoundsRight' | 'breathSoundsLeft', item: string) => {
    setForm(prev => ({
      ...prev,
      [side]: prev[side].includes(item) ? prev[side].filter(s => s !== item) : [...prev[side], item],
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

  const showSputum = form.cough === 'productive';
  const showO2Flow = form.oxygenTherapy && form.oxygenTherapy !== 'none' && form.oxygenTherapy !== 'hfnc' && form.oxygenTherapy !== 'bipap' && form.oxygenTherapy !== 'cpap' && form.oxygenTherapy !== 'ventilator';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatRespiratorySummary} />

      <FlowsheetFormSection title="Respiratory Pattern">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Respiratory Rate (breaths/min)</label>
            <input type="number" min={5} max={80} value={form.rate} onChange={e => set('rate', e.target.value)}
              placeholder="e.g. 16" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SpO₂ (%)</label>
            <input type="number" min={50} max={100} value={form.spo2} onChange={e => set('spo2', e.target.value)}
              placeholder="e.g. 98" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          {(['regular', 'irregular'] as const).map(v => (
            <button key={v} type="button" onClick={() => set('rhythm', v)}
              className={`rounded-lg border py-2.5 text-sm font-medium transition-all capitalize ${form.rhythm === v ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Depth <span className="text-red-500">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {(['shallow', 'normal', 'deep'] as const).map(v => (
              <button key={v} type="button" onClick={() => set('depth', v)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all capitalize ${form.depth === v ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Work of Breathing <span className="text-red-500">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'unlaboured', label: 'Unlaboured' }, { v: 'mild', label: 'Mild effort' }, { v: 'moderate', label: 'Moderate effort' }, { v: 'severe', label: 'Severe distress' }].map(({ v, label }) => (
              <button key={v} type="button" onClick={() => set('effort', v as RespiratoryFormData['effort'])}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.effort === v
                  ? v === 'unlaboured' ? 'bg-green-100 border-green-400 text-green-800' : v === 'mild' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : v === 'moderate' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-red-100 border-red-400 text-red-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Breath Sounds">
        {(['breathSoundsRight', 'breathSoundsLeft'] as const).map(side => (
          <div key={side} className={side === 'breathSoundsLeft' ? 'mt-3' : ''}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {side === 'breathSoundsRight' ? 'Right lung' : 'Left lung'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {BREATH_SOUND_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggleSound(side, opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form[side].includes(opt) ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Oxygen Therapy">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Device</label>
          <select value={form.oxygenTherapy} onChange={e => set('oxygenTherapy', e.target.value as RespiratoryFormData['oxygenTherapy'])}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="">Select…</option>
            {Object.entries(O2_THERAPY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
        {showO2Flow && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Flow Rate (L/min)</label>
            <input type="number" min={0.5} max={15} step={0.5} value={form.oxygenFlowRate} onChange={e => set('oxygenFlowRate', e.target.value)}
              placeholder="e.g. 2" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
        )}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Cough & Sputum">
        <div className="flex gap-2 flex-wrap">
          {[{ v: 'none', label: 'No cough' }, { v: 'non-productive', label: 'Non-productive' }, { v: 'productive', label: 'Productive' }].map(({ v, label }) => (
            <button key={v} type="button" onClick={() => set('cough', v as RespiratoryFormData['cough'])}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.cough === v ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {showSputum && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sputum Colour</label>
              <select value={form.sputumColour} onChange={e => set('sputumColour', e.target.value as RespiratoryFormData['sputumColour'])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">Select…</option>
                {['clear', 'white', 'yellow', 'green', 'rust', 'pink-frothy'].map(c => <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <select value={form.sputumAmount} onChange={e => set('sputumAmount', e.target.value as RespiratoryFormData['sputumAmount'])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">Select…</option>
                {['scant', 'small', 'moderate', 'large'].map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
              </select>
            </div>
          </div>
        )}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional respiratory observations…"
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
