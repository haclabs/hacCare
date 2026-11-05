import React from 'react';
import { findScaleRowIndex, formatScaleRange, formatScaleResult, type SlidingScaleRow } from '../../utils/slidingScale';

interface SlidingScaleTableProps {
  scale: SlidingScaleRow[];
  glucose: number | null;
}

/** Read-only scale for the BCMA screen; highlights the row for the entered glucose. */
export const SlidingScaleTable: React.FC<SlidingScaleTableProps> = ({ scale, glucose }) => {
  const matched = glucose === null ? -1 : findScaleRowIndex(scale, glucose);

  return (
    <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
      <label className="block text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider mb-2">Sliding Scale</label>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="font-semibold pb-1">Glucose (mmol/L)</th>
            <th className="font-semibold pb-1">Dose</th>
          </tr>
        </thead>
        <tbody>
          {scale.map((row, i) => (
            <tr
              key={i}
              className={i === matched ? 'bg-orange-100 dark:bg-orange-900/40 font-bold text-orange-900 dark:text-orange-100' : 'text-slate-700 dark:text-slate-300'}
            >
              <td className="py-1 px-2 rounded-l">{i === matched ? '▶ ' : ''}{formatScaleRange(row)}</td>
              <td className="py-1 px-2 rounded-r">{formatScaleResult(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {glucose !== null && matched === -1 && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">No row covers {glucose.toFixed(1)} mmol/L — check the doctor's orders.</p>
      )}
      {glucose === null && (
        <p className="text-xs text-blue-500 mt-2">💡 Enter the blood glucose to see which row applies.</p>
      )}
    </div>
  );
};
