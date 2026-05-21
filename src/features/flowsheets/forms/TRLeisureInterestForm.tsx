import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'tr-leisure-interest' as const;

const INTEREST_CATEGORIES: { category: string; options: string[] }[] = [
  { category: 'Physical', options: ['Walking', 'Swimming', 'Cycling', 'Yoga', 'Gardening', 'Dancing', 'Sports', 'Exercise classes'] },
  { category: 'Creative', options: ['Painting / drawing', 'Crafts', 'Knitting / sewing', 'Photography', 'Writing', 'Music', 'Cooking / baking'] },
  { category: 'Social', options: ['Family activities', 'Community groups', 'Volunteering', 'Religious / spiritual groups', 'Social clubs', 'Games / cards'] },
  { category: 'Cognitive', options: ['Reading', 'Puzzles / crosswords', 'Board games', 'Computers / technology', 'Learning / courses', 'Trivia'] },
  { category: 'Nature & Outdoors', options: ['Hiking', 'Birdwatching', 'Fishing', 'Gardening', 'Nature walks', 'Camping'] },
];

interface TRLeisureInterestFormData {
  studentName: string;
  leisureHistory: string;
  currentInterests: string[];
  pastParticipationLevel: 'very-active' | 'moderately-active' | 'occasionally-active' | 'sedentary' | '';
  barriers: string[];
  otherBarriers: string;
  notes: string;
}

const DEFAULT_FORM: TRLeisureInterestFormData = {
  studentName: '', leisureHistory: '', currentInterests: [],
  pastParticipationLevel: '', barriers: [], otherBarriers: '', notes: '',
};

const BARRIER_OPTIONS = ['Physical limitations', 'Fatigue', 'Lack of transportation', 'Financial constraints', 'Social isolation', 'Cognitive difficulties', 'Anxiety / depression', 'Lack of time', 'Language / cultural barriers'];

function validate(form: TRLeisureInterestFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  return null;
}

export function formatTRLeisureInterestSummary(data: Record<string, unknown>): AssessmentSummary {
  const interests = data.currentInterests as string[] | undefined;
  if (interests && interests.length > 0) return { label: `${interests.length} interest${interests.length > 1 ? 's' : ''} identified`, color: 'green' };
  return { label: 'Leisure interests assessed', color: 'blue' };
}

export const TRLeisureInterestForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<TRLeisureInterestFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof TRLeisureInterestFormData>(key: K, value: TRLeisureInterestFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleInterest = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      currentInterests: prev.currentInterests.includes(item) ? prev.currentInterests.filter(i => i !== item) : [...prev.currentInterests, item],
    }));
  }, []);

  const toggleBarrier = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      barriers: prev.barriers.includes(item) ? prev.barriers.filter(b => b !== item) : [...prev.barriers, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatTRLeisureInterestSummary} />

      <FlowsheetFormSection title="Leisure History">
        <textarea value={form.leisureHistory} onChange={e => set('leisureHistory', e.target.value)} rows={3}
          placeholder="Describe the patient's past and current leisure activities and interests in their own words…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Past Participation Level</label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'very-active', l: 'Very active' }, { v: 'moderately-active', l: 'Moderately active' }, { v: 'occasionally-active', l: 'Occasionally active' }, { v: 'sedentary', l: 'Largely sedentary' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('pastParticipationLevel', v as TRLeisureInterestFormData['pastParticipationLevel'])}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.pastParticipationLevel === v ? v === 'very-active' || v === 'moderately-active' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Current Interests (select all that apply)">
        {INTEREST_CATEGORIES.map(({ category, options }) => (
          <div key={category} className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{category}</p>
            <div className="flex gap-2 flex-wrap">
              {options.map(opt => (
                <button key={opt} type="button" onClick={() => toggleInterest(opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.currentInterests.includes(opt) ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Barriers to Participation">
        <div className="flex gap-2 flex-wrap mb-2">
          {BARRIER_OPTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => toggleBarrier(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.barriers.includes(opt) ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
        <input type="text" value={form.otherBarriers} onChange={e => set('otherBarriers', e.target.value)}
          placeholder="Other barriers not listed above…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Additional observations about leisure interests and preferences…"
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
