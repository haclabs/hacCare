/**
 * BPMHForm
 *
 * Best Possible Medication History — native flowsheet form implementing
 * FlowsheetFormProps.  Used during medication reconciliation on admission.
 *
 * Key design decisions:
 *   - Dynamic medication rows: start with one, "Add medication" appends another.
 *   - Each row captures: generic name, brand name, dosage + unit, route,
 *     formulation, frequency, and the source the entry was verified against.
 *   - Top-level fields: history source(s), allergy confirmation, discrepancy notes.
 *   - No external form library — same inline validation pattern as all other forms.
 *   - AssessmentHistoryStrip shows previous BPMH entries for the session.
 */

import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

// ── Local types ───────────────────────────────────────────────────────────────

interface MedicationRow {
  id: string;                // local key — never sent to DB
  genericName: string;
  brandName: string;
  dosage: string;
  unit: string;
  route: string;
  formulation: string;
  frequency: string;
  frequencyOther: string;    // free-text when frequency === 'other'
  verificationSource: string;
}

interface BPMHFormData {
  studentName: string;
  medications: MedicationRow[];
  historySources: string[];
  allergiesConfirmed: boolean | null;
  discrepancyNotes: string;
  notes: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_TYPE = 'bpmh' as const;

const DOSE_UNITS = ['mg', 'mcg', 'g', 'units', '%', 'mL', 'mmol', 'mEq', 'IU'];

const ROUTES = [
  'Oral (PO)',
  'Sublingual (SL)',
  'Buccal',
  'Transdermal patch',
  'Topical',
  'Inhalation (inhaler)',
  'Nebulised',
  'Intranasal',
  'Eye drops (ophthalmic)',
  'Ear drops (otic)',
  'Intravenous (IV)',
  'Intramuscular (IM)',
  'Subcutaneous (SC)',
  'Rectal (PR)',
  'Vaginal',
  'Other',
];

const FORMULATIONS = [
  'Immediate-release (IR)',
  'Extended-release (XR / ER)',
  'Enteric-coated (EC)',
  'Modified-release (MR)',
  'Controlled-release (CR)',
  'Solution / liquid',
  'Suspension',
  'Patch',
  'Cream / ointment / gel',
  'Suppository',
  'N/A',
];

const FREQUENCIES = [
  { value: 'once-daily',    label: 'Once daily (OD)' },
  { value: 'twice-daily',   label: 'Twice daily (BID)' },
  { value: 'three-daily',   label: 'Three times daily (TID)' },
  { value: 'four-daily',    label: 'Four times daily (QID)' },
  { value: 'every-6h',      label: 'Every 6 hours (Q6H)' },
  { value: 'every-8h',      label: 'Every 8 hours (Q8H)' },
  { value: 'every-12h',     label: 'Every 12 hours (Q12H)' },
  { value: 'weekly',        label: 'Weekly' },
  { value: 'biweekly',      label: 'Every 2 weeks' },
  { value: 'monthly',       label: 'Monthly' },
  { value: 'prn',           label: 'As needed (PRN)' },
  { value: 'at-bedtime',    label: 'At bedtime (HS)' },
  { value: 'with-meals',    label: 'With meals' },
  { value: 'other',         label: 'Other (specify)' },
];

const HISTORY_SOURCES = [
  'Pharmacy profile / dispensing record',
  'Patient / family report',
  'Medication bottles / containers',
  'Blister pack (Dosette)',
  'Previous hospital records',
  'Family physician / specialist office',
  'Long-term care facility records',
  'Pharmacist interview',
  'Other',
];

const VERIFICATION_SOURCES = [
  'Pharmacy profile',
  'Patient report',
  'Medication bottle',
  'Blister pack',
  'Previous records',
  'Family / caregiver',
  'Other',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function newRow(): MedicationRow {
  return {
    id:                 crypto.randomUUID(),
    genericName:        '',
    brandName:          '',
    dosage:             '',
    unit:               'mg',
    route:              '',
    formulation:        '',
    frequency:          '',
    frequencyOther:     '',
    verificationSource: '',
  };
}

function validate(form: BPMHFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (form.historySources.length === 0)
    return 'Select at least one source of medication history.';
  if (form.allergiesConfirmed === null)
    return 'Confirm whether allergies have been verified with the patient / SDM.';
  for (const [i, med] of form.medications.entries()) {
    const n = i + 1;
    if (!med.genericName.trim()) return `Row ${n}: Generic drug name is required.`;
    if (!med.dosage.trim())      return `Row ${n}: Dosage is required.`;
    if (!med.route)              return `Row ${n}: Route is required.`;
    if (!med.frequency)          return `Row ${n}: Frequency is required.`;
    if (med.frequency === 'other' && !med.frequencyOther.trim())
      return `Row ${n}: Specify the frequency.`;
  }
  return null;
}

function formatBPMHSummary(data: Record<string, unknown>): AssessmentSummary {
  const meds = data.medications as MedicationRow[] | undefined;
  const count = meds?.length ?? 0;
  return {
    label: `${count} medication${count !== 1 ? 's' : ''} reconciled`,
    color: count === 0 ? 'amber' : 'blue',
  };
}

// ── Medication row sub-component ──────────────────────────────────────────────

interface MedRowProps {
  row: MedicationRow;
  index: number;
  canDelete: boolean;
  onChange: (id: string, field: keyof MedicationRow, value: string) => void;
  onDelete: (id: string) => void;
}

const MedRow: React.FC<MedRowProps> = ({ row, index, canDelete, onChange, onDelete }) => {
  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';
  const selectCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/40 overflow-hidden">
      {/* Row header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Medication {index + 1}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(row.id)}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            aria-label={`Remove medication ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Generic name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Generic name <span className="text-red-500" aria-hidden>*</span>
          </label>
          <input
            type="text"
            value={row.genericName}
            onChange={e => onChange(row.id, 'genericName', e.target.value)}
            placeholder="e.g. metformin"
            autoComplete="off"
            className={inputCls}
          />
        </div>

        {/* Brand name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Brand name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={row.brandName}
            onChange={e => onChange(row.id, 'brandName', e.target.value)}
            placeholder="e.g. Glucophage"
            autoComplete="off"
            className={inputCls}
          />
        </div>

        {/* Dosage + unit */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Dosage & strength <span className="text-red-500" aria-hidden>*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={row.dosage}
              onChange={e => onChange(row.id, 'dosage', e.target.value)}
              placeholder="e.g. 500"
              autoComplete="off"
              className={`${inputCls} flex-1`}
            />
            <select
              value={row.unit}
              onChange={e => onChange(row.id, 'unit', e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {DOSE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Route */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Route <span className="text-red-500" aria-hidden>*</span>
          </label>
          <select
            value={row.route}
            onChange={e => onChange(row.id, 'route', e.target.value)}
            className={selectCls}
          >
            <option value="">Select route…</option>
            {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Formulation */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Formulation
          </label>
          <select
            value={row.formulation}
            onChange={e => onChange(row.id, 'formulation', e.target.value)}
            className={selectCls}
          >
            <option value="">Select formulation…</option>
            {FORMULATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Frequency */}
        <div className={row.frequency === 'other' ? '' : ''}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Frequency <span className="text-red-500" aria-hidden>*</span>
          </label>
          <select
            value={row.frequency}
            onChange={e => onChange(row.id, 'frequency', e.target.value)}
            className={selectCls}
          >
            <option value="">Select frequency…</option>
            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Free-text frequency */}
        {row.frequency === 'other' && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Specify frequency <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              type="text"
              value={row.frequencyOther}
              onChange={e => onChange(row.id, 'frequencyOther', e.target.value)}
              placeholder="e.g. every 3 days, alternate days…"
              autoComplete="off"
              className={inputCls}
            />
          </div>
        )}

        {/* Verification source */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Verified against
          </label>
          <select
            value={row.verificationSource}
            onChange={e => onChange(row.id, 'verificationSource', e.target.value)}
            className={selectCls}
          >
            <option value="">Select source…</option>
            {VERIFICATION_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const BPMHForm: React.FC<FlowsheetFormProps> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline = false,
  onSaved,
  onCancel,
}) => {
  const [form, setForm] = useState<BPMHFormData>({
    studentName:        '',
    medications:        [newRow()],
    historySources:     [],
    allergiesConfirmed: null,
    discrepancyNotes:   '',
    notes:              '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const { save, isSaving, error: saveError } = useSaveSystemAssessment(
    patient.id, tenantId, SYSTEM_TYPE,
  );

  // ── Top-level field setters ──────────────────────────────────────────────

  const set = useCallback(<K extends keyof BPMHFormData>(key: K, value: BPMHFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const toggleSource = useCallback((source: string) => {
    setForm(prev => ({
      ...prev,
      historySources: prev.historySources.includes(source)
        ? prev.historySources.filter(s => s !== source)
        : [...prev.historySources, source],
    }));
    setValidationError(null);
  }, []);

  // ── Medication row handlers ──────────────────────────────────────────────

  const addRow = useCallback(() => {
    setForm(prev => ({ ...prev, medications: [...prev.medications, newRow()] }));
  }, []);

  const deleteRow = useCallback((id: string) => {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.filter(r => r.id !== id),
    }));
    setValidationError(null);
  }, []);

  const updateRow = useCallback((id: string, field: keyof MedicationRow, value: string) => {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
    setValidationError(null);
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }

    const { studentName, ...clinicalFields } = form;
    // Strip local-only `id` fields from each medication row before persisting
    const sanitisedMeds = clinicalFields.medications.map(({ id: _id, ...rest }) => rest);

    const payload: SaveSystemAssessmentInput = {
      patient_id:      patient.id,
      tenant_id:       tenantId,
      system_type:     SYSTEM_TYPE,
      assessment_data: { ...clinicalFields, medications: sanitisedMeds } as Record<string, unknown>,
      nurse_id:        currentUser?.id ?? null,
      nurse_name:      studentName.trim(),
      is_baseline:     isBaseline,
    };

    await save(payload);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* ── Prior BPMH entries this session ── */}
      <AssessmentHistoryStrip
        patientId={patient.id}
        tenantId={tenantId}
        systemType={SYSTEM_TYPE}
        formatSummary={formatBPMHSummary}
      />

      {/* ── History sources ── */}
      <FlowsheetFormSection
        title="Sources of Medication History"
        description="Select all sources consulted to compile this medication history"
      >
        <fieldset>
          <legend className="sr-only">Sources of medication history</legend>
          <div className="flex flex-wrap gap-2">
            {HISTORY_SOURCES.map(source => (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  form.historySources.includes(source)
                    ? 'bg-blue-100 border-blue-400 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </fieldset>
      </FlowsheetFormSection>

      {/* ── Allergy confirmation ── */}
      <FlowsheetFormSection title="Allergy Verification">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Have the patient's known allergies and adverse drug reactions been verified / confirmed
            with the patient or substitute decision-maker?
            <span className="text-red-500 ml-1" aria-hidden>*</span>
          </legend>
          <div className="flex gap-3">
            {([{ label: 'Yes — confirmed', v: true }, { label: 'No — not confirmed', v: false }] as const).map(opt => (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => set('allergiesConfirmed', opt.v)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                  form.allergiesConfirmed === opt.v
                    ? opt.v
                      ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200'
                      : 'bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </FlowsheetFormSection>

      {/* ── Medication list ── */}
      <FlowsheetFormSection
        title="Medication List"
        description="Record all medications the patient takes at home, including OTC drugs, vitamins, and herbal supplements"
      >
        <div className="space-y-3">
          {form.medications.map((row, idx) => (
            <MedRow
              key={row.id}
              row={row}
              index={idx}
              canDelete={form.medications.length > 1}
              onChange={updateRow}
              onDelete={deleteRow}
            />
          ))}
        </div>

        {/* Add row button */}
        <button
          type="button"
          onClick={addRow}
          className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add medication
        </button>
      </FlowsheetFormSection>

      {/* ── Discrepancies / concerns ── */}
      <FlowsheetFormSection
        title="Discrepancies & Concerns"
        description="Document any discrepancies between sources, unclear instructions, or high-risk medications requiring follow-up"
      >
        <textarea
          value={form.discrepancyNotes}
          onChange={e => set('discrepancyNotes', e.target.value)}
          rows={3}
          placeholder="e.g. Patient unsure of dose for lisinopril — pharmacy profile lists 10 mg OD but patient states 5 mg. Flagged for physician review."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
      </FlowsheetFormSection>

      {/* ── Additional notes ── */}
      <FlowsheetFormSection title="Additional Notes">
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
          placeholder="Any additional observations or follow-up items…"
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
          By entering your name, you confirm that you conducted this medication reconciliation interview and recorded these findings.
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
            {isSaving ? 'Saving…' : 'Save BPMH'}
          </button>
        </div>
      </div>

    </form>
  );
};
