import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'cardiovascular' as const;

interface CardiovascularFormData {
  studentName: string;
  heartRate: string;
  heartRhythm: 'regular' | 'irregular' | 'irregularly-irregular' | '';
  heartSounds: string[];
  capillaryRefill: '<2s' | '2-3s' | '>3s' | '';
  peripheralPulses: 'present-equal' | 'diminished' | 'absent' | 'unequal' | '';
  edemaPresent: boolean | null;
  edemaLocation: string;
  edemaGrade: '1+' | '2+' | '3+' | '4+' | '';
  skinColour: 'normal' | 'pale' | 'mottled' | 'cyanotic' | 'flushed' | '';
  skinTemp: 'warm' | 'cool' | 'cold' | 'hot' | '';
  ivAccess: string;
  notes: string;
}

const DEFAULT_FORM: CardiovascularFormData = {
  studentName: '', heartRate: '', heartRhythm: '', heartSounds: [],
  capillaryRefill: '', peripheralPulses: '', edemaPresent: null,
  edemaLocation: '', edemaGrade: '', skinColour: '', skinTemp: '',
  ivAccess: '', notes: '',
};

const HEART_SOUND_OPTIONS = ['S1 present', 'S2 present', 'S3 (gallop)', 'S4', 'Murmur', 'Rub', 'Click'];

function validate(form: CardiovascularFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.heartRhythm) return 'Select heart rhythm.';
  if (!form.capillaryRefill) return 'Select capillary refill time.';
  return null;
}

export function formatCardiovascularSummary(data: Record<string, unknown>): AssessmentSummary {
  const hr = data.heartRate as string;
  const rhythm = data.heartRhythm as string;
  if (hr) {
    const val = parseInt(hr);
    const color = val < 60 || val > 100 ? 'amber' : 'green';
    return { label: `HR ${hr} bpm${rhythm ? ` · ${rhythm}` : ''}`, color };
  }
  return { label: rhythm || 'Documented', color: 'blue' };
}

export const CardiovascularAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<CardiovascularFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof CardiovascularFormData>(key: K, value: CardiovascularFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleSound = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      heartSounds: prev.heartSounds.includes(item) ? prev.heartSounds.filter(s => s !== item) : [...prev.heartSounds, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatCardiovascularSummary} />

      <FlowsheetFormSection title="Heart Rate & Rhythm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Heart Rate (bpm)</label>
            <input type="number" min={20} max={300} value={form.heartRate} onChange={e => set('heartRate', e.target.value)}
              placeholder="e.g. 72" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Rhythm <span className="text-red-500">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'regular', l: 'Regular' }, { v: 'irregular', l: 'Irregular' }, { v: 'irregularly-irregular', l: 'Irregularly irregular' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('heartRhythm', v as CardiovascularFormData['heartRhythm'])}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.heartRhythm === v ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Heart Sounds">
        <div className="flex gap-2 flex-wrap">
          {HEART_SOUND_OPTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => toggleSound(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.heartSounds.includes(opt) ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Peripheral Circulation">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Capillary Refill <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {([['<2s', 'green'], ['2-3s', 'amber'], ['>3s', 'red']] as const).map(([v, col]) => (
                <button key={v} type="button" onClick={() => set('capillaryRefill', v)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.capillaryRefill === v ? `bg-${col}-100 border-${col}-400 text-${col}-800` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Peripheral Pulses</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'present-equal', l: 'Present & equal' }, { v: 'diminished', l: 'Diminished' }, { v: 'absent', l: 'Absent' }, { v: 'unequal', l: 'Unequal' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('peripheralPulses', v as CardiovascularFormData['peripheralPulses'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.peripheralPulses === v ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Skin">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {['normal', 'pale', 'mottled', 'cyanotic', 'flushed'].map(v => (
                <button key={v} type="button" onClick={() => set('skinColour', v as CardiovascularFormData['skinColour'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.skinColour === v ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
            <div className="flex gap-2 flex-wrap">
              {['warm', 'cool', 'cold', 'hot'].map(v => (
                <button key={v} type="button" onClick={() => set('skinTemp', v as CardiovascularFormData['skinTemp'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.skinTemp === v ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Oedema">
        <div className="flex gap-3 mb-3">
          {([{ label: 'Present', value: true }, { label: 'Absent', value: false }] as const).map(opt => (
            <button key={String(opt.value)} type="button" onClick={() => set('edemaPresent', opt.value)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.edemaPresent === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-200' : 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {form.edemaPresent && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <input type="text" value={form.edemaLocation} onChange={e => set('edemaLocation', e.target.value)}
                placeholder="e.g. bilateral ankles" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade</label>
              <select value={form.edemaGrade} onChange={e => set('edemaGrade', e.target.value as CardiovascularFormData['edemaGrade'])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">Select…</option>
                {['1+', '2+', '3+', '4+'].map(g => <option key={g} value={g}>{g} — {g === '1+' ? 'Minimal (≤2 mm)' : g === '2+' ? 'Moderate (2–4 mm)' : g === '3+' ? 'Deep (4–6 mm)' : 'Very deep (≥6 mm)'}</option>)}
              </select>
            </div>
          </div>
        )}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="IV Access">
        <input type="text" value={form.ivAccess} onChange={e => set('ivAccess', e.target.value)}
          placeholder="e.g. 20G peripheral IV right forearm — patent, no signs of infiltration"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional cardiovascular observations…"
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
