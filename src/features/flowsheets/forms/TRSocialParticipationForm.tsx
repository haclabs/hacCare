import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'tr-social' as const;

interface TRSocialFormData {
  studentName: string;
  socialEngagementLevel: 'highly-engaged' | 'moderately-engaged' | 'minimally-engaged' | 'isolated' | '';
  isolationRisk: 'low' | 'moderate' | 'high' | '';
  communityConnections: string[];
  familyInvolvement: 'very-involved' | 'occasionally-involved' | 'rarely-involved' | 'no-family-contact' | '';
  communicationAbility: 'verbal-clear' | 'verbal-limited' | 'non-verbal' | 'written' | 'aac-device' | '';
  languageBarrier: boolean | null;
  languageBarrierDetails: string;
  socialGoals: string;
  interventionsPlanned: string[];
  notes: string;
}

const DEFAULT_FORM: TRSocialFormData = {
  studentName: '', socialEngagementLevel: '', isolationRisk: '',
  communityConnections: [], familyInvolvement: '', communicationAbility: '',
  languageBarrier: null, languageBarrierDetails: '', socialGoals: '',
  interventionsPlanned: [], notes: '',
};

const COMMUNITY_OPTIONS = ['Religious / faith community', 'Sports team / club', 'Seniors group', 'Volunteer organisation', 'Cultural group', 'Neighbourhood / neighbours', 'Online community'];
const SOCIAL_INTERVENTIONS = ['Group programs', 'One-on-one visits', 'Family meetings', 'Community outings', 'Peer support', 'Video calls facilitated', 'Social dining', 'Intergenerational programs'];

function validate(form: TRSocialFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.socialEngagementLevel) return 'Document social engagement level.';
  return null;
}

export function formatTRSocialSummary(data: Record<string, unknown>): AssessmentSummary {
  const isolation = data.isolationRisk as string;
  const engagement = data.socialEngagementLevel as string;
  if (isolation === 'high') return { label: 'High isolation risk', color: 'red' };
  if (isolation === 'moderate') return { label: 'Moderate isolation risk', color: 'amber' };
  if (engagement === 'highly-engaged') return { label: 'Highly engaged', color: 'green' };
  return { label: 'Social assessment', color: 'blue' };
}

export const TRSocialParticipationForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<TRSocialFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof TRSocialFormData>(key: K, value: TRSocialFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleCommunity = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      communityConnections: prev.communityConnections.includes(item) ? prev.communityConnections.filter(c => c !== item) : [...prev.communityConnections, item],
    }));
  }, []);

  const toggleIntervention = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      interventionsPlanned: prev.interventionsPlanned.includes(item) ? prev.interventionsPlanned.filter(i => i !== item) : [...prev.interventionsPlanned, item],
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatTRSocialSummary} />

      <FlowsheetFormSection title="Social Engagement">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Level <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'highly-engaged', l: 'Highly engaged' }, { v: 'moderately-engaged', l: 'Moderately engaged' }, { v: 'minimally-engaged', l: 'Minimally engaged' }, { v: 'isolated', l: 'Isolated' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('socialEngagementLevel', v as TRSocialFormData['socialEngagementLevel'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.socialEngagementLevel === v ? v === 'highly-engaged' ? 'bg-green-100 border-green-400 text-green-800' : v === 'isolated' ? 'bg-red-100 border-red-400 text-red-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Isolation Risk</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'low', l: 'Low' }, { v: 'moderate', l: 'Moderate' }, { v: 'high', l: 'High' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('isolationRisk', v as TRSocialFormData['isolationRisk'])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.isolationRisk === v ? v === 'low' ? 'bg-green-100 border-green-400 text-green-800' : v === 'high' ? 'bg-red-100 border-red-400 text-red-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Connections & Communication">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Community Connections</label>
            <div className="flex gap-2 flex-wrap">
              {COMMUNITY_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggleCommunity(opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.communityConnections.includes(opt) ? 'bg-teal-100 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Family Involvement</label>
              <select value={form.familyInvolvement} onChange={e => set('familyInvolvement', e.target.value as TRSocialFormData['familyInvolvement'])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">Select…</option>
                <option value="very-involved">Very involved</option>
                <option value="occasionally-involved">Occasionally involved</option>
                <option value="rarely-involved">Rarely involved</option>
                <option value="no-family-contact">No family contact</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Communication Ability</label>
              <select value={form.communicationAbility} onChange={e => set('communicationAbility', e.target.value as TRSocialFormData['communicationAbility'])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">Select…</option>
                <option value="verbal-clear">Verbal — clear</option>
                <option value="verbal-limited">Verbal — limited</option>
                <option value="non-verbal">Non-verbal</option>
                <option value="written">Written</option>
                <option value="aac-device">AAC / communication device</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language Barrier</label>
            <div className="flex gap-3 mb-2">
              {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => set('languageBarrier', opt.value)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.languageBarrier === opt.value ? opt.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form.languageBarrier && (
              <input type="text" value={form.languageBarrierDetails} onChange={e => set('languageBarrierDetails', e.target.value)}
                placeholder="Language spoken, interpreter required, support strategies used…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            )}
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Social Goals">
        <textarea value={form.socialGoals} onChange={e => set('socialGoals', e.target.value)} rows={2}
          placeholder="Patient-identified social goals or RT social participation goals…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Planned Social Interventions">
        <div className="flex gap-2 flex-wrap">
          {SOCIAL_INTERVENTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => toggleIntervention(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${form.interventionsPlanned.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Additional social participation observations…"
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
