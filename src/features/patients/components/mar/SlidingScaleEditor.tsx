import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { emptyDraftRow, type SlidingScaleDraftRow, type SlidingScaleAction } from '../../utils/slidingScale';

interface SlidingScaleEditorProps {
  rows: SlidingScaleDraftRow[];
  onChange: (rows: SlidingScaleDraftRow[]) => void;
}

const inputCls = 'w-full px-2 py-1.5 text-sm border border-orange-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-400';

/** Instructor editor for a diabetic medication's correction scale, shown on the BCMA screen. */
export const SlidingScaleEditor: React.FC<SlidingScaleEditorProps> = ({ rows, onChange }) => {
  const update = (index: number, patch: Partial<SlidingScaleDraftRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-orange-900">🩸 Sliding Scale (Optional)</label>
      <p className="text-xs text-orange-800 mt-1 mb-3">
        Shown to students on the BCMA screen. The row matching their glucose reading is highlighted.
        Leave "from" or "to" blank for an open-ended row (e.g. 18.1 or higher → Call MD).
      </p>

      {rows.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-[1fr_1fr_1.3fr_0.9fr_auto] gap-2 text-xs font-semibold text-orange-900">
            <span>From (mmol/L)</span>
            <span>To (mmol/L)</span>
            <span>Then</span>
            <span>Units</span>
            <span className="w-7" />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.3fr_0.9fr_auto] gap-2 items-center">
              <input
                type="number" step="0.1" min="0" inputMode="decimal" aria-label={`Row ${i + 1} from`}
                value={row.min} onChange={(e) => update(i, { min: e.target.value })} className={inputCls}
              />
              <input
                type="number" step="0.1" min="0" inputMode="decimal" aria-label={`Row ${i + 1} to`}
                value={row.max} onChange={(e) => update(i, { max: e.target.value })} className={inputCls}
              />
              <select
                aria-label={`Row ${i + 1} action`} value={row.action}
                onChange={(e) => update(i, { action: e.target.value as SlidingScaleAction })} className={inputCls}
              >
                <option value="units">Give units</option>
                <option value="call_md">Call MD</option>
                <option value="hold">Hold</option>
              </select>
              <input
                type="number" step="0.5" min="0" inputMode="decimal" aria-label={`Row ${i + 1} units`}
                value={row.action === 'units' ? row.units : ''} disabled={row.action !== 'units'}
                onChange={(e) => update(i, { units: e.target.value })}
                className={`${inputCls} disabled:bg-orange-100 disabled:text-orange-300`}
              />
              <button
                type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button" onClick={() => onChange([...rows, emptyDraftRow()])}
        className="inline-flex items-center gap-1 text-sm font-medium text-orange-800 hover:text-orange-900"
      >
        <Plus className="h-4 w-4" /> Add row
      </button>
    </div>
  );
};
