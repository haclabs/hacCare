import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'gastrointestinal' as const;

interface GastrointestinalFormData {
  studentName: string;
  abdomenAppearance: string[];
  tenderness: 'none' | 'localised' | 'generalised' | 'rebound' | '';
  tenderLocation: string;
  bowelSoundsRUQ: 'present' | 'hypoactive' | 'hyperactive' | 'absent' | '';
  bowelSoundsLUQ: 'present' | 'hypoactive' | 'hyperactive' | 'absent' | '';
  bowelSoundsRLQ: 'present' | 'hypoactive' | 'hyperactive' | 'absent' | '';
  bowelSoundsLLQ: 'present' | 'hypoactive' | 'hyperactive' | 'absent' | '';
  nausea: boolean | null;
  vomiting: boolean | null;
  vomitDescription: string;
  lastBM: string;
  stoolCharacter: 'normal' | 'hard' | 'loose' | 'watery' | 'bloody' | 'melena' | '';
  dietTolerance: 'full' | 'partial' | 'npo' | 'ngt' | '';
  ngTubeDetails: string;
  notes: string;
}

const DEFAULT_FORM: GastrointestinalFormData = {
  studentName: '', abdomenAppearance: [], tenderness: '', tenderLocation: '',
  bowelSoundsRUQ: '', bowelSoundsLUQ: '', bowelSoundsRLQ: '', bowelSoundsLLQ: '',
  nausea: null, vomiting: null, vomitDescription: '',
  lastBM: '', stoolCharacter: '', dietTolerance: '', ngTubeDetails: '', notes: '',
};

const BS_OPTIONS = ['present', 'hypoactive', 'hyperactive', 'absent'] as const;
const BS_QUADRANTS = [
  { key: 'bowelSoundsRUQ' as const, label: 'RUQ' },
  { key: 'bowelSoundsLUQ' as const, label: 'LUQ' },
  { key: 'bowelSoundsRLQ' as const, label: 'RLQ' },
  { key: 'bowelSoundsLLQ' as const, label: 'LLQ' },
];
const ABDO_APPEARANCE = ['Flat', 'Distended', 'Rounded', 'Scaphoid', 'Rigid', 'Soft', 'Surgical scar'];

function validate(form: GastrointestinalFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.tenderness) return 'Document abdominal tenderness.';
  return null;
}

export function formatGISummary(data: Record<string, unknown>): AssessmentSummary {
  const nausea = data.nausea as boolean | null;
  const vomiting = data.vomiting as boolean | null;
  if (vomiting) return { label: 'Nausea & vomiting', color: 'amber' };
  if (nausea) return { label: 'Nausea present', color: 'amber' };
  return { label: 'No nausea/vomiting', color: 'green' };
}

export const GastrointestinalAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<GastrointestinalFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof GastrointestinalFormData>(key: K, value: GastrointestinalFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleAppearance = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      abdomenAppearance: prev.abdomenAppearance.includes(item)
        ? prev.abdomenAppearance.filter(a => a !== item)
        : [...prev.abdomenAppearance, item],
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

  const bsColor = (val: string) => {
    if (val === 'present') return 'bg-green-100 border-green-400 text-green-800';
    if (val === 'absent') return 'bg-red-100 border-red-400 text-red-800';
    return 'bg-amber-100 border-amber-400 text-amber-800';
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatGISummary} />

      <FlowsheetFormSection title="Abdominal Appearance">
        <div className="flex gap-2 flex-wrap">
          {ABDO_APPEARANCE.map(opt => (
            <button key={opt} type="button" onClick={() => toggleAppearance(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.abdomenAppearance.includes(opt) ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tenderness <span className="text-red-500">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'none', l: 'None' }, { v: 'localised', l: 'Localised' }, { v: 'generalised', l: 'Generalised' }, { v: 'rebound', l: 'Rebound' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('tenderness', v as GastrointestinalFormData['tenderness'])}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.tenderness === v ? v === 'none' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {form.tenderness && form.tenderness !== 'none' && (
            <input type="text" value={form.tenderLocation} onChange={e => set('tenderLocation', e.target.value)}
              placeholder="Location of tenderness (e.g. RLQ, epigastric)"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          )}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Bowel Sounds" description="Auscultate each quadrant for 1 minute before documenting absent">
        <div className="grid grid-cols-2 gap-3">
          {BS_QUADRANTS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
              <div className="flex gap-1.5 flex-wrap">
                {BS_OPTIONS.map(v => (
                  <button key={v} type="button" onClick={() => set(key, v)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all capitalize ${form[key] === v ? bsColor(v) : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Nausea & Vomiting">
        <div className="grid grid-cols-2 gap-4">
          {([['nausea', 'Nausea'], ['vomiting', 'Vomiting']] as const).map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <div className="flex gap-2">
                {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => set(field, opt.value)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${form[field] === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {form.vomiting && (
          <input type="text" value={form.vomitDescription} onChange={e => set('vomitDescription', e.target.value)}
            placeholder="Describe: colour, consistency, amount, frequency"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
        )}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Bowel Habits">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Bowel Movement</label>
            <input type="text" value={form.lastBM} onChange={e => set('lastBM', e.target.value)}
              placeholder="e.g. this morning, 2 days ago"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Stool Character</label>
            <select value={form.stoolCharacter} onChange={e => set('stoolCharacter', e.target.value as GastrointestinalFormData['stoolCharacter'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="">Select…</option>
              {['normal', 'hard', 'loose', 'watery', 'bloody', 'melena'].map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
            </select>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Nutrition & Diet">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Diet Tolerance</label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'full', l: 'Full diet' }, { v: 'partial', l: 'Partial tolerance' }, { v: 'npo', l: 'NPO' }, { v: 'ngt', l: 'NGT feeds' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('dietTolerance', v as GastrointestinalFormData['dietTolerance'])}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.dietTolerance === v ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {form.dietTolerance === 'ngt' && (
          <input type="text" value={form.ngTubeDetails} onChange={e => set('ngTubeDetails', e.target.value)}
            placeholder="NGT details: type, rate, formula, residual"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
        )}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional GI observations…"
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
