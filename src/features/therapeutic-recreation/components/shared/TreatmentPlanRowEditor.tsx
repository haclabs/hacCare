import React from 'react';
import { Trash2 } from 'lucide-react';
import type { TRTreatmentPlanRow } from '../../types';

type EditableField = 'target_area' | 'goal' | 'objective_1' | 'objective_2' | 'objective_3' | 'intervention' | 'plan_date';

interface TreatmentPlanRowProps {
  row: Partial<TRTreatmentPlanRow>;
  index: number;
  onChange: (field: EditableField, value: string) => void;
  onRemove: () => void;
}

export const TreatmentPlanRowEditor: React.FC<TreatmentPlanRowProps> = ({
  row,
  index,
  onChange,
  onRemove,
}) => (
  <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white relative">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Goal #{index + 1}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
        aria-label="Remove goal"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>

    {/* Target area */}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Target Area / Domain</label>
      <input
        type="text"
        value={row.target_area ?? ''}
        onChange={(e) => onChange('target_area', e.target.value)}
        placeholder="e.g. Social participation, Physical mobility…"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>

    {/* Long-term goal */}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Long-Term Goal</label>
      <input
        type="text"
        value={row.goal ?? ''}
        onChange={(e) => onChange('goal', e.target.value)}
        placeholder="Client will…"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>

    {/* Objectives */}
    {(['objective_1', 'objective_2', 'objective_3'] as const).map((key, i) => (
      <div key={key}>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Short-Term Objective {i + 1}
        </label>
        <input
          type="text"
          value={row[key] ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={i === 0 ? 'By [date], client will…' : 'Optional additional objective…'}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
    ))}

    {/* Intervention */}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">TR Intervention</label>
      <input
        type="text"
        value={row.intervention ?? ''}
        onChange={(e) => onChange('intervention', e.target.value)}
        placeholder="Describe planned TR intervention…"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>

    {/* Plan date */}
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Plan Date</label>
      <input
        type="date"
        value={row.plan_date ?? ''}
        onChange={(e) => onChange('plan_date', e.target.value)}
        className="w-full sm:w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>
  </div>
);
