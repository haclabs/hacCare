/**
 * AdmissionChartPanel
 *
 * Shows the patient's admission record (set up by the instructor) as read-only
 * context at the top of the Admission Assessment flowsheet. Staff roles can
 * correct the key fields in place; students only ever see it read-only.
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Pencil } from 'lucide-react';
import {
  fetchAdmissionRecord,
  saveAdmissionRecordFields,
  type EditableAdmissionFields,
} from '../../../services/patient/admissionService';
import { queryKeys } from '../../../lib/api/queryClient';
import { TextField } from './FormControls';
import type { Patient } from '../../../types';

const STAFF_ROLES = ['instructor', 'admin', 'coordinator', 'super_admin'];

const FIELDS: { key: keyof EditableAdmissionFields; label: string; rows?: number }[] = [
  { key: 'admission_type', label: 'Admission type' },
  { key: 'attending_physician', label: 'Attending physician' },
  { key: 'chief_complaint', label: 'Chief complaint', rows: 2 },
  { key: 'medical_history', label: 'Medical history', rows: 3 },
  { key: 'surgical_history', label: 'Surgical history', rows: 2 },
  { key: 'current_living_arrangements', label: 'Living arrangements', rows: 2 },
];

const EMPTY: EditableAdmissionFields = {
  admission_type: '', attending_physician: '', chief_complaint: '',
  medical_history: '', surgical_history: '', current_living_arrangements: '',
};

interface AdmissionChartPanelProps {
  patient: Patient;
  tenantId: string;
  userRole?: string;
}

export const AdmissionChartPanel: React.FC<AdmissionChartPanelProps> = ({ patient, tenantId, userRole }) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admissionRecord(patient.id, tenantId);
  const { data: record, isSuccess } = useQuery({
    queryKey,
    queryFn: () => fetchAdmissionRecord(patient.id),
    enabled: !!patient.id && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const [draft, setDraft] = useState<EditableAdmissionFields | null>(null);
  const mutation = useMutation({
    mutationFn: (fields: Partial<EditableAdmissionFields>) =>
      saveAdmissionRecordFields(patient.id, patient.tenant_id ?? tenantId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDraft(null);
    },
  });

  // Editing waits for the record to load, so a draft never starts blank over real data.
  const canEdit = STAFF_ROLES.includes(userRole ?? '') && isSuccess;

  const startEditing = () => {
    mutation.reset();
    setDraft(Object.fromEntries(FIELDS.map(f => [f.key, record?.[f.key] ?? ''])) as EditableAdmissionFields);
  };

  const saveChanges = () => {
    if (!draft) return;
    const changed = Object.fromEntries(
      FIELDS.filter(f => (draft[f.key] ?? '') !== (record?.[f.key] ?? '')).map(f => [f.key, draft[f.key]])
    ) as Partial<EditableAdmissionFields>;
    if (Object.keys(changed).length === 0) { setDraft(null); return; }
    mutation.mutate(changed);
  };

  if (draft) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-4">
        <h3 className="text-sm font-semibold text-blue-900">Edit admission record (chart)</h3>
        <p className="text-xs text-blue-800">
          Changes the patient's chart, not this assessment. Fields not shown here are left as they are.
        </p>
        {FIELDS.map(f => (
          <TextField key={f.key} label={f.label} rows={f.rows} value={draft[f.key] ?? ''}
            onChange={v => setDraft(prev => ({ ...(prev ?? EMPTY), [f.key]: v }))} />
        ))}
        <div className="flex items-center justify-end gap-3">
          {mutation.isError && <span role="alert" className="text-sm text-red-600 mr-auto">Save failed. Please try again.</span>}
          <button type="button" onClick={() => setDraft(null)} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={saveChanges} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-haccare-teal hover:bg-haccare-teal-dark text-sm font-medium text-white disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Save chart record'}
          </button>
        </div>
      </div>
    );
  }

  const rows: [string, string | undefined][] = [
    ...FIELDS.map(f => [f.label, record?.[f.key]] as [string, string | undefined]),
    ['Allergies on chart', patient.allergies?.length ? patient.allergies.join(', ') : 'None recorded'],
  ];
  const visible = rows.filter(([, v]) => v && v.trim());

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900 flex-1">From the chart (read-only)</h3>
        {canEdit && (
          <button type="button" onClick={startEditing}
            className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900">
            <Pencil className="h-3.5 w-3.5" /> Edit chart record
          </button>
        )}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {visible.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-blue-700">{label}</dt>
            <dd className="text-sm text-gray-900 whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
