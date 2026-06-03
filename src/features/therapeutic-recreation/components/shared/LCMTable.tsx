import React from 'react';
import type { LCMComponentData } from '../../types';

const LCM_SCALE = [
  { score: 7, label: 'Complete Independence' },
  { score: 6, label: 'Modified Independence' },
  { score: 5, label: 'Modified Dependence' },
  { score: 4, label: 'Modified Dependence with Minimal Assistance' },
  { score: 3, label: 'Modified Dependence with Moderate Assistance' },
  { score: 2, label: 'Modified Dependence with Maximal Assistance' },
  { score: 1, label: 'Total Dependence with Total Assistance' },
];

function scoreToLevel(score: number): string {
  return LCM_SCALE.find((s) => s.score === score)?.label ?? `Level ${score}`;
}

function scoreBg(score: number): string {
  if (score >= 6) return 'bg-green-100 text-green-800';
  if (score >= 4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

interface LCMTableProps {
  components: LCMComponentData[];
  totalScore: number;
  totalPossible?: number;
  dateAdministered?: string;
  showDescriptions?: boolean;
}

export const LCMTable: React.FC<LCMTableProps> = ({
  components,
  totalScore,
  totalPossible = 56,
  dateAdministered,
  showDescriptions = true,
}) => {
  const overallLevel = scoreToLevel(Math.round(totalScore / components.length));

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Total Score</span>
          <p className="text-xl font-bold text-gray-900">
            {totalScore}/{totalPossible}
          </p>
        </div>
        <div className="flex-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Overall Level</span>
          <p className="text-sm font-medium text-gray-700">{overallLevel}</p>
        </div>
        {dateAdministered && (
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Date</span>
            <p className="text-sm text-gray-700">{dateAdministered}</p>
          </div>
        )}
      </div>

      {/* Component table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-40">Component</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-20">Score /7</th>
              {showDescriptions && (
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Clinical Description</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {components.map((c) => (
              <tr key={c.name} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800 align-top">{c.name}</td>
                <td className="px-4 py-3 text-center align-top">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${scoreBg(c.score)}`}>
                    {c.score}
                  </span>
                </td>
                {showDescriptions && (
                  <td className="px-4 py-3 text-gray-600 text-sm leading-relaxed align-top">
                    {c.description || <span className="italic text-gray-400">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scale reference */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700 select-none">
          LCM Scale Reference (1–7)
        </summary>
        <ul className="mt-2 space-y-1 pl-3">
          {LCM_SCALE.map((s) => (
            <li key={s.score}>
              <span className="font-medium">{s.score}</span> — {s.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 italic text-gray-400">
          Source: Kloseck, M. &amp; Crilly, R. G. (1997). Leisure competence measure: Adult version.
          London, ON: Leisure Competence Measure Data System.
        </p>
      </details>
    </div>
  );
};
