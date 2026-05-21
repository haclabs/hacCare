import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'restraint' as const;

interface RestraintFormData {
  studentName: string;
  restraintType: string[];
  clinicalRationale: string;
  alternativesTried: string[];
  orderPresent: boolean | null;
  consentObtained: boolean | null;
  consentDetails: string;
  monitoringFrequency: '15-min' | '30-min' | '1-hour' | '';
  circulationCheck: 'intact' | 'compromised' | '';
  skinCheck: 'intact' | 'redness' | 'breakdown' | '';
  repositioned: boolean | null;
  notes: string;
}

const DEFAULT_FORM: RestraintFormData = {
  studentName: '', restraintType: [], clinicalRationale: '', alternativesTried: [],
  orderPresent: null, consentObtained: null, consentDetails: '',
  monitoringFrequency: '', circulationCheck: '', skinCheck: '',
  repositioned: null, notes: '',
};

const RESTRAINT_TYPES = ['Wrist / limb', 'Vest / body', 'Mitt', 'Soft belt', 'Lap buddy', 'Chemical (medication)', 'Side rails (all four)'];
const ALTERNATIVES_TRIED = [
  'Reorientation', 'Family presence', 'Music / distraction', 'Bed alarm',
  'Re-scheduling medications', 'Toileting schedule', 'Moved closer to nursing station',
  'Comfort measures', 'Reduced stimuli', 'Diversional activities',
];

function validate(form: RestraintFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (form.restraintType.length === 0) return 'Select at least one restraint type.';
  if (!form.clinicalRationale.trim()) return 'Document clinical rationale for the restraint.';
  if (form.orderPresent === null) return 'Confirm whether a restraint order is present.';
  if (form.consentObtained === null) return 'Document consent status.';
  if (!form.monitoringFrequency) return 'Select monitoring frequency.';
  return null;
}

export function formatRestraintSummary(data: Record<string, unknown>): AssessmentSummary {
  const types = data.restraintType as string[] | undefined;
  if (types && types.length > 0) {
    return { label: `Restraint: ${types.slice(0, 2).join(', ')}${types.length > 2 ? ' +more' : ''}`, color: 'amber' };
  }
  return { label: 'Restraint documented', color: 'amber' };
}

export const RestraintAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<RestraintFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof RestraintFormData>(key: K, value: RestraintFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleRestraint = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      restraintType: prev.restraintType.includes(item) ? prev.restraintType.filter(r => r !== item) : [...prev.restraintType, item],
    }));
  }, []);

  const toggleAlternative = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      alternativesTried: prev.alternativesTried.includes(item) ? prev.alternativesTried.filter(a => a !== item) : [...prev.alternativesTried, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatRestraintSummary} />

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <strong>Restraint use is a last resort.</strong> Document all less-restrictive alternatives tried before applying restraints.
        Restraints require a current order and regular monitoring per policy.
      </div>

      <FlowsheetFormSection title="Restraint Type">
        <div className="flex gap-2 flex-wrap">
          {RESTRAINT_TYPES.map(opt => (
            <button key={opt} type="button" onClick={() => toggleRestraint(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.restraintType.includes(opt) ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Clinical Rationale">
        <textarea value={form.clinicalRationale} onChange={e => set('clinicalRationale', e.target.value)} rows={3} required
          placeholder="Document the specific clinical reason this restraint is necessary (e.g., patient at imminent risk of self-harm by removing IV access despite repeated intervention and reorientation)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Least-Restraint Alternatives Tried">
        <div className="flex gap-2 flex-wrap mb-2">
          {ALTERNATIVES_TRIED.map(opt => (
            <button key={opt} type="button" onClick={() => toggleAlternative(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.alternativesTried.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Order & Consent">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restraint Order Present <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => set('orderPresent', opt.value)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.orderPresent === opt.value ? opt.value ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Consent Obtained <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {([{ label: 'Yes', value: true }, { label: 'No / Unable', value: false }] as const).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => set('consentObtained', opt.value)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.consentObtained === opt.value ? opt.value ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {form.consentObtained === false && (
          <input type="text" value={form.consentDetails} onChange={e => set('consentDetails', e.target.value)}
            placeholder="Reason consent not obtained (e.g. capacity assessment completed, substitute decision-maker contacted)"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
        )}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Monitoring">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monitoring Frequency <span className="text-red-500">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: '15-min', l: 'Every 15 min' }, { v: '30-min', l: 'Every 30 min' }, { v: '1-hour', l: 'Every 1 hour' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('monitoringFrequency', v as RestraintFormData['monitoringFrequency'])}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${form.monitoringFrequency === v ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Circulation check</label>
            <div className="flex flex-col gap-1.5">
              {([{ v: 'intact', l: 'Intact' }, { v: 'compromised', l: 'Compromised' }] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('circulationCheck', v)}
                  className={`rounded-lg border py-2 text-xs font-medium transition-all ${form.circulationCheck === v ? v === 'intact' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skin under restraint</label>
            <div className="flex flex-col gap-1.5">
              {([{ v: 'intact', l: 'Intact' }, { v: 'redness', l: 'Redness' }, { v: 'breakdown', l: 'Breakdown' }] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('skinCheck', v)}
                  className={`rounded-lg border py-2 text-xs font-medium transition-all ${form.skinCheck === v ? v === 'intact' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Repositioned</label>
            <div className="flex flex-col gap-1.5">
              {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => set('repositioned', opt.value)}
                  className={`rounded-lg border py-2 text-xs font-medium transition-all ${form.repositioned === opt.value ? opt.value ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Additional observations, patient response, re-evaluation findings…"
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
