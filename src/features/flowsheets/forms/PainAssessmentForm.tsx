/**
 * PainAssessmentForm
 *
 * Native flowsheet form for pain assessment — implements FlowsheetFormProps.
 * This is the reference implementation; all subsequent forms follow the same
 * structural pattern:
 *
 *   1. Types + constants at the top (local to the file)
 *   2. dataToForm() — maps the stored JSONB payload back to typed form state
 *   3. validate() — returns an error string or null (no external validation lib)
 *   4. Optional local sub-components (NrsScale here) before the main export
 *   5. Main component:
 *        a. useLatestSystemAssessment → pre-fill + "last recorded" banner
 *        b. useState for field state, separate useState for validationError
 *        c. useSaveSystemAssessment → save on submit
 *        d. FlowsheetFormSection wrappers for logical field groups
 *        e. Save bar card at the bottom (error inline, Cancel + Save buttons)
 *
 * Writing a new form: copy this file, replace fields + constants + systemType.
 * Register the export in formRegistry.ts and flip status in registry.ts.
 */

import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

// ── Local types ───────────────────────────────────────────────────────────────

interface PainFormData {
  // ── Identity (required, stored as nurse_name — used for debrief grouping) ──
  studentName: string;
  // ── Clinical fields (stored in assessment_data JSONB) ────────────────────
  painPresent: boolean | null;
  nrsScore: number;
  location: string;
  quality: string[];
  timing: string;
  aggravatingFactors: string;
  relievingFactors: string;
  intervention: string;
  interventionResponse: string;
  notes: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_TYPE = 'pain' as const;

const PAIN_LOCATIONS = [
  'Head / Face', 'Neck', 'Chest', 'Abdomen',
  'Back (upper)', 'Back (lower)', 'Left arm', 'Right arm',
  'Left leg', 'Right leg', 'Generalised', 'Other',
];

const PAIN_QUALITIES = [
  'Sharp', 'Dull', 'Aching', 'Burning', 'Stabbing',
  'Throbbing', 'Cramping', 'Pressure', 'Radiating',
];

const PAIN_TIMINGS = ['Constant', 'Intermittent', 'Comes and goes'];

const INTERVENTIONS = [
  { value: 'none',          label: 'No intervention' },
  { value: 'repositioning', label: 'Repositioning' },
  { value: 'medication',    label: 'Medication administered' },
  { value: 'heat-cold',     label: 'Heat / cold application' },
  { value: 'distraction',   label: 'Distraction techniques' },
  { value: 'breathing',     label: 'Breathing techniques' },
  { value: 'other',         label: 'Other' },
];

const NRS_DESCRIPTOR: Record<number, string> = {
  0: 'No pain', 1: 'Very mild', 2: 'Mild', 3: 'Mild–moderate',
  4: 'Moderate', 5: 'Moderate', 6: 'Moderate–severe',
  7: 'Severe', 8: 'Very severe', 9: 'Intense', 10: 'Worst pain',
};

const DEFAULT_FORM: PainFormData = {
  studentName: '',
  painPresent: null, nrsScore: 0, location: '', quality: [],
  timing: '', aggravatingFactors: '', relievingFactors: '',
  intervention: 'none', interventionResponse: '', notes: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(form: PainFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (form.painPresent === null) return 'Indicate whether the patient currently has pain.';
  if (form.painPresent && !form.location) return 'Select a pain location.';
  return null;
}

function nrsClass(score: number, selected: boolean): string {
  if (score === 0)  return selected ? 'bg-gray-200 border-gray-400 text-gray-900 ring-2 ring-gray-400 ring-offset-1'  : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200';
  if (score <= 3) return selected ? 'bg-green-200 border-green-500 text-green-900 ring-2 ring-green-500 ring-offset-1' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
  if (score <= 6) return selected ? 'bg-amber-200 border-amber-500 text-amber-900 ring-2 ring-amber-500 ring-offset-1' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
  return selected ? 'bg-red-200 border-red-500 text-red-900 ring-2 ring-red-500 ring-offset-1' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100';
}

// ── Pain history summary (used by AssessmentHistoryStrip) ────────────────────

function formatPainSummary(data: Record<string, unknown>): AssessmentSummary {
  if (!data.painPresent) return { label: 'No pain', color: 'green' };
  const nrs = (data.nrsScore as number) ?? 0;
  const location = (data.location as string) || '';
  const label = location ? `NRS ${nrs} · ${location}` : `NRS ${nrs}`;
  const color = nrs >= 7 ? 'red' : nrs >= 4 ? 'amber' : 'green';
  return { label, color };
}

// ── NRS Scale (local sub-component) ──────────────────────────────────────────

interface NrsScaleProps {
  value: number;
  onChange: (score: number) => void;
}

const NrsScale: React.FC<NrsScaleProps> = ({ value, onChange }) => (
  <div className="space-y-3">
    <div className="flex gap-1.5">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`flex-1 rounded-lg border py-2.5 text-sm font-bold transition-all ${nrsClass(i, value === i)}`}
        >
          {i}
        </button>
      ))}
    </div>
    <div className="flex justify-between text-xs text-gray-500">
      <span>No pain</span>
      <span className={`font-medium ${value >= 7 ? 'text-red-600' : value >= 4 ? 'text-amber-600' : value > 0 ? 'text-green-600' : 'text-gray-400'}`}>
        {NRS_DESCRIPTOR[value]}
      </span>
      <span>Worst pain</span>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const PainAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline = false,
  onSaved,
  onCancel,
}) => {
  const [form, setForm] = useState<PainFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { save, isSaving, error: saveError } = useSaveSystemAssessment(
    patient.id, tenantId, SYSTEM_TYPE,
  );

  const set = useCallback(<K extends keyof PainFormData>(key: K, value: PainFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleQuality = useCallback((item: string) => {
    setForm(prev => ({
      ...prev,
      quality: prev.quality.includes(item)
        ? prev.quality.filter(q => q !== item)
        : [...prev.quality, item],
    }));
    setValidationError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }

    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id,
      tenant_id:  tenantId,
      system_type: SYSTEM_TYPE,
      assessment_data: clinicalFields as Record<string, unknown>,
      nurse_id:   currentUser?.id ?? null,
      nurse_name: studentName.trim(),
      is_baseline: isBaseline,
    };

    await save(payload);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* ── Prior assessments this session ── */}
      <AssessmentHistoryStrip
        patientId={patient.id}
        tenantId={tenantId}
        systemType={SYSTEM_TYPE}
        formatSummary={formatPainSummary}
      />

      {/* ── Pain status ── */}
      <FlowsheetFormSection title="Pain Status">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Does the patient currently have pain?
            <span className="text-red-500 ml-1" aria-hidden>*</span>
          </legend>
          <div className="flex gap-3">
            {([{ label: 'Yes', value: true }, { label: 'No', value: false }] as const).map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => set('painPresent', opt.value)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                  form.painPresent === opt.value
                    ? opt.value
                      ? 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200'
                      : 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </FlowsheetFormSection>

      {/* ── Pain-present fields ── */}
      {form.painPresent && (
        <>
          <FlowsheetFormSection
            title="Pain Rating"
            description="Numeric Rating Scale (NRS) — ask the patient to rate their pain from 0 to 10"
          >
            <NrsScale value={form.nrsScore} onChange={v => set('nrsScore', v)} />
          </FlowsheetFormSection>

          <FlowsheetFormSection title="Pain Characteristics">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Location <span className="text-red-500" aria-hidden>*</span>
              </label>
              <select
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select location…</option>
                {PAIN_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>

            {/* Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timing</label>
              <div className="flex gap-2 flex-wrap">
                {PAIN_TIMINGS.map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => set('timing', form.timing === t ? '' : t)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                      form.timing === t
                        ? 'bg-blue-100 border-blue-400 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Quality <span className="text-gray-400 font-normal text-xs">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PAIN_QUALITIES.map(q => (
                  <button
                    key={q} type="button"
                    onClick={() => toggleQuality(q)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                      form.quality.includes(q)
                        ? 'bg-violet-100 border-violet-400 text-violet-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >{q}</button>
                ))}
              </div>
            </div>
          </FlowsheetFormSection>

          <FlowsheetFormSection title="Contributing Factors">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Aggravating factors</label>
              <textarea
                value={form.aggravatingFactors}
                onChange={e => set('aggravatingFactors', e.target.value)}
                rows={2}
                placeholder="What makes the pain worse?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Relieving factors</label>
              <textarea
                value={form.relievingFactors}
                onChange={e => set('relievingFactors', e.target.value)}
                rows={2}
                placeholder="What makes the pain better?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </FlowsheetFormSection>

          <FlowsheetFormSection title="Intervention">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Intervention provided</label>
              <select
                value={form.intervention}
                onChange={e => set('intervention', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {INTERVENTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            {form.intervention !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Response to intervention</label>
                <textarea
                  value={form.interventionResponse}
                  onChange={e => set('interventionResponse', e.target.value)}
                  rows={2}
                  placeholder="Describe the patient's response…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            )}
          </FlowsheetFormSection>
        </>
      )}

      {/* ── Additional notes (always visible) ── */}
      <FlowsheetFormSection title="Additional Notes">
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Any additional clinical observations…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
      </FlowsheetFormSection>

      {/* ── Student name (required — stored as nurse_name for debrief) ── */}
      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Student Name
          <span className="text-red-500 ml-1" aria-hidden>*</span>
        </label>
        <input
          type="text"
          value={form.studentName}
          onChange={e => set('studentName', e.target.value)}
          placeholder="e.g. Jane Smith"
          autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none"
        />
        <p className="text-xs text-gray-500">
          By entering your name, you verify that you assessed this patient and recorded these findings.
        </p>
      </div>

      {/* ── Save bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {(validationError ?? saveError) && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {validationError ?? 'Save failed — please try again.'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>

    </form>
  );
};
