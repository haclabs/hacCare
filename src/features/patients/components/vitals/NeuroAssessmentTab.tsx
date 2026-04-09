import React, { useState, useEffect } from 'react';
import { Brain, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../../../contexts/TenantContext';
import { getNeuroAssessments, addNeuroAssessment } from '../../../../services/patient/multiTenantPatientService';
import type { NeuroAssessment, NeuroAssessmentInput } from '../../types/neuroAssessment';

interface NeuroAssessmentTabProps {
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
  assessmentCount?: (count: number) => void;
}

// ─── GCS option labels ────────────────────────────────────────────────────────
const GCS_EYE: Record<number, string> = {
  4: '4 – Spontaneous',
  3: '3 – To sound',
  2: '2 – To pain',
  1: '1 – None',
};
const GCS_VERBAL: Record<number, string> = {
  5: '5 – Oriented',
  4: '4 – Confused',
  3: '3 – Words',
  2: '2 – Sounds',
  1: '1 – None',
};
const GCS_MOTOR: Record<number, string> = {
  6: '6 – Obeys commands',
  5: '5 – Localizing',
  4: '4 – Normal flexion',
  3: '3 – Abnormal flexion',
  2: '2 – Extension',
  1: '1 – None',
};

// ─── Tick chart row definitions ───────────────────────────────────────────────
type RowDef =
  | { type: 'section'; label: string }
  | { type: 'row'; label: string; render: (a: NeuroAssessment) => React.ReactNode; key: string };

const rows: RowDef[] = [
  { type: 'section', label: 'Consciousness' },
  {
    type: 'row', key: 'loc', label: 'LOC (AVPU)',
    render: (a) => a.level_of_consciousness ?? '—',
  },
  { type: 'section', label: 'Orientation' },
  {
    type: 'row', key: 'orientation', label: 'Oriented A×',
    render: (a) => {
      const count = [a.oriented_person, a.oriented_place, a.oriented_time]
        .filter(Boolean).length;
      const total = [a.oriented_person, a.oriented_place, a.oriented_time]
        .filter(v => v !== undefined).length;
      if (total === 0) return '—';
      return `A×${count}`;
    },
  },
  {
    type: 'row', key: 'o_person', label: '  Person',
    render: (a) => a.oriented_person === undefined ? '—' : a.oriented_person ? '✓' : '✗',
  },
  {
    type: 'row', key: 'o_place', label: '  Place',
    render: (a) => a.oriented_place === undefined ? '—' : a.oriented_place ? '✓' : '✗',
  },
  {
    type: 'row', key: 'o_time', label: '  Time',
    render: (a) => a.oriented_time === undefined ? '—' : a.oriented_time ? '✓' : '✗',
  },
  { type: 'section', label: 'Glasgow Coma Scale' },
  {
    type: 'row', key: 'gcs_total', label: 'GCS Total',
    render: (a) => {
      const e = a.gcs_eye, v = a.gcs_verbal, m = a.gcs_motor;
      if (e == null && v == null && m == null) return '—';
      const total = (e ?? 0) + (v ?? 0) + (m ?? 0);
      return `${total}/15`;
    },
  },
  {
    type: 'row', key: 'gcs_eye', label: '  Eyes',
    render: (a) => a.gcs_eye != null ? String(a.gcs_eye) : '—',
  },
  {
    type: 'row', key: 'gcs_verbal', label: '  Verbal',
    render: (a) => a.gcs_verbal != null ? String(a.gcs_verbal) : '—',
  },
  {
    type: 'row', key: 'gcs_motor', label: '  Motor',
    render: (a) => a.gcs_motor != null ? String(a.gcs_motor) : '—',
  },
  { type: 'section', label: 'Pupils' },
  {
    type: 'row', key: 'pupils_equal', label: 'Equal',
    render: (a) => a.pupils_equal === undefined ? '—' : a.pupils_equal ? 'Yes' : 'No',
  },
  {
    type: 'row', key: 'pupil_l', label: '  Left Size',
    render: (a) => a.pupil_left_size != null ? `${a.pupil_left_size} mm` : '—',
  },
  {
    type: 'row', key: 'pupil_l_rxn', label: '  Left Reaction',
    render: (a) => a.pupil_left_reaction ?? '—',
  },
  {
    type: 'row', key: 'pupil_r', label: '  Right Size',
    render: (a) => a.pupil_right_size != null ? `${a.pupil_right_size} mm` : '—',
  },
  {
    type: 'row', key: 'pupil_r_rxn', label: '  Right Reaction',
    render: (a) => a.pupil_right_reaction ?? '—',
  },
  { type: 'section', label: 'Limb Strength (MRC)' },
  {
    type: 'row', key: 'stra', label: '  Right Arm',
    render: (a) => a.strength_right_arm != null ? `${a.strength_right_arm}/5` : '—',
  },
  {
    type: 'row', key: 'stla', label: '  Left Arm',
    render: (a) => a.strength_left_arm != null ? `${a.strength_left_arm}/5` : '—',
  },
  {
    type: 'row', key: 'strl', label: '  Right Leg',
    render: (a) => a.strength_right_leg != null ? `${a.strength_right_leg}/5` : '—',
  },
  {
    type: 'row', key: 'stll', label: '  Left Leg',
    render: (a) => a.strength_left_leg != null ? `${a.strength_left_leg}/5` : '—',
  },
  { type: 'section', label: 'Other' },
  {
    type: 'row', key: 'sensation', label: 'Sensation',
    render: (a) => a.sensation ?? '—',
  },
  {
    type: 'row', key: 'speech', label: 'Speech',
    render: (a) => a.speech ?? '—',
  },
  {
    type: 'row', key: 'pain', label: 'Pain Score',
    render: (a) => a.pain_score != null ? `${a.pain_score}/10` : '—',
  },
];

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = (): NeuroAssessmentInput => ({
  recorded_at: new Date().toISOString().slice(0, 16),
  level_of_consciousness: undefined,
  oriented_person: undefined,
  oriented_place: undefined,
  oriented_time: undefined,
  gcs_eye: undefined,
  gcs_verbal: undefined,
  gcs_motor: undefined,
  pupils_equal: undefined,
  pupil_left_size: undefined,
  pupil_left_reaction: undefined,
  pupil_right_size: undefined,
  pupil_right_reaction: undefined,
  strength_right_arm: undefined,
  strength_left_arm: undefined,
  strength_right_leg: undefined,
  strength_left_leg: undefined,
  sensation: undefined,
  speech: undefined,
  pain_score: undefined,
  student_name: '',
});

// ─── Component ────────────────────────────────────────────────────────────────
export const NeuroAssessmentTab: React.FC<NeuroAssessmentTabProps> = ({
  patient,
  currentUser,
  externalShowForm,
  onExternalFormClose,
}) => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NeuroAssessmentInput & { student_name?: string }>(emptyForm);
  const [colOffset, setColOffset] = useState(0);

  const tenantId = patient.tenant_id || currentTenant?.id || '';
  const VISIBLE_COLS = 5;
  const MIN_COLS = 5;

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['neuro_assessments', patient.id, tenantId],
    queryFn: () => getNeuroAssessments(patient.id, tenantId).then(r => r.data ?? []),
    enabled: !!tenantId && !!patient.id,
    staleTime: 2 * 60 * 1000,
  });

  // ── Sync external form trigger ──────────────────────────────────────────────
  useEffect(() => {
    if (externalShowForm) {
      setForm(emptyForm());
      setShowForm(true);
    }
  }, [externalShowForm]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate: saveAssessment, isPending: isSaving, error: saveError } = useMutation({
    mutationFn: () =>
      addNeuroAssessment(patient.id, tenantId, form, form.student_name || currentUser?.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neuro_assessments', patient.id, tenantId] });
      setShowForm(false);
      onExternalFormClose?.();
      setForm(emptyForm());
      // Scroll to last column after save
      setTimeout(() => setColOffset(Math.max(0, (assessments.length + 1) - VISIBLE_COLS)), 50);
    },
  });

  // ── Column pagination ──────────────────────────────────────────────────────
  const totalCols = assessments.length;
  const maxOffset = Math.max(0, totalCols - VISIBLE_COLS);
  const visibleAssessments = assessments.slice(colOffset, colOffset + VISIBLE_COLS);
  // Pad with nulls so we always show MIN_COLS columns
  const paddedCols: (NeuroAssessment | null)[] = [
    ...visibleAssessments,
    ...Array(Math.max(0, MIN_COLS - visibleAssessments.length)).fill(null),
  ];

  // ── GCS auto-calc ──────────────────────────────────────────────────────────
  const gcsTotal = (form.gcs_eye ?? 0) + (form.gcs_verbal ?? 0) + (form.gcs_motor ?? 0);
  const hasGcs = form.gcs_eye != null || form.gcs_verbal != null || form.gcs_motor != null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setField = (field: keyof typeof form, value: any) =>
    setForm(prev => ({ ...prev, [field]: value === '' ? undefined : value }));

  const formatColTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  };

  // ── Column & row styling helpers ──────────────────────────────────────────
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
      {/* Entry count subtitle */}
      {totalCols > 0 && (
        <p className="text-sm text-gray-500">
          {totalCols} {totalCols === 1 ? 'entry' : 'entries'} recorded
        </p>
      )}

      {/* Tick chart */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full mr-2" />
          Loading assessments…
        </div>
      ) : assessments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center">
          <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No neuro assessments recorded</p>
          <p className="text-sm text-gray-500 mt-1">
            Click "New Assessment" to start the tick chart.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Column navigation */}
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
                  <th className="sticky left-0 bg-purple-50 text-left px-4 py-3 font-semibold text-gray-700 w-40 whitespace-nowrap border-r border-gray-200">
                    Parameter
                  </th>
                  {paddedCols.map((a, i) => {
                    const filled = a !== null;
                    const hdrCls = colHeaderCls(i, filled);
                    if (!a) {
                      return (
                        <th key={`empty-${i}`} className={`px-3 py-3 text-center whitespace-nowrap min-w-[110px] ${hdrCls}`}>
                          <div className="text-gray-300 font-semibold text-xs tracking-widest">EMPTY</div>
                          <div className="text-xs text-gray-200 font-normal">—</div>
                        </th>
                      );
                    }
                    const { date, time } = formatColTime(a.recorded_at!);
                    return (
                      <th key={a.id} className={`px-3 py-3 text-center font-medium whitespace-nowrap min-w-[110px] ${hdrCls}`}>
                        <div className="inline-block bg-purple-600 text-white text-sm font-bold px-3 py-0.5 rounded-full mb-1 shadow-sm">
                          {time}
                        </div>
                        <div className="text-xs font-semibold text-gray-600 tracking-wide">{date}</div>
                        {a.student_name && (
                          <div
                            className="mt-1.5 inline-block text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 truncate max-w-[110px] font-medium"
                            title={a.student_name}
                          >
                            {a.student_name}
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
                  // Count only data rows (not sections) for alternating index
                  const dataRowIndex = rows
                    .slice(0, i)
                    .filter(r => r.type === 'row').length;
                  const isEven = dataRowIndex % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-blue-50/30';
                  return (
                    <tr key={row.key} className={`border-b border-gray-100 ${rowBg}`}>
                      <td className={`sticky left-0 ${rowBg} px-4 py-2 text-gray-700 font-medium border-r border-gray-200 whitespace-nowrap`}>
                        {row.label}
                      </td>
                      {paddedCols.map((a, ci) => {
                        const filled = a !== null;
                        const cellCls = colCellCls(ci, filled);
                        return (
                          <td key={a?.id ?? `empty-${ci}`} className={`px-3 py-2 text-center text-gray-800 ${cellCls}`}>
                            {a ? row.render(a) : <span className="text-gray-300">—</span>}
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

      {/* Assessment entry modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-6">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">New Neuro Assessment</h3>
              </div>
              <button
                onClick={() => { setShowForm(false); onExternalFormClose?.(); }}
                className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Date/time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={form.recorded_at as string ?? ''}
                  onChange={e => setField('recorded_at', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Consciousness */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Consciousness &amp; Orientation
                </h4>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">Level of Consciousness (AVPU)</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Alert', 'Voice', 'Pain', 'Unresponsive'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setField('level_of_consciousness', form.level_of_consciousness === v ? undefined : v)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          form.level_of_consciousness === v
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-purple-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Orientation</label>
                  <div className="flex gap-3 flex-wrap">
                    {(['person', 'place', 'time'] as const).map(o => {
                      const key = `oriented_${o}` as keyof NeuroAssessmentInput;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => {
                            const cur = form[key] as boolean | undefined;
                            setField(key, cur === true ? false : cur === false ? undefined : true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors capitalize ${
                            form[key] === true
                              ? 'bg-green-100 border-green-400 text-green-800'
                              : form[key] === false
                              ? 'bg-red-100 border-red-400 text-red-800'
                              : 'border-gray-300 text-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {o}
                          {form[key] === true && ' ✓'}
                          {form[key] === false && ' ✗'}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Tap once = ✓ oriented, twice = ✗ not oriented, three times = unrecorded</p>
                </div>
              </section>

              {/* GCS */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Glasgow Coma Scale
                  </h4>
                  {hasGcs && (
                    <span className={`text-sm font-bold px-3 py-0.5 rounded-full ${
                      gcsTotal >= 13 ? 'bg-green-100 text-green-800' :
                      gcsTotal >= 9  ? 'bg-yellow-100 text-yellow-800' :
                                       'bg-red-100 text-red-800'
                    }`}>
                      Total: {gcsTotal}/15
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Eyes (E)', field: 'gcs_eye', opts: GCS_EYE },
                    { label: 'Verbal (V)', field: 'gcs_verbal', opts: GCS_VERBAL },
                    { label: 'Motor (M)', field: 'gcs_motor', opts: GCS_MOTOR },
                  ] as const).map(({ label, field, opts }) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-600 mb-1">{label}</label>
                      <select
                        value={form[field] ?? ''}
                        onChange={e => setField(field, e.target.value === '' ? undefined : Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">—</option>
                        {Object.entries(opts).sort((a, b) => Number(b[0]) - Number(a[0])).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pupils */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Pupils</h4>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm text-gray-600">Equal</label>
                  <div className="flex gap-2">
                    {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setField('pupils_equal', form.pupils_equal === val ? undefined : val)}
                        className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                          form.pupils_equal === val
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-purple-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(['left', 'right'] as const).map(side => (
                    <div key={side} className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 capitalize">{side} Pupil</p>
                      <div>
                        <label className="text-xs text-gray-500">Size (mm)</label>
                        <input
                          type="number"
                          min={1} max={9} step={0.5}
                          placeholder="1–9"
                          value={form[`pupil_${side}_size` as keyof NeuroAssessmentInput] as number ?? ''}
                          onChange={e => setField(
                            `pupil_${side}_size` as keyof NeuroAssessmentInput,
                            e.target.value === '' ? undefined : parseFloat(e.target.value)
                          )}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-0.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reaction</label>
                        <select
                          value={form[`pupil_${side}_reaction` as keyof NeuroAssessmentInput] as string ?? ''}
                          onChange={e => setField(`pupil_${side}_reaction` as keyof NeuroAssessmentInput, e.target.value || undefined)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">—</option>
                          {['Brisk', 'Sluggish', 'Fixed', 'Absent'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Limb Strength */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Limb Strength (MRC 0–5)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Right Arm', 'strength_right_arm'],
                    ['Left Arm', 'strength_left_arm'],
                    ['Right Leg', 'strength_right_leg'],
                    ['Left Leg', 'strength_left_leg'],
                  ] as const).map(([label, field]) => (
                    <div key={field}>
                      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setField(field, form[field] === n ? undefined : n)}
                            className={`flex-1 py-1.5 text-sm rounded border transition-colors ${
                              form[field] === n
                                ? 'bg-purple-600 border-purple-600 text-white font-bold'
                                : 'border-gray-300 text-gray-600 hover:border-purple-400'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Other */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Other</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Sensation</label>
                    <select
                      value={form.sensation ?? ''}
                      onChange={e => setField('sensation', e.target.value || undefined)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">—</option>
                      {['Normal', 'Reduced', 'Absent', 'Abnormal'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Speech</label>
                    <select
                      value={form.speech ?? ''}
                      onChange={e => setField('speech', e.target.value || undefined)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">—</option>
                      {['Clear', 'Slurred', 'Confused', 'Aphasia', 'None'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-sm text-gray-600 mb-1 block">
                    Pain Score: <span className="font-semibold text-gray-900">{form.pain_score ?? '—'}/10</span>
                  </label>
                  <input
                    type="range"
                    min={0} max={10} step={1}
                    value={form.pain_score ?? ''}
                    onChange={e => setField('pain_score', e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0 No pain</span>
                    <span>5 Moderate</span>
                    <span>10 Worst</span>
                  </div>
                </div>
              </section>

              {/* Student Name - required verification */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-yellow-900 mb-2">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.student_name ?? ''}
                  onChange={e => setField('student_name', e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="e.g. Jane Smith"
                />
                <p className="text-xs text-yellow-700 mt-2">
                  By entering your name, you verify that all information above is correct and you recorded this assessment.
                </p>
              </div>

              {/* Error */}
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Failed to save assessment. Please try again.
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowForm(false); onExternalFormClose?.(); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveAssessment()}
                disabled={isSaving || !form.student_name?.trim()}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors flex items-center"
              >
                {isSaving && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                )}
                Save Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
