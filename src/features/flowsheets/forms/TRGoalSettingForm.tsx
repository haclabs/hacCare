import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'tr-goals' as const;

interface TRGoal {
  id: string;
  goalText: string;
  domain: 'physical' | 'cognitive' | 'social' | 'emotional' | 'spiritual' | 'leisure' | '';
  measurableOutcome: string;
  targetTimeframe: string;
  priority: 'high' | 'medium' | 'low' | '';
}

interface TRGoalSettingFormData {
  studentName: string;
  clientCentredProcess: string;
  goals: TRGoal[];
  interventionPlan: string;
  reviewDate: string;
  notes: string;
}

const DEFAULT_FORM: TRGoalSettingFormData = {
  studentName: '', clientCentredProcess: '', goals: [], interventionPlan: '', reviewDate: '', notes: '',
};

function newGoal(): TRGoal {
  return { id: crypto.randomUUID(), goalText: '', domain: '', measurableOutcome: '', targetTimeframe: '', priority: '' };
}

function validate(form: TRGoalSettingFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (form.goals.length === 0) return 'Add at least one goal.';
  for (const goal of form.goals) {
    if (!goal.goalText.trim()) return 'Enter goal text for all goals.';
  }
  return null;
}

export function formatTRGoalsSummary(data: Record<string, unknown>): AssessmentSummary {
  const goals = data.goals as TRGoal[] | undefined;
  if (goals && goals.length > 0) return { label: `${goals.length} goal${goals.length > 1 ? 's' : ''} documented`, color: 'green' };
  return { label: 'Goal setting documented', color: 'blue' };
}

export const TRGoalSettingForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<TRGoalSettingFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof TRGoalSettingFormData>(key: K, value: TRGoalSettingFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const addGoal = useCallback(() => setForm(prev => ({ ...prev, goals: [...prev.goals, newGoal()] })), []);
  const removeGoal = useCallback((id: string) => setForm(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) })), []);
  const updateGoal = useCallback((id: string, field: keyof TRGoal, value: string) => {
    setForm(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, [field]: value } : g) }));
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
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatTRGoalsSummary} />

      <FlowsheetFormSection title="Client-Centred Goal Setting Process">
        <textarea value={form.clientCentredProcess} onChange={e => set('clientCentredProcess', e.target.value)} rows={3}
          placeholder="Describe how goals were identified collaboratively with the patient (strengths-based approach, patient's own words, preferences considered)…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Therapeutic Recreation Goals">
        {form.goals.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">No goals added yet. Click below to add a goal.</p>
        )}
        {form.goals.map((goal, index) => (
          <div key={goal.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Goal #{index + 1}</span>
              <button type="button" onClick={() => removeGoal(goal.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goal <span className="text-red-500">*</span></label>
              <textarea value={goal.goalText} onChange={e => updateGoal(goal.id, 'goalText', e.target.value)} rows={2}
                placeholder="e.g. Patient will participate in one group social activity per day to improve social connection"
                className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
                <select value={goal.domain} onChange={e => updateGoal(goal.id, 'domain', e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="">Select…</option>
                  <option value="physical">Physical</option>
                  <option value="cognitive">Cognitive</option>
                  <option value="social">Social</option>
                  <option value="emotional">Emotional</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="leisure">Leisure</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select value={goal.priority} onChange={e => updateGoal(goal.id, 'priority', e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="">Select…</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Timeframe</label>
                <input type="text" value={goal.targetTimeframe} onChange={e => updateGoal(goal.id, 'targetTimeframe', e.target.value)}
                  placeholder="e.g. 2 weeks"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Measurable Outcome</label>
              <input type="text" value={goal.measurableOutcome} onChange={e => updateGoal(goal.id, 'measurableOutcome', e.target.value)}
                placeholder="e.g. 3 out of 5 group sessions attended per week; self-reports improved mood on 1-10 scale"
                className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addGoal}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add Goal
        </button>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Intervention Plan">
        <textarea value={form.interventionPlan} onChange={e => set('interventionPlan', e.target.value)} rows={3}
          placeholder="Describe the planned therapeutic recreation interventions to support goal achievement…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Review Date">
        <input type="date" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          placeholder="Additional notes about the goal-setting session…"
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
