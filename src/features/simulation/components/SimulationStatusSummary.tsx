import React from 'react';
import { Play, AlertTriangle, RotateCcw, Clock3, Activity } from 'lucide-react';
import type { SimulationActiveWithDetails } from '../types/simulation';

export type StatusQuickFilter = 'all' | 'running' | 'needs-completing' | 'needs-reset' | 'ready';

interface SimulationStatusSummaryProps {
  simulations: SimulationActiveWithDetails[];
  activeFilter: StatusQuickFilter;
  onFilterChange: (filter: StatusQuickFilter) => void;
}

/**
 * At-a-glance status dashboard shown next to the category filter box —
 * lets an instructor spot at a glance which simulations are running,
 * which have timed out and need completing, and which are done and
 * need resetting for the next group. Rows are clickable quick filters.
 */
export const SimulationStatusSummary: React.FC<SimulationStatusSummaryProps> = ({
  simulations,
  activeFilter,
  onFilterChange,
}) => {
  const runningCount = simulations.filter(s => s.status === 'running' && !s.is_expired).length;
  const needsCompletingCount = simulations.filter(
    s => (s.status === 'running' || s.status === 'paused') && s.is_expired
  ).length;
  const needsResetCount = simulations.filter(s => s.status === 'completed').length;
  const readyCount = simulations.filter(s => s.status === 'pending').length;

  const rows: {
    key: StatusQuickFilter;
    label: string;
    sublabel: string;
    count: number;
    icon: typeof Play;
    gradient: string;
    iconBg: string;
    pulse?: boolean;
  }[] = [
    {
      key: 'running',
      label: 'Running',
      sublabel: 'In progress',
      count: runningCount,
      icon: Play,
      gradient: 'from-green-50 to-emerald-50 border-green-200',
      iconBg: 'bg-green-500',
      pulse: true,
    },
    {
      key: 'needs-completing',
      label: 'Needs Completing',
      sublabel: "Time's up, not completed",
      count: needsCompletingCount,
      icon: AlertTriangle,
      gradient: 'from-amber-50 to-orange-50 border-amber-200',
      iconBg: 'bg-amber-500',
    },
    {
      key: 'needs-reset',
      label: 'Needs Reset',
      sublabel: 'Ready for next group',
      count: needsResetCount,
      icon: RotateCcw,
      gradient: 'from-red-50 to-rose-50 border-red-200',
      iconBg: 'bg-red-500',
    },
    {
      key: 'ready',
      label: 'Ready to Start',
      sublabel: 'Not yet launched',
      count: readyCount,
      icon: Clock3,
      gradient: 'from-blue-50 to-sky-50 border-blue-200',
      iconBg: 'bg-blue-500',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-3.5 w-3.5 text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-700">Simulation Status</h3>
        {activeFilter !== 'all' && (
          <button
            onClick={() => onFilterChange('all')}
            className="ml-auto text-xs text-blue-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-2">
        {rows.map(row => {
          const Icon = row.icon;
          const isActive = activeFilter === row.key;
          const disabled = row.count === 0;
          return (
            <button
              key={row.key}
              onClick={() => !disabled && onFilterChange(isActive ? 'all' : row.key)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border bg-gradient-to-r ${row.gradient} transition-all text-left ${
                isActive ? 'ring-2 ring-blue-500 ring-offset-1' : ''
              } ${disabled ? 'opacity-40 cursor-default' : 'hover:shadow-md hover:-translate-y-0.5'}`}
            >
              <div className={`relative w-8 h-8 rounded-full ${row.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className="h-4 w-4 text-white" />
                {row.pulse && row.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800">{row.label}</div>
                <div className="text-[10px] text-gray-500">{row.sublabel}</div>
              </div>
              <div className="text-xl font-bold text-gray-900 tabular-nums">{row.count}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
