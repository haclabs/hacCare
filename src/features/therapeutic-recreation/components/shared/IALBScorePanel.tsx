import React from 'react';
import type { SubscaleConfig } from '../../types';

interface IALBScorePanelProps {
  toolId: string;
  toolLabel: string;
  subscales: SubscaleConfig[];
  scores: Record<string, string>;
  interpretation: string;
  dateAdministered: string;
  onChange: (
    scores: Record<string, string>,
    interpretation: string,
    date: string,
  ) => void;
  isTemplateOnly?: boolean;
}

export const IALBScorePanel: React.FC<IALBScorePanelProps> = ({
  toolId,
  toolLabel,
  subscales,
  scores,
  interpretation,
  dateAdministered,
  onChange,
  isTemplateOnly = false,
}) => {
  const handleScore = (key: string, value: string) => {
    onChange({ ...scores, [key]: value }, interpretation, dateAdministered);
  };

  const handleInterp = (value: string) => {
    onChange(scores, value, dateAdministered);
  };

  const handleDate = (value: string) => {
    onChange(scores, interpretation, value);
  };

  if (isTemplateOnly) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 opacity-70">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-600">{toolLabel}</h4>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            Template — not used for this case
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {subscales.map((s) => (
            <div key={s.key}>
              <label className="block text-xs text-gray-500 mb-1">{s.label}</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-400 bg-white cursor-not-allowed"
                placeholder="—"
                disabled
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-semibold text-gray-800 flex-1">{toolLabel}</h4>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date Administered</label>
          <input
            type="date"
            value={dateAdministered}
            onChange={(e) => handleDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {subscales.map((s) => (
          <div key={`${toolId}-${s.key}`}>
            <label
              htmlFor={`${toolId}-${s.key}`}
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              {s.label}
            </label>
            <input
              id={`${toolId}-${s.key}`}
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={scores[s.key] ?? ''}
              onChange={(e) => handleScore(s.key, e.target.value)}
              placeholder="0.0"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        ))}
      </div>

      <div>
        <label
          htmlFor={`${toolId}-interp`}
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          Clinical Interpretation
        </label>
        <textarea
          id={`${toolId}-interp`}
          rows={3}
          value={interpretation}
          onChange={(e) => handleInterp(e.target.value)}
          placeholder="Describe what these scores mean clinically for this client…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
};
