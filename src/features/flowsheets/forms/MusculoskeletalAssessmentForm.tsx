import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'musculoskeletal' as const;

interface MusculoskeletalFormData {
  studentName: string;
  mobilityLevel: 'independent' | 'supervision' | 'assist-1' | 'assist-2' | 'total-assist' | 'bedbound' | '';
  assistiveDevice: string[];
  upperExtremityROM: 'full-bilateral' | 'limited-right' | 'limited-left' | 'limited-bilateral' | '';
  lowerExtremityROM: 'full-bilateral' | 'limited-right' | 'limited-left' | 'limited-bilateral' | '';
  strengthRightUpper: string;
  strengthLeftUpper: string;
  strengthRightLower: string;
  strengthLeftLower: string;
  gait: 'steady' | 'unsteady' | 'shuffling' | 'antalgic' | 'unable' | '';
  transferAbility: 'independent' | 'supervision' | 'assist-1' | 'assist-2' | 'hoyer-lift' | '';
  jointFindings: string;
  fallPrecautions: boolean | null;
  notes: string;
}

const DEFAULT_FORM: MusculoskeletalFormData = {
  studentName: '', mobilityLevel: '', assistiveDevice: [],
  upperExtremityROM: '', lowerExtremityROM: '',
  strengthRightUpper: '', strengthLeftUpper: '',
  strengthRightLower: '', strengthLeftLower: '',
  gait: '', transferAbility: '', jointFindings: '',
  fallPrecautions: null, notes: '',
};

const ASSISTIVE_DEVICES = ['Cane', 'Walker', 'Rollator', 'Crutches', 'Wheelchair', 'Braces / splints'];
const STRENGTH_OPTIONS = ['5/5', '4/5', '3/5', '2/5', '1/5', '0/5'];

function validate(form: MusculoskeletalFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.mobilityLevel) return 'Select mobility level.';
  return null;
}

export function formatMusculoskeletalSummary(data: Record<string, unknown>): AssessmentSummary {
  const mobility = data.mobilityLevel as string;
  if (!mobility) return { label: 'Documented', color: 'blue' };
  const color = mobility === 'independent' ? 'green' : mobility === 'bedbound' || mobility === 'total-assist' ? 'red' : 'amber';
  return { label: mobility.replace(/-/g, ' '), color };
}

export const MusculoskeletalAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<MusculoskeletalFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof MusculoskeletalFormData>(key: K, value: MusculoskeletalFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleDevice = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      assistiveDevice: prev.assistiveDevice.includes(item)
        ? prev.assistiveDevice.filter(d => d !== item)
        : [...prev.assistiveDevice, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatMusculoskeletalSummary} />

      <FlowsheetFormSection title="Mobility & Transfers">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mobility Level <span className="text-red-500">*</span></label>
          <select value={form.mobilityLevel} onChange={e => set('mobilityLevel', e.target.value as MusculoskeletalFormData['mobilityLevel'])}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="">Select…</option>
            <option value="independent">Independent</option>
            <option value="supervision">Supervision / standby</option>
            <option value="assist-1">Assist × 1</option>
            <option value="assist-2">Assist × 2</option>
            <option value="total-assist">Total assist</option>
            <option value="bedbound">Bedbound</option>
          </select>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Ability</label>
          <select value={form.transferAbility} onChange={e => set('transferAbility', e.target.value as MusculoskeletalFormData['transferAbility'])}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="">Select…</option>
            <option value="independent">Independent</option>
            <option value="supervision">Supervision</option>
            <option value="assist-1">Assist × 1</option>
            <option value="assist-2">Assist × 2</option>
            <option value="hoyer-lift">Hoyer lift</option>
          </select>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assistive Devices</label>
          <div className="flex gap-2 flex-wrap">
            {ASSISTIVE_DEVICES.map(opt => (
              <button key={opt} type="button" onClick={() => toggleDevice(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.assistiveDevice.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Range of Motion">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upper Extremities</label>
            <select value={form.upperExtremityROM} onChange={e => set('upperExtremityROM', e.target.value as MusculoskeletalFormData['upperExtremityROM'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="">Select…</option>
              <option value="full-bilateral">Full — bilateral</option>
              <option value="limited-right">Limited — right</option>
              <option value="limited-left">Limited — left</option>
              <option value="limited-bilateral">Limited — bilateral</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lower Extremities</label>
            <select value={form.lowerExtremityROM} onChange={e => set('lowerExtremityROM', e.target.value as MusculoskeletalFormData['lowerExtremityROM'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="">Select…</option>
              <option value="full-bilateral">Full — bilateral</option>
              <option value="limited-right">Limited — right</option>
              <option value="limited-left">Limited — left</option>
              <option value="limited-bilateral">Limited — bilateral</option>
            </select>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Muscle Strength" description="Score out of 5 — Oxford Muscle Strength Scale">
        <div className="grid grid-cols-2 gap-4">
          {([
            ['strengthRightUpper', 'Right upper extremity'],
            ['strengthLeftUpper', 'Left upper extremity'],
            ['strengthRightLower', 'Right lower extremity'],
            ['strengthLeftLower', 'Left lower extremity'],
          ] as const).map(([field, label]) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
              <div className="flex gap-1.5 flex-wrap">
                {STRENGTH_OPTIONS.map(v => (
                  <button key={v} type="button" onClick={() => set(field, v)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${form[field] === v ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Gait">
        <div className="flex gap-2 flex-wrap">
          {[{ v: 'steady', l: 'Steady' }, { v: 'unsteady', l: 'Unsteady' }, { v: 'shuffling', l: 'Shuffling' }, { v: 'antalgic', l: 'Antalgic (pain-related)' }, { v: 'unable', l: 'Unable to ambulate' }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => set('gait', v as MusculoskeletalFormData['gait'])}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.gait === v ? v === 'steady' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Joint Findings & Fall Precautions">
        <input type="text" value={form.jointFindings} onChange={e => set('jointFindings', e.target.value)}
          placeholder="e.g. swelling right knee, crepitus left hip"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fall Precautions in Place</label>
          <div className="flex gap-3">
            {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
              <button key={String(opt.value)} type="button" onClick={() => set('fallPrecautions', opt.value)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.fallPrecautions === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional musculoskeletal observations…"
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
