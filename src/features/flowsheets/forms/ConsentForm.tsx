/**
 * ConsentForm
 *
 * Native flowsheet form for informed consent documentation — implements
 * FlowsheetFormProps.  Covers the key elements of a Canadian hospital
 * informed consent process while remaining lean enough for simulation use.
 *
 * Sections:
 *   1. Consent type + procedure details
 *   2. Disclosure (risks, alternatives, opportunity for questions)
 *   3. Capacity & decision-maker
 *   4. Interpreter requirements
 *   5. Consent decision
 *   6. Student name + save bar
 */

import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

// ── Local types ───────────────────────────────────────────────────────────────

interface ConsentFormData {
  studentName: string;
  // Consent type
  consentType: string;
  procedureName: string;
  procedureDescription: string;
  // Disclosure
  risksDiscussed: string;
  alternativesDiscussed: boolean | null;
  questionsAddressed: boolean | null;
  // Capacity & SDM
  patientCapable: boolean | null;
  sdmName: string;
  sdmRelationship: string;
  // Interpreter
  interpreterRequired: boolean | null;
  interpreterLanguage: string;
  // Decision
  consentDecision: 'obtained' | 'refused' | 'deferred' | '';
  witnessName: string;
  notes: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_TYPE = 'consent' as const;

const CONSENT_TYPES = [
  'Procedure (non-surgical)',
  'Surgical procedure',
  'Anaesthesia',
  'Blood / blood products',
  'Treatment plan',
  'Diagnostic imaging / invasive test',
  'Photography / recording',
  'Research participation',
  'Other',
];

const SDM_RELATIONSHIPS = [
  'Spouse / partner', 'Parent', 'Adult child', 'Sibling',
  'Legal guardian', 'Power of attorney', 'Other',
];

const DECISION_OPTIONS: { value: ConsentFormData['consentDecision']; label: string; color: string }[] = [
  { value: 'obtained',  label: 'Consent obtained',  color: 'green'  },
  { value: 'refused',   label: 'Consent refused',   color: 'red'    },
  { value: 'deferred',  label: 'Decision deferred', color: 'amber'  },
];

const DEFAULT_FORM: ConsentFormData = {
  studentName: '',
  consentType: '',
  procedureName: '',
  procedureDescription: '',
  risksDiscussed: '',
  alternativesDiscussed: null,
  questionsAddressed: null,
  patientCapable: null,
  sdmName: '',
  sdmRelationship: '',
  interpreterRequired: null,
  interpreterLanguage: '',
  consentDecision: '',
  witnessName: '',
  notes: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(form: ConsentFormData): string | null {
  if (!form.studentName.trim())       return 'Enter your name before saving.';
  if (!form.consentType)              return 'Select the type of consent being documented.';
  if (!form.procedureName.trim())     return 'Enter the procedure or treatment name.';
  if (form.patientCapable === null)   return 'Indicate whether the patient has capacity to consent.';
  if (!form.patientCapable && !form.sdmName.trim())
    return 'Enter the name of the substitute decision-maker.';
  if (form.interpreterRequired === null)
    return 'Indicate whether an interpreter was required.';
  if (form.interpreterRequired && !form.interpreterLanguage.trim())
    return 'Specify the interpreter language required.';
  if (!form.consentDecision)          return 'Record the consent decision.';
  return null;
}

function formatConsentSummary(data: Record<string, unknown>): AssessmentSummary {
  const decision = data.consentDecision as string;
  if (decision === 'obtained')  return { label: `Consent obtained · ${data.procedureName || ''}`.trimEnd().replace(/·\s*$/, ''), color: 'green' };
  if (decision === 'refused')   return { label: `Consent refused · ${data.procedureName || ''}`.trimEnd().replace(/·\s*$/, ''), color: 'red' };
  if (decision === 'deferred')  return { label: 'Decision deferred', color: 'amber' };
  return { label: 'Consent documented', color: 'blue' };
}

// ── Yes / No toggle (shared within this file) ─────────────────────────────────

interface YesNoProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}
const YesNo: React.FC<YesNoProps> = ({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) => (
  <div className="flex gap-3">
    {([{ label: yesLabel, v: true }, { label: noLabel, v: false }] as const).map(opt => (
      <button
        key={String(opt.v)}
        type="button"
        onClick={() => onChange(opt.v)}
        className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
          value === opt.v
            ? opt.v
              ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200'
              : 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const ConsentForm: React.FC<FlowsheetFormProps> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline = false,
  onSaved,
  onCancel,
}) => {
  const [form, setForm] = useState<ConsentFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { save, isSaving, error: saveError } = useSaveSystemAssessment(
    patient.id, tenantId, SYSTEM_TYPE,
  );

  const set = useCallback(<K extends keyof ConsentFormData>(key: K, value: ConsentFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }

    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id:      patient.id,
      tenant_id:       tenantId,
      system_type:     SYSTEM_TYPE,
      assessment_data: clinicalFields as Record<string, unknown>,
      nurse_id:        currentUser?.id ?? null,
      nurse_name:      studentName.trim(),
      is_baseline:     isBaseline,
    };

    await save(payload);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* ── Prior consent records this session ── */}
      <AssessmentHistoryStrip
        patientId={patient.id}
        tenantId={tenantId}
        systemType={SYSTEM_TYPE}
        formatSummary={formatConsentSummary}
      />

      {/* ── Simulation note ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
        <strong className="font-semibold text-slate-700">Simulation Note:</strong>{' '}
        This form captures the consent discussion as it would occur in clinical practice.
        Document what you verbally explain to the patient / substitute decision-maker and
        record their response. No physical signature is collected in simulation.
      </div>

      {/* ── Consent type & procedure ── */}
      <FlowsheetFormSection
        title="Consent Type & Procedure"
        description="Identify what the consent covers"
      >
        {/* Consent type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type of consent <span className="text-red-500" aria-hidden>*</span>
          </label>
          <select
            value={form.consentType}
            onChange={e => set('consentType', e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">Select consent type…</option>
            {CONSENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Procedure name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Procedure / treatment name <span className="text-red-500" aria-hidden>*</span>
          </label>
          <input
            type="text"
            value={form.procedureName}
            onChange={e => set('procedureName', e.target.value)}
            placeholder="e.g. Appendectomy, Insertion of central venous catheter"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Brief description of the procedure / treatment
            <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
          </label>
          <textarea
            value={form.procedureDescription}
            onChange={e => set('procedureDescription', e.target.value)}
            rows={2}
            placeholder="Describe the procedure in plain language as you would explain it to the patient…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
      </FlowsheetFormSection>

      {/* ── Disclosure ── */}
      <FlowsheetFormSection
        title="Information Disclosed"
        description="Document the key elements of the consent discussion"
      >
        {/* Risks discussed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Risks and benefits discussed
          </label>
          <textarea
            value={form.risksDiscussed}
            onChange={e => set('risksDiscussed', e.target.value)}
            rows={3}
            placeholder="Summarise the risks, benefits, and expected outcomes discussed with the patient / SDM…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* Alternatives */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Alternatives to the procedure / treatment discussed?
          </legend>
          <YesNo
            value={form.alternativesDiscussed}
            onChange={v => set('alternativesDiscussed', v)}
          />
        </fieldset>

        {/* Questions addressed */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Patient / SDM given opportunity to ask questions and questions addressed?
          </legend>
          <YesNo
            value={form.questionsAddressed}
            onChange={v => set('questionsAddressed', v)}
          />
        </fieldset>
      </FlowsheetFormSection>

      {/* ── Capacity & SDM ── */}
      <FlowsheetFormSection
        title="Decision-Making Capacity"
        description="Capacity is presumed unless there is reason to believe otherwise"
      >
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Does the patient have capacity to provide / refuse consent?
            <span className="text-red-500 ml-1" aria-hidden>*</span>
          </legend>
          <YesNo
            value={form.patientCapable}
            onChange={v => set('patientCapable', v)}
            yesLabel="Yes — patient consents / refuses"
            noLabel="No — substitute decision-maker"
          />
        </fieldset>

        {form.patientCapable === false && (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              Per the <em>Health Care Consent Act (Ontario)</em> and equivalent provincial legislation,
              the highest-ranking available substitute decision-maker must be identified and involved.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                SDM full name <span className="text-red-500" aria-hidden>*</span>
              </label>
              <input
                type="text"
                value={form.sdmName}
                onChange={e => set('sdmName', e.target.value)}
                placeholder="Full name of substitute decision-maker"
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Relationship to patient
              </label>
              <select
                value={form.sdmRelationship}
                onChange={e => set('sdmRelationship', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select relationship…</option>
                {SDM_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        )}
      </FlowsheetFormSection>

      {/* ── Interpreter ── */}
      <FlowsheetFormSection title="Language & Interpreter">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Was an interpreter required for this consent discussion?
            <span className="text-red-500 ml-1" aria-hidden>*</span>
          </legend>
          <YesNo
            value={form.interpreterRequired}
            onChange={v => set('interpreterRequired', v)}
          />
        </fieldset>

        {form.interpreterRequired === true && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Language <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              type="text"
              value={form.interpreterLanguage}
              onChange={e => set('interpreterLanguage', e.target.value)}
              placeholder="e.g. French, Mandarin, Punjabi, ASL"
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </FlowsheetFormSection>

      {/* ── Consent decision ── */}
      <FlowsheetFormSection title="Consent Decision">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Outcome of the consent discussion
            <span className="text-red-500 ml-1" aria-hidden>*</span>
          </legend>
          <div className="flex gap-3">
            {DECISION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('consentDecision', opt.value)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                  form.consentDecision === opt.value
                    ? opt.color === 'green'
                      ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200'
                      : opt.color === 'red'
                        ? 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200'
                        : 'bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {form.consentDecision === 'refused' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
            Document the patient's / SDM's stated reason in the notes field below and
            notify the responsible physician / NP per facility policy.
          </div>
        )}

        {/* Witness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Witness name
            <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
          </label>
          <input
            type="text"
            value={form.witnessName}
            onChange={e => set('witnessName', e.target.value)}
            placeholder="Name of witness to the consent discussion"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </FlowsheetFormSection>

      {/* ── Additional notes ── */}
      <FlowsheetFormSection title="Additional Notes">
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Any additional context, patient concerns, or follow-up actions…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
      </FlowsheetFormSection>

      {/* ── Student name ── */}
      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Student Name <span className="text-red-500 ml-1" aria-hidden>*</span>
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
          By entering your name, you confirm that this consent discussion was conducted and documented by you.
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
            {isSaving ? 'Saving…' : 'Save Consent Record'}
          </button>
        </div>
      </div>

    </form>
  );
};
