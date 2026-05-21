import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'fall-risk' as const;

interface FallRiskFormData {
  studentName: string;
  historyOfFalling: 0 | 25;
  secondaryDiagnosis: 0 | 15;
  ambulatoryAid: 0 | 15 | 30;
  ivHeparinLock: 0 | 20;
  gait: 0 | 10 | 20;
  mentalStatus: 0 | 15;
  interventionsPlanned: string[];
  notes: string;
}

const DEFAULT_FORM: FallRiskFormData = {
  studentName: '',
  historyOfFalling: 0,
  secondaryDiagnosis: 0,
  ambulatoryAid: 0,
  ivHeparinLock: 0,
  gait: 0,
  mentalStatus: 0,
  interventionsPlanned: [],
  notes: '',
};

const INTERVENTIONS = [
  'Bed alarm', 'Non-slip footwear', 'Bed in lowest position', 'Call bell within reach',
  'Frequent rounding', 'Fall risk wristband', 'Fall risk sign posted', 'Grip socks provided',
  'Supervised ambulation', 'Hourly rounding', 'Bedside commode',
];

function getRiskLevel(score: number): { level: string; color: AssessmentSummary['color'] } {
  if (score < 25) return { level: 'Low Risk', color: 'green' };
  if (score < 45) return { level: 'Moderate Risk', color: 'amber' };
  return { level: 'High Risk', color: 'red' };
}

function validate(form: FallRiskFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  return null;
}

export function formatFallRiskSummary(data: Record<string, unknown>): AssessmentSummary {
  const score = (
    (data.historyOfFalling as number ?? 0) +
    (data.secondaryDiagnosis as number ?? 0) +
    (data.ambulatoryAid as number ?? 0) +
    (data.ivHeparinLock as number ?? 0) +
    (data.gait as number ?? 0) +
    (data.mentalStatus as number ?? 0)
  );
  const { level, color } = getRiskLevel(score);
  return { label: `Score ${score} — ${level}`, color };
}

export const FallRiskAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<FallRiskFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof FallRiskFormData>(key: K, value: FallRiskFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleIntervention = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      interventionsPlanned: prev.interventionsPlanned.includes(item)
        ? prev.interventionsPlanned.filter(i => i !== item)
        : [...prev.interventionsPlanned, item],
    }));
  }, []);

  const totalScore = useMemo(() => (
    form.historyOfFalling + form.secondaryDiagnosis + form.ambulatoryAid + form.ivHeparinLock + form.gait + form.mentalStatus
  ), [form]);

  const { level, color } = getRiskLevel(totalScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id, tenant_id: tenantId, system_type: SYSTEM_TYPE,
      assessment_data: { ...clinicalFields, totalScore } as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    await save(payload);
    onSaved();
  };

  const scoreBadge = color === 'green'
    ? 'bg-green-100 border-green-300 text-green-800'
    : color === 'amber'
    ? 'bg-amber-100 border-amber-300 text-amber-800'
    : 'bg-red-100 border-red-300 text-red-800';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatFallRiskSummary} />

      {/* Running Score Banner */}
      <div className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 ${scoreBadge}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Morse Fall Scale — Total Score</p>
          <p className="text-3xl font-bold mt-0.5">{totalScore}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{level}</p>
          <p className="text-xs opacity-70">{totalScore < 25 ? '&lt;25' : totalScore < 45 ? '25–44' : '≥45'}</p>
        </div>
      </div>

      <FlowsheetFormSection title="Morse Fall Scale Items">
        <div className="space-y-4">
          {/* History of falling */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">1. History of falling (within last 3 months or at admission)</label>
            <div className="flex gap-3">
              {([{ v: 0, l: 'No — 0 pts' }, { v: 25, l: 'Yes — 25 pts' }] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('historyOfFalling', v)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.historyOfFalling === v ? v === 0 ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* Secondary diagnosis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">2. Secondary diagnosis (≥2 medical diagnoses)</label>
            <div className="flex gap-3">
              {([{ v: 0, l: 'No — 0 pts' }, { v: 15, l: 'Yes — 15 pts' }] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('secondaryDiagnosis', v)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.secondaryDiagnosis === v ? v === 0 ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* Ambulatory aid */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Ambulatory aid</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { v: 0, l: 'None / bedrest / nurse assist — 0 pts' },
                { v: 15, l: 'Crutches / cane / walker — 15 pts' },
                { v: 30, l: 'Furniture — 30 pts' },
              ] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('ambulatoryAid', v)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.ambulatoryAid === v ? v === 0 ? 'bg-green-50 border-green-400 text-green-700' : v === 15 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* IV / heparin lock */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">4. IV / heparin lock</label>
            <div className="flex gap-3">
              {([{ v: 0, l: 'No — 0 pts' }, { v: 20, l: 'Yes — 20 pts' }] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('ivHeparinLock', v)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.ivHeparinLock === v ? v === 0 ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* Gait */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">5. Gait / transferring</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { v: 0, l: 'Normal / bedrest / immobile — 0 pts' },
                { v: 10, l: 'Weak — 10 pts' },
                { v: 20, l: 'Impaired — 20 pts' },
              ] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('gait', v)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.gait === v ? v === 0 ? 'bg-green-50 border-green-400 text-green-700' : v === 10 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* Mental status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">6. Mental status</label>
            <div className="flex gap-3">
              {([
                { v: 0, l: 'Oriented to own ability — 0 pts' },
                { v: 15, l: 'Overestimates / forgets limitations — 15 pts' },
              ] as const).map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('mentalStatus', v)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.mentalStatus === v ? v === 0 ? 'bg-green-50 border-green-400 text-green-700' : 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Fall Prevention Interventions">
        <div className="flex gap-2 flex-wrap">
          {INTERVENTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => toggleIntervention(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.interventionsPlanned.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional fall-risk observations or interventions…"
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
