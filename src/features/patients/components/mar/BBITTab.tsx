import React, { useState, useEffect } from 'react';
import { Droplets, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../../../contexts/TenantContext';
import { getBBITEntries, addBBITEntry } from '../../../../services/patient/multiTenantPatientService';
import type { BBITEntry, BBITEntryInput } from '../../types/bbitEntry';

interface BBITTabProps {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    patient_id: string;
    tenant_id?: string;
  };
  currentUser?: { id: string; name: string; role: string };
  externalShowForm?: boolean;
  onExternalFormClose?: () => void;
}

// ─── Glucose colour helpers ───────────────────────────────────────────────────
const glucoseRange = (v?: number) => {
  if (v == null) return null;
  if (v < 4.0)  return { label: '< 4.0', badge: 'bg-red-100 text-red-700 border-red-300', trend: '↓↓' };
  if (v <= 7.0) return { label: '4.0–7.0', badge: 'bg-green-100 text-green-700 border-green-300', trend: '→' };
  if (v <= 10.0) return { label: '7.1–10.0', badge: 'bg-yellow-100 text-yellow-700 border-yellow-300', trend: '↑' };
  return { label: '> 10.0', badge: 'bg-red-100 text-red-700 border-red-300', trend: '↑↑' };
};

// ─── Tick chart row definitions ───────────────────────────────────────────────
type RowDef =
  | { type: 'section'; label: string }
  | { type: 'row'; label: string; key: string; render: (e: BBITEntry) => React.ReactNode };

