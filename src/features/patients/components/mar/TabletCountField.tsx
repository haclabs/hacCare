import React from 'react';
import { formatTotalDose, isValidTabletCount, parseTabletStrength } from '../../utils/tabletDose';

interface TabletCountFieldProps {
  dosage: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TabletCountField: React.FC<TabletCountFieldProps> = ({ dosage, value, onChange, className = '' }) => {
  const strength = parseTabletStrength(dosage);
  const count = parseFloat(value);
  const valid = isValidTabletCount(count);
  const total = formatTotalDose(count, strength);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 ${className}`}>
      <label htmlFor="bcma-tablet-count" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Number of Tablets Given <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-slate-400 mb-2">Each tablet: <span className="font-semibold text-slate-600">{dosage}</span></p>
      <div className="flex items-center gap-2">
        <input
          id="bcma-tablet-count"
          type="number"
          min="0.5" max="10" step="0.5"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-24 px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            valid ? 'border-green-400 bg-green-50 focus:ring-green-400'
              : value ? 'border-red-400 bg-red-50 focus:ring-red-400'
              : 'border-orange-300 bg-orange-50 focus:ring-orange-400'
          }`}
          placeholder="e.g. 2"
        />
        <span className="text-sm font-semibold text-slate-500 shrink-0">{count === 1 ? 'tablet' : 'tablets'}</span>
        {total && (
          <span className="ml-auto text-sm text-slate-600">
            Total dose: <span className="font-bold text-blue-700">{total}</span>
          </span>
        )}
      </div>
      {value && !valid ? (
        <p className="text-xs text-red-500 mt-1.5">Enter whole or half tablets (0.5 – 10)</p>
      ) : (
        <p className="text-xs text-blue-500 mt-1.5">💡 Tip: Check doctor's orders and calculate how many tablets make up the dose</p>
      )}
    </div>
  );
};
