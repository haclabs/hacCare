import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'tr-qol' as const;

interface TRQoLFormData {
  studentName: string;
  physicalWellbeing: number | null;
  socialWellbeing: number | null;
  emotionalWellbeing: number | null;
  functionalWellbeing: number | null;
  overallQoL: number | null;
  patientNarrative: string;
  assessmentMethod: 'verbal' | 'written' | 'scale-shown' | '';
  notesOnResponse: string;
  notes: string;
}

const DEFAULT_FORM: TRQoLFormData = {
  studentName: '', physicalWellbeing: null, socialWellbeing: null,
  emotionalWellbeing: null, functionalWellbeing: null, overallQoL: null,
  patientNarrative: '', assessmentMethod: '', notesOnResponse: '', notes: '',
};

const QOL_DOMAINS: { key: keyof Pick<TRQoLFormData, 'physicalWellbeing' | 'socialWellbeing' | 'emotionalWellbeing' | 'functionalWellbeing' | 'overallQoL'>; label: string; description: string }[] = [
  { key: 'physicalWellbeing', label: 'Physical Wellbeing', description: 'Energy, pain, physical health satisfaction' },
  { key: 'socialWellbeing', label: 'Social Wellbeing', description: 'Relationships, sense of belonging, social support' },
  { key: 'emotionalWellbeing', label: 'Emotional Wellbeing', description: 'Mood, happiness, sense of purpose' },
  { key: 'functionalWellbeing', label: 'Functional Wellbeing', description: 'Ability to do meaningful daily activities' },
  { key: 'overallQoL', label: 'Overall Quality of Life', description: 'Global rating of overall life quality today' },
];

function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 7) return 'text-green-600';
  if (score >= 4) return 'text-amber-600';
  return 'text-red-600';
}

function validate(form: TRQoLFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (form.overallQoL === null) return 'Rate overall quality of life.';
  return null;
}

export function formatTRQoLSummary(data: Record<string, unknown>): AssessmentSummary {
  const qol = data.overallQoL as number | null;
  if (qol !== null && qol !== undefined) {
    return { label: `Overall QoL: ${qol}/10`, color: qol >= 7 ? 'green' : qol >= 4 ? 'amber' : 'red' };
  }
  return { label: 'QoL assessment', color: 'blue' };
}

export const TRQualityOfLifeForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<TRQoLFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof TRQoLFormData>(key: K, value: TRQoLFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const ratedCount = useMemo(() => {
    return [form.physicalWellbeing, form.socialWellbeing, form.emotionalWellbeing, form.functionalWellbeing, form.overallQoL].filter(v => v !== null).length;
  }, [form.physicalWellbeing, form.socialWellbeing, form.emotionalWellbeing, form.functionalWellbeing, form.overallQoL]);

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

  const ScoreSelector = ({ field, label, description }: { field: keyof Pick<TRQoLFormData, 'physicalWellbeing' | 'socialWellbeing' | 'emotionalWellbeing' | 'functionalWellbeing' | 'overallQoL'>; label: string; description: string }) => {
    const value = form[field];
    return (
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {field === 'overallQoL' && <span className="text-red-500 ml-1">*</span>}
            <p className="text-xs text-gray-400">{description}</p>
          </div>
          <span className={`text-xl font-bold min-w-[3ch] text-right ${scoreColor(value)}`}>{value ?? '—'}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button key={n} type="button" onClick={() => set(field, n)}
              className={`flex-1 h-9 rounded text-xs font-medium border transition-all ${value === n ? n >= 7 ? 'bg-green-500 border-green-500 text-white' : n >= 4 ? 'bg-amber-500 border-amber-500 text-white' : 'bg-red-500 border-red-500 text-white' : n >= 7 ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : n >= 4 ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-xs text-gray-400">Poor</span>
          <span className="text-xs text-gray-400">Excellent</span>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatTRQoLSummary} />

      <div className="bg-blue-50 rounded-lg border border-blue-200 px-4 py-3 text-sm text-blue-700">
        Rate each domain from <strong>1</strong> (very poor) to <strong>10</strong> (excellent). Ratings reflect the patient's own perception of wellbeing today.
        {ratedCount > 0 && <span className="ml-2 font-medium">{ratedCount} of 5 domains rated.</span>}
      </div>

      <FlowsheetFormSection title="Assessment Method">
        <div className="flex gap-2">
          {[{ v: 'verbal', l: 'Verbal response' }, { v: 'written', l: 'Written scale' }, { v: 'scale-shown', l: 'Visual scale shown' }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => set('assessmentMethod', v as TRQoLFormData['assessmentMethod'])}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.assessmentMethod === v ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Quality of Life Ratings">
        <div className="space-y-5">
          {QOL_DOMAINS.map(({ key, label, description }) => (
            <ScoreSelector key={key} field={key} label={label} description={description} />
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Patient Narrative">
        <label className="block text-xs text-gray-500 mb-2">"In your own words, how would you describe your quality of life right now?"</label>
        <textarea value={form.patientNarrative} onChange={e => set('patientNarrative', e.target.value)} rows={3}
          placeholder="Document the patient's response in their own words…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Notes on Assessment Response">
        <textarea value={form.notesOnResponse} onChange={e => set('notesOnResponse', e.target.value)} rows={2}
          placeholder="How did the patient respond to this assessment? Any difficulties understanding, emotional response, etc."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Additional clinical notes or observations…"
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
