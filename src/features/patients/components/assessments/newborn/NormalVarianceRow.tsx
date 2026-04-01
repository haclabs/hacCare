import React from 'react';

interface NormalVarianceRowProps {
  label: string;
  normalOptions: string[];
  varianceOptions: string[];
  selectedNormal: string[];
  selectedVariance: string[];
  onNormalChange: (selected: string[]) => void;
  onVarianceChange: (selected: string[]) => void;
  normalOther?: string;
  varianceOther?: string;
  onNormalOtherChange?: (value: string) => void;
  onVarianceOtherChange?: (value: string) => void;
  showNormalOther?: boolean;
  showVarianceOther?: boolean;
}

function toggleItem(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

export const NormalVarianceRow: React.FC<NormalVarianceRowProps> = ({
  label,
  normalOptions,
  varianceOptions,
  selectedNormal,
  selectedVariance,
  onNormalChange,
  onVarianceChange,
  normalOther,
  varianceOther,
  onNormalOtherChange,
  onVarianceOtherChange,
  showNormalOther = false,
  showVarianceOther = false,
}) => {
  return (
    <tr className="border-b border-gray-100 last:border-0 even:bg-gray-50/60">
      {/* Row label */}
      <td className="py-2 pr-3 text-sm font-medium text-gray-700 align-top w-32 whitespace-nowrap">
        {label}
      </td>

      {/* Normal pill buttons */}
      <td className="py-2 pr-4 align-top">
        <div className="flex flex-wrap gap-1.5">
          {normalOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => onNormalChange(toggleItem(selectedNormal, option))}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                selectedNormal.includes(option)
                  ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                  : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-700'
              }`}
            >
              {option}{selectedNormal.includes(option) && ' ✓'}
            </button>
          ))}
          {showNormalOther && onNormalOtherChange && (
            <div className="flex items-center gap-1.5 mt-1 w-full">
              <span className="text-xs text-gray-500">Other:</span>
              <input
                type="text"
                value={normalOther ?? ''}
                onChange={e => onNormalOtherChange(e.target.value)}
                className="flex-1 text-xs border-b border-gray-300 focus:border-green-500 outline-none bg-transparent"
                placeholder="specify"
              />
            </div>
          )}
        </div>
      </td>

      {/* Variance pill buttons */}
      <td className="py-2 align-top">
        <div className="flex flex-wrap gap-1.5">
          {varianceOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => onVarianceChange(toggleItem(selectedVariance, option))}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                selectedVariance.includes(option)
                  ? 'bg-amber-100 border-amber-500 text-amber-800 font-semibold'
                  : 'border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-700'
              }`}
            >
              {option}{selectedVariance.includes(option) && ' ✓'}
            </button>
          ))}
          {showVarianceOther && onVarianceOtherChange && (
            <div className="flex items-center gap-1.5 mt-1 w-full">
              <span className="text-xs text-gray-500">Other:</span>
              <input
                type="text"
                value={varianceOther ?? ''}
                onChange={e => onVarianceOtherChange(e.target.value)}
                className="flex-1 text-xs border-b border-gray-300 focus:border-amber-400 outline-none bg-transparent"
                placeholder="specify"
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
