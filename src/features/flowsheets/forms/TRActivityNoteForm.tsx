import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'tr-participation' as const;

interface TRActivityNoteFormData {
  studentName: string;
  activityName: string;
  activityType: 'group' | 'individual' | 'community-outing' | 'virtual' | '';
  domain: string[];
  durationMinutes: string;
  participantResponse: 'enthusiastic' | 'engaged' | 'passive' | 'reluctant' | 'refused' | '';
  engagementQuality: 'high' | 'moderate' | 'low' | '';
  goalProgress: string;
  adaptationsRequired: boolean | null;
  adaptationDetails: string;
  behaviourObserved: string;
  participantQuote: string;
  recommendations: string;
  notes: string;
}

const DEFAULT_FORM: TRActivityNoteFormData = {
  studentName: '', activityName: '', activityType: '', domain: [],
  durationMinutes: '', participantResponse: '', engagementQuality: '',
  goalProgress: '', adaptationsRequired: null, adaptationDetails: '',
  behaviourObserved: '', participantQuote: '', recommendations: '', notes: '',
};

const DOMAINS = ['Physical', 'Cognitive', 'Social', 'Emotional', 'Spiritual', 'Leisure education'];

function validate(form: TRActivityNoteFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.activityName.trim()) return 'Enter the activity name.';
  if (!form.participantResponse) return 'Document participant response.';
  return null;
}

export function formatTRActivityNoteSummary(data: Record<string, unknown>): AssessmentSummary {
  const activity = data.activityName as string;
  const response = data.participantResponse as string;
  if (activity && response) return { label: `${activity} — ${response}`, color: response === 'enthusiastic' || response === 'engaged' ? 'green' : response === 'refused' ? 'red' : 'amber' };
  if (activity) return { label: activity, color: 'blue' };
  return { label: 'Activity documented', color: 'blue' };
}

export const TRActivityNoteForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<TRActivityNoteFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof TRActivityNoteFormData>(key: K, value: TRActivityNoteFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleDomain = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      domain: prev.domain.includes(item) ? prev.domain.filter(d => d !== item) : [...prev.domain, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatTRActivityNoteSummary} />

      <FlowsheetFormSection title="Activity Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Activity Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.activityName} onChange={e => set('activityName', e.target.value)}
              placeholder="e.g. Chair yoga, Art group, Reminiscence session"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes)</label>
            <input type="number" min={1} value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)}
              placeholder="e.g. 45"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
          <div className="flex gap-2 flex-wrap">
            {[{ v: 'group', l: 'Group' }, { v: 'individual', l: 'Individual' }, { v: 'community-outing', l: 'Community outing' }, { v: 'virtual', l: 'Virtual' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set('activityType', v as TRActivityNoteFormData['activityType'])}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.activityType === v ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Domain(s)</label>
          <div className="flex gap-2 flex-wrap">
            {DOMAINS.map(opt => (
              <button key={opt} type="button" onClick={() => toggleDomain(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.domain.includes(opt) ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Participant Response">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Response <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'enthusiastic', l: 'Enthusiastic' }, { v: 'engaged', l: 'Engaged' }, { v: 'passive', l: 'Passive' }, { v: 'reluctant', l: 'Reluctant' }, { v: 'refused', l: 'Refused' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('participantResponse', v as TRActivityNoteFormData['participantResponse'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.participantResponse === v ? v === 'enthusiastic' || v === 'engaged' ? 'bg-green-100 border-green-400 text-green-800' : v === 'refused' ? 'bg-red-100 border-red-400 text-red-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Quality</label>
            <div className="flex gap-2 flex-wrap">
              {['high', 'moderate', 'low'].map(v => (
                <button key={v} type="button" onClick={() => set('engagementQuality', v as TRActivityNoteFormData['engagementQuality'])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all capitalize ${form.engagementQuality === v ? v === 'high' ? 'bg-green-100 border-green-400 text-green-800' : v === 'low' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Behaviours Observed</label>
          <textarea value={form.behaviourObserved} onChange={e => set('behaviourObserved', e.target.value)} rows={2}
            placeholder="e.g. Patient smiled frequently, made eye contact, engaged in conversation with peers, demonstrated improved fine motor coordination"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Participant Quote (verbatim)</label>
          <input type="text" value={form.participantQuote} onChange={e => set('participantQuote', e.target.value)}
            placeholder={`e.g. "I really enjoyed that, I haven't painted since I was in school"`}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Goal Progress">
        <textarea value={form.goalProgress} onChange={e => set('goalProgress', e.target.value)} rows={2}
          placeholder="Document progress toward identified TR goals (reference specific goal)…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Adaptations & Recommendations">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Adaptations Required?</label>
          <div className="flex gap-3 mb-2">
            {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
              <button key={String(opt.value)} type="button" onClick={() => set('adaptationsRequired', opt.value)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.adaptationsRequired === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          {form.adaptationsRequired && (
            <input type="text" value={form.adaptationDetails} onChange={e => set('adaptationDetails', e.target.value)}
              placeholder="Describe adaptations made (e.g. seated version, enlarged print, one-on-one support)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
          )}
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Recommendations for Next Session</label>
          <textarea value={form.recommendations} onChange={e => set('recommendations', e.target.value)} rows={2}
            placeholder="Recommendations or adjustments for future sessions…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Any additional notes…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Student Name <span className="text-red-500 ml-1">*</span></label>
        <input type="text" value={form.studentName} onChange={e => set('studentName', e.target.value)}
          placeholder="e.g. Jane Smith" autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none" />
        <p className="text-xs text-gray-500">By entering your name, you verify that you facilitated this activity and recorded these observations.</p>
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
            {isSaving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </form>
  );
};