const rows: RowDef[] = [
  { type: 'section', label: 'Blood Glucose' },
  {
    type: 'row', key: 'glucose', label: 'CBG (mmol/L)',
    render: (e) => {
      if (e.glucose_value == null) return <span className="text-gray-300">—</span>;
      const r = glucoseRange(e.glucose_value);
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${r?.badge}`}>
          {e.glucose_value.toFixed(1)} {r?.trend}
        </span>
      );
    },
  },
  { type: 'section', label: 'Basal Insulin (Long-Acting)' },
  {
    type: 'row', key: 'basal_name', label: 'Medication',
    render: (e) => e.basal_name ?? '—',
  },
  {
    type: 'row', key: 'basal_dose', label: 'Dose (units)',
    render: (e) => e.basal_dose != null ? `${e.basal_dose} u` : '—',
  },
  {
    type: 'row', key: 'basal_status', label: 'Status',
    render: (e) => {
      if (!e.basal_status) return '—';
      return e.basal_status === 'given'
        ? <span className="text-green-700 font-semibold">✓ Given</span>
        : <span className="text-red-600 font-semibold">⊘ Held</span>;
    },
  },
  {
    type: 'row', key: 'basal_held', label: '  Held Reason',
    render: (e) => {
      if (e.basal_status !== 'held') return '—';
      return e.basal_held_reason === 'Other'
        ? (e.basal_held_other || 'Other')
        : (e.basal_held_reason ?? '—');
    },
  },
  { type: 'section', label: 'Bolus Insulin (Mealtime)' },
  {
    type: 'row', key: 'bolus_meal', label: 'Meal',
    render: (e) => e.bolus_meal ?? '—',
  },
  {
    type: 'row', key: 'bolus_dose', label: 'Dose (units)',
    render: (e) => e.bolus_dose != null ? `${e.bolus_dose} u` : '—',
  },
  {
    type: 'row', key: 'bolus_status', label: 'Status',
    render: (e) => {
      if (!e.bolus_status) return '—';
      return e.bolus_status === 'given'
        ? <span className="text-green-700 font-semibold">✓ Given</span>
        : <span className="text-red-600 font-semibold">⊘ Not Given</span>;
    },
  },
  {
    type: 'row', key: 'bolus_reason', label: '  Reason',
    render: (e) => e.bolus_status === 'not_given' ? (e.bolus_not_given_reason ?? '—') : '—',
  },
  { type: 'section', label: 'Correction Insulin (Sliding Scale)' },
  {
    type: 'row', key: 'corr_suggested', label: 'Suggested (units)',
    render: (e) => e.correction_suggested_dose != null ? `${e.correction_suggested_dose} u` : '—',
  },
  {
    type: 'row', key: 'corr_dose', label: 'Given (units)',
    render: (e) => e.correction_dose != null ? `${e.correction_dose} u` : '—',
  },
  {
    type: 'row', key: 'corr_status', label: 'Status',
    render: (e) => {
      if (!e.correction_status) return '—';
      return e.correction_status === 'given'
        ? <span className="text-green-700 font-semibold">✓ Given</span>
        : <span className="text-gray-500">Not Required</span>;
    },
  },
  { type: 'section', label: 'Hypoglycemia Management' },
  {
    type: 'row', key: 'hypo_treat', label: 'Treatment',
    render: (e) => {
      const tx: string[] = [];
      if (e.hypo_juice)         tx.push('Juice');
      if (e.hypo_dextrose_tabs) tx.push('D-tabs');
      if (e.hypo_iv_dextrose)   tx.push('IV D50W');
      if (e.hypo_glucagon)      tx.push('Glucagon');
      if (e.hypo_other)         tx.push(e.hypo_other);
      return tx.length ? tx.join(', ') : '—';
    },
  },
  {
    type: 'row', key: 'hypo_recheck', label: '  Recheck Done',
    render: (e) => {
      if (e.hypo_recheck_completed === undefined) return '—';
      return e.hypo_recheck_completed
        ? <span className="text-green-700 font-semibold">✓ Yes</span>
        : <span className="text-red-600">Pending</span>;
    },
  },
  { type: 'section', label: 'Other' },
  {
    type: 'row', key: 'carb', label: 'Carb Intake',
    render: (e) => {
      const map = { full: 'Full Meal', partial: 'Partial', none: 'None' };
      return e.carb_intake ? map[e.carb_intake] : '—';
    },
  },
  {
    type: 'row', key: 'notes', label: 'Notes',
    render: (e) => {
      const notes: string[] = [];
      if (e.note_symptomatic_hypo)       notes.push('Symptomatic Hypo');
      if (e.note_hyperglycemia_symptoms) notes.push('Hyperglycemia Sx');
      if (e.note_insulin_delay)          notes.push('Insulin Delay');
      if (e.note_other)                  notes.push(e.note_other);
      return notes.length ? notes.join(', ') : '—';
    },
  },
];

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = (): BBITEntryInput => ({
  recorded_at: new Date().toISOString().slice(0, 16),
  time_label: '',
  student_name: '',
  glucose_value: undefined,
  basal_name: '',
  basal_dose: undefined,
  basal_status: undefined,
  basal_held_reason: undefined,
  basal_held_other: '',
  bolus_dose: undefined,
  bolus_meal: undefined,
  bolus_status: undefined,
  bolus_not_given_reason: undefined,
  correction_dose: undefined,
  correction_suggested_dose: undefined,
  correction_status: undefined,
  hypo_juice: false,
  hypo_dextrose_tabs: false,
  hypo_iv_dextrose: false,
  hypo_glucagon: false,
  hypo_other: '',
  hypo_recheck_completed: undefined,
  carb_intake: undefined,
  note_symptomatic_hypo: false,
  note_hyperglycemia_symptoms: false,
  note_insulin_delay: false,
  note_other: '',
});

// ─── Component ────────────────────────────────────────────────────────────────
export const BBITTab: React.FC<BBITTabProps> = ({
  patient,
  externalShowForm,
  onExternalFormClose,
}) => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BBITEntryInput>(emptyForm());
  const [colOffset, setColOffset] = useState(0);

  const tenantId = patient.tenant_id || currentTenant?.id || '';
  const VISIBLE_COLS = 5;
  const MIN_COLS = 5;

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['bbit_entries', patient.id, tenantId],
    queryFn: () => getBBITEntries(patient.id, tenantId).then(r => r.data ?? []),
    enabled: !!tenantId && !!patient.id,
    staleTime: 2 * 60 * 1000,
  });

  // ── Sync external form trigger ─────────────────────────────────────────────
  useEffect(() => {
    if (externalShowForm) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(emptyForm());
      setShowForm(true);
    }
  }, [externalShowForm]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate: saveEntry, isPending: isSaving, error: saveError } = useMutation({
    mutationFn: () =>
      addBBITEntry(patient.id, tenantId, form, form.student_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bbit_entries', patient.id, tenantId] });
      setShowForm(false);
      onExternalFormClose?.();
      setForm(emptyForm());
      setTimeout(() => setColOffset(Math.max(0, (entries.length + 1) - VISIBLE_COLS)), 50);
    },
  });

  // ── Column pagination ──────────────────────────────────────────────────────
  const totalCols = entries.length;
  const maxOffset = Math.max(0, totalCols - VISIBLE_COLS);
  const visibleEntries = entries.slice(colOffset, colOffset + VISIBLE_COLS);
  const paddedCols: (BBITEntry | null)[] = [
    ...visibleEntries,
    ...Array(Math.max(0, MIN_COLS - visibleEntries.length)).fill(null),
  ];

  // ── Derived form state ─────────────────────────────────────────────────────
  const isHypo = (form.glucose_value ?? 0) > 0 && form.glucose_value! < 4.0;

  const setField = <K extends keyof BBITEntryInput>(field: K, value: BBITEntryInput[K] | '') =>
    setForm(prev => ({ ...prev, [field]: value === '' ? undefined : value }));

  const formatColHeader = (e: BBITEntry) => {
    const label = e.time_label?.trim();
    if (label) return { primary: label, secondary: new Date(e.recorded_at!).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) };
    const d = new Date(e.recorded_at!);
    return {
      primary: d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
      secondary: d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
    };
  };

  // ── Column styling helpers (matches NeuroAssessmentTab) ───────────────────
  const colHeaderCls = (ci: number, filled: boolean) => {
    if (!filled) return 'bg-gray-50 border-l border-dashed border-gray-300';
    return ci % 2 === 0
      ? 'bg-purple-50 border-l border-purple-200'
      : 'bg-indigo-50/60 border-l border-indigo-200';
  };
  const colCellCls = (ci: number, filled: boolean) => {
    if (!filled) return 'bg-gray-50/40 border-l border-dashed border-gray-200';
    return ci % 2 === 0
      ? 'border-l border-purple-100'
      : 'bg-indigo-50/20 border-l border-indigo-100';
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {totalCols > 0 && (
        <p className="text-sm text-gray-500">
          {totalCols} {totalCols === 1 ? 'entry' : 'entries'} recorded
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full mr-2" />
          Loading BBIT chart…
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center">
          <Droplets className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No BBIT entries recorded</p>
          <p className="text-sm text-gray-500 mt-1">Click "New Entry" to start the flowsheet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {totalCols > VISIBLE_COLS && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
              <button
                onClick={() => setColOffset(o => Math.max(0, o - 1))}
                disabled={colOffset === 0}
                className="flex items-center px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Earlier
              </button>
              <span>Showing {colOffset + 1}–{Math.min(colOffset + VISIBLE_COLS, totalCols)} of {totalCols}</span>
              <button
                onClick={() => setColOffset(o => Math.min(maxOffset, o + 1))}
                disabled={colOffset >= maxOffset}
                className="flex items-center px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Later
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 bg-purple-50 text-left px-4 py-3 font-semibold text-gray-700 w-44 whitespace-nowrap border-r border-gray-200">
                    Parameter
                  </th>
                  {paddedCols.map((e, i) => {
                    const filled = e !== null;
                    const hdrCls = colHeaderCls(i, filled);
                    if (!e) {
                      return (
                        <th key={`empty-${i}`} className={`px-3 py-3 text-center whitespace-nowrap min-w-[120px] ${hdrCls}`}>
                          <div className="text-gray-300 font-semibold text-xs tracking-widest">EMPTY</div>
                          <div className="text-xs text-gray-200 font-normal">—</div>
                        </th>
                      );
                    }
                    const { primary, secondary } = formatColHeader(e);
                    return (
                      <th key={e.id} className={`px-3 py-3 text-center font-medium whitespace-nowrap min-w-[120px] ${hdrCls}`}>
                        <div className="inline-block bg-purple-600 text-white text-sm font-bold px-3 py-0.5 rounded-full mb-1 shadow-sm">
                          {primary}
                        </div>
                        <div className="text-xs font-semibold text-gray-600 tracking-wide">{secondary}</div>
                        {e.student_name && (
                          <div
                            className="mt-1.5 inline-block text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 truncate max-w-[110px] font-medium"
                            title={e.student_name}
                          >
                            {e.student_name}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  if (row.type === 'section') {
                    return (
                      <tr key={`section-${i}`} className="bg-gray-100">
                        <td
                          colSpan={paddedCols.length + 1}
                          className="sticky left-0 bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200"
                        >
                          {row.label}
                        </td>
                      </tr>
                    );
                  }
                  const dataRowIndex = rows.slice(0, i).filter(r => r.type === 'row').length;
                  const isEven = dataRowIndex % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-blue-50/30';
                  return (
                    <tr key={row.key} className={`border-b border-gray-100 ${rowBg}`}>
                      <td className={`sticky left-0 ${rowBg} px-4 py-2 text-gray-700 font-medium border-r border-gray-200 whitespace-nowrap`}>
                        {row.label}
                      </td>
                      {paddedCols.map((e, ci) => {
                        const filled = e !== null;
                        const cellCls = colCellCls(ci, filled);
                        return (
                          <td key={e?.id ?? `empty-${ci}`} className={`px-3 py-2 text-center text-gray-800 ${cellCls}`}>
                            {e ? row.render(e) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-6">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Droplets className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">New BBIT Entry</h3>
              </div>
              <button
                onClick={() => { setShowForm(false); onExternalFormClose?.(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Time + label + student */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={form.recorded_at ?? ''}
                    onChange={e => setField('recorded_at', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 0600, HS, AC"
                    value={form.time_label ?? ''}
                    onChange={e => setField('time_label', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Blood Glucose */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Blood Glucose (CBG)
                </h4>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Glucose Reading (mmol/L)</label>
                    <input
                      type="number"
                      min={0} max={50} step={0.1}
                      placeholder="e.g. 7.2"
                      value={form.glucose_value ?? ''}
                      onChange={e => setField('glucose_value', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {form.glucose_value != null && (() => {
                    const r = glucoseRange(form.glucose_value);
                    return r ? (
                      <span className={`px-3 py-2 rounded-lg text-sm font-semibold border ${r.badge}`}>
                        {r.label} {r.trend}
                      </span>
                    ) : null;
                  })()}
                </div>
                {/* Quick-select presets */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    { label: '< 4.0', val: 3.5, cls: 'border-red-300 text-red-700 hover:bg-red-50' },
                    { label: '4.0–7.0', val: 5.5, cls: 'border-green-300 text-green-700 hover:bg-green-50' },
                    { label: '7.1–10.0', val: 8.5, cls: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' },
                    { label: '> 10.0', val: 11.0, cls: 'border-red-300 text-red-700 hover:bg-red-50' },
                  ].map(({ label, val, cls }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setField('glucose_value', val)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${cls}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Hypo warning */}
                {isHypo && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">
                      Hypoglycemia detected — complete the Hypoglycemia Management section below.
                    </p>
                  </div>
                )}
              </section>

              {/* Basal Insulin */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Basal Insulin (Long-Acting)
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Medication Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Glargine (Lantus)"
                      value={form.basal_name ?? ''}
                      onChange={e => setField('basal_name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Dose (units)</label>
                    <input
                      type="number"
                      min={0} step={1}
                      placeholder="0"
                      value={form.basal_dose ?? ''}
                      onChange={e => setField('basal_dose', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mb-2">
                  {(['given', 'held'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setField('basal_status', form.basal_status === s ? undefined : s)}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors capitalize ${
                        form.basal_status === s
                          ? s === 'given'
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {s === 'given' ? '✓ Given' : '⊘ Held'}
                    </button>
                  ))}
                </div>
                {form.basal_status === 'held' && (
                  <div className="mt-2">
                    <label className="block text-sm text-gray-600 mb-1">Held Reason</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(['Low BG', 'NPO', 'Provider order', 'Other'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setField('basal_held_reason', form.basal_held_reason === r ? undefined : r)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            form.basal_held_reason === r
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-gray-300 text-gray-700 hover:border-purple-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {form.basal_held_reason === 'Other' && (
                      <input
                        type="text"
                        placeholder="Specify reason…"
                        value={form.basal_held_other ?? ''}
                        onChange={e => setField('basal_held_other', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    )}
                  </div>
                )}
              </section>

              {/* Bolus Insulin */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Bolus Insulin (Mealtime)
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Meal</label>
                    <div className="flex gap-2">
                      {(['Breakfast', 'Lunch', 'Supper'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setField('bolus_meal', form.bolus_meal === m ? undefined : m)}
                          className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                            form.bolus_meal === m
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-gray-300 text-gray-700 hover:border-purple-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Dose (units)</label>
                    <input
                      type="number"
                      min={0} step={1}
                      placeholder="0"
                      value={form.bolus_dose ?? ''}
                      onChange={e => setField('bolus_dose', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mb-2">
                  {(['given', 'not_given'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setField('bolus_status', form.bolus_status === s ? undefined : s)}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.bolus_status === s
                          ? s === 'given'
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {s === 'given' ? '✓ Given' : '⊘ Not Given'}
                    </button>
                  ))}
                </div>
                {form.bolus_status === 'not_given' && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(['Patient not eating', 'NPO', 'Refused'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setField('bolus_not_given_reason', form.bolus_not_given_reason === r ? undefined : r)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          form.bolus_not_given_reason === r
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-purple-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Correction Insulin */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Correction Insulin (Sliding Scale)
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Suggested Dose (units)</label>
                    <input
                      type="number"
                      min={0} step={1}
                      placeholder="Protocol dose"
                      value={form.correction_suggested_dose ?? ''}
                      onChange={e => setField('correction_suggested_dose', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Dose Given (units)</label>
                    <input
                      type="number"
                      min={0} step={1}
                      placeholder="Actual dose"
                      value={form.correction_dose ?? ''}
                      onChange={e => setField('correction_dose', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  {(['given', 'not_required'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setField('correction_status', form.correction_status === s ? undefined : s)}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.correction_status === s
                          ? s === 'given'
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-gray-500 border-gray-500 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {s === 'given' ? '✓ Given' : 'Not Required'}
                    </button>
                  ))}
                </div>
              </section>

              {/* Hypoglycemia Management */}
              <section className={isHypo ? 'border border-red-300 rounded-lg p-4 bg-red-50' : ''}>
                <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isHypo ? 'text-red-700' : 'text-gray-700'}`}>
                  {isHypo && <AlertTriangle className="h-4 w-4 inline mr-1 text-red-600" />}
                  Hypoglycemia Management
                </h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {([
                    ['hypo_juice', 'Juice Given'],
                    ['hypo_dextrose_tabs', 'Dextrose Tabs'],
                    ['hypo_iv_dextrose', 'IV Dextrose (D50W)'],
                    ['hypo_glucagon', 'Glucagon'],
                  ] as const).map(([field, label]) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setField(field, !form[field])}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                        form[field]
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-red-400'
                      }`}
                    >
                      <span className="text-base">{form[field] ? '☑' : '☐'}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">Other Treatment</label>
                  <input
                    type="text"
                    placeholder="Describe…"
                    value={form.hypo_other ?? ''}
                    onChange={e => setField('hypo_other', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setField('hypo_recheck_completed', form.hypo_recheck_completed === true ? undefined : true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border font-medium transition-colors ${
                    form.hypo_recheck_completed
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
                >
                  {form.hypo_recheck_completed ? '✓ Recheck BGM Completed' : '☐ Recheck BGM in 15 min'}
                </button>
                {isHypo && !form.hypo_recheck_completed && (
                  <p className="text-xs text-red-600 mt-1">
                    Recheck BGM required after hypoglycemia treatment.
                  </p>
                )}
              </section>

              {/* Carb Intake */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Carb Intake
                </h4>
                <div className="flex gap-3">
                  {([
                    ['full', 'Full Meal'],
                    ['partial', 'Partial'],
                    ['none', 'None'],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setField('carb_intake', form.carb_intake === val ? undefined : val)}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.carb_intake === val
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Quick Notes */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Quick Notes
                </h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {([
                    ['note_symptomatic_hypo', 'Symptomatic Hypo'],
                    ['note_hyperglycemia_symptoms', 'Hyperglycemia Symptoms'],
                    ['note_insulin_delay', 'Insulin Delay'],
                  ] as const).map(([field, label]) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setField(field, !form[field])}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form[field]
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      {form[field] ? '☑' : '☐'} {label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Other note…"
                  value={form.note_other ?? ''}
                  onChange={e => setField('note_other', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </section>

              {/* Student Name Verification */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-yellow-900 mb-2">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={form.student_name ?? ''}
                  onChange={e => setField('student_name', e.target.value)}
                  className="w-full border border-yellow-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
                <p className="mt-2 text-xs text-yellow-700">
                  By entering your name, you verify you documented this BBIT entry.
                </p>
              </div>

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Failed to save entry. Please try again.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowForm(false); onExternalFormClose?.(); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!form.student_name?.trim()) {
                    alert('Please enter your student name before submitting.');
                    return;
                  }
                  saveEntry();
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors flex items-center"
              >
                {isSaving && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                )}
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
