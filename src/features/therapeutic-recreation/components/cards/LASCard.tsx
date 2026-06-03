import React, { useState } from 'react';
import { FileText, Plus, Loader2, Save } from 'lucide-react';
import {
  useTreatmentPlan,
  useAddTreatmentPlanRow,
  useDeleteTreatmentPlanRow,
  useUpdateTreatmentPlanRow,
} from '../../hooks/useTreatmentPlan';
import { TreatmentPlanRowEditor } from '../shared/TreatmentPlanRowEditor';
import type { Patient } from '../../../../types';
import type { TRTreatmentPlanRow, TreatmentPlanDraft, TRCurrentUser } from '../../types';

interface Props {
  patient: Patient;
  tenantId: string;
  currentUser: TRCurrentUser;
  isBaseline: boolean;
}

type PlanRowInput = Omit<TRTreatmentPlanRow, 'id' | 'created_at' | 'updated_at'>;
type EditableField = 'target_area' | 'goal' | 'objective_1' | 'objective_2' | 'objective_3' | 'intervention' | 'plan_date';

function emptyRow(patient: Patient, tenantId: string, isBaseline: boolean, user: TRCurrentUser, sortOrder: number): PlanRowInput {
  return {
    patient_id: patient.id,
    tenant_id: tenantId,
    is_baseline: isBaseline,
    sort_order: sortOrder,
    target_area: null,
    goal: null,
    objective_1: null,
    objective_2: null,
    objective_3: null,
    intervention: null,
    clinician_signature: null,
    plan_date: null,
    recorded_by: user.name,
  };
}

export const LASCard: React.FC<Props> = ({ patient, tenantId, currentUser, isBaseline }) => {
  const { data: rows = [], isLoading } = useTreatmentPlan(patient.id, tenantId);
  const { add, isAdding } = useAddTreatmentPlanRow(patient.id, tenantId);
  const { remove } = useDeleteTreatmentPlanRow(patient.id, tenantId);
  const { update } = useUpdateTreatmentPlanRow(patient.id, tenantId);

  const [draftRows, setDraftRows] = useState<PlanRowInput[]>([]);
  const [studentName, setStudentName] = useState('');

  const addDraft = () => {
    setDraftRows((prev) => [
      ...prev,
      emptyRow(patient, tenantId, isBaseline, { ...currentUser, name: studentName.trim() || currentUser.name }, rows.length + prev.length),
    ]);
  };

  const updateDraft = (idx: number, field: EditableField, value: string) => {
    setDraftRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value || null };
      return copy;
    });
  };

  const removeDraft = (idx: number) => {
    setDraftRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveDraft = async (idx: number) => {
    await add(draftRows[idx]);
    setDraftRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExisting = (id: string, updates: Partial<TreatmentPlanDraft>) => {
    update({ id, updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Student name — required for debrief report */}
      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Student Name <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="e.g. Jane Smith"
          autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none"
        />
        <p className="text-xs text-gray-500">
          By entering your name, you confirm you developed this treatment plan.
        </p>
      </div>

      {/* Add Goal button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addDraft}
          className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      {/* Empty state */}
      {rows.length === 0 && draftRows.length === 0 && (
        <div className="py-10 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <FileText className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No treatment plan goals yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click "Add Goal" to begin building the treatment plan
          </p>
        </div>
      )}

      {/* Saved rows (summary view) */}
      {rows.map((row, rowIdx) => (
        <div key={row.id} className="border border-gray-200 rounded-xl p-4 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Goal #{rowIdx + 1}{row.target_area ? ` — ${row.target_area}` : ''}
            </span>
            <button
              type="button"
              onClick={() => remove(row.id)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
          {row.goal && (
            <div>
              <p className="text-xs text-gray-500">Long-Term Goal</p>
              <p className="text-sm text-gray-800">{row.goal}</p>
            </div>
          )}
          {(row.objective_1 || row.objective_2 || row.objective_3) && (
            <div>
              <p className="text-xs text-gray-500">Objectives</p>
              <ul className="list-disc list-inside space-y-0.5">
                {[row.objective_1, row.objective_2, row.objective_3].filter(Boolean).map((o, i) => (
                  <li key={i} className="text-sm text-gray-800">{o}</li>
                ))}
              </ul>
            </div>
          )}
          {row.intervention && (
            <div>
              <p className="text-xs text-gray-500">Intervention</p>
              <p className="text-sm text-gray-800">{row.intervention}</p>
            </div>
          )}
          {row.plan_date && (
            <p className="text-xs text-gray-400">
              Plan date: {new Date(row.plan_date).toLocaleDateString()}
            </p>
          )}
          {/* Quick update goal text */}
          <details className="pt-1">
            <summary className="text-xs text-emerald-600 cursor-pointer hover:text-emerald-700 select-none">
              Edit this goal
            </summary>
            <div className="mt-3 space-y-2">
              {(['target_area', 'goal', 'objective_1', 'objective_2', 'objective_3', 'intervention'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </label>
                  <input
                    type="text"
                    defaultValue={row[f] ?? ''}
                    onBlur={(e) =>
                      handleUpdateExisting(row.id, { [f]: e.target.value || null } as Partial<TreatmentPlanDraft>)
                    }
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ))}
            </div>
          </details>
        </div>
      ))}

      {/* Draft rows */}
      {draftRows.map((row, idx) => (
        <div key={idx} className="space-y-3">
          <TreatmentPlanRowEditor
            row={row}
            index={rows.length + idx}
            onChange={(field, value) => updateDraft(idx, field, value)}
            onRemove={() => removeDraft(idx)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => saveDraft(idx)}
              disabled={isAdding}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Goal
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

