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
    <div className="col-span-2 bg-white rounded-xl border border-orange-200 p-4">
      <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wider mb-2">Sliding Scale</label>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="font-semibold pb-1">Glucose (mmol/L)</th>
            <th className="font-semibold pb-1">Dose</th>
          </tr>
        </thead>
        <tbody>
          {scale.map((row, i) => (
            <tr
              key={i}
              className={i === matched ? 'bg-orange-100 font-bold text-orange-900' : 'text-slate-700'}
            >
              <td className="py-1 px-2 rounded-l">{i === matched ? '▶ ' : ''}{formatScaleRange(row)}</td>
              <td className="py-1 px-2 rounded-r">{formatScaleResult(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {glucose !== null && matched === -1 && (
        <p className="text-xs text-red-600 mt-2">No row covers {glucose.toFixed(1)} mmol/L — check the doctor's orders.</p>
      )}
      {glucose === null && (
        <p className="text-xs text-blue-500 mt-2">💡 Enter the blood glucose to see which row applies.</p>
      )}
    </div>
  );
};
