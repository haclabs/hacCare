import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { VitalSigns } from '../../patients/types/patient';
import { buildVitalsGlance, type VitalsGlanceRow } from '../vitalsGlance';

const Sparkline: React.FC<{ series: number[][]; alert: boolean }> = ({ series, alert }) => {
  const all = series.flat();
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const W = 120;
  const H = 36;
  const toPoints = (values: number[]) =>
    values
      .map((v, i) => {
        const x = values.length === 1 ? W : (i / (values.length - 1)) * W;
        const y = H - 2 - ((v - min) / span) * (H - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-9 flex-col justify-between text-[10px] leading-none text-gray-500 dark:text-gray-400">
        <span>{max}</span>
        <span>{min}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-28 overflow-visible" aria-hidden="true">
        {series.map((values, i) => (
          <polyline
            key={i}
            points={toPoints(values)}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            className={i === 0 && alert ? 'stroke-red-600' : 'stroke-gray-700 dark:stroke-gray-300'}
          />
        ))}
      </svg>
    </div>
  );
};

const ROW_STYLE: Record<VitalsGlanceRow['status'], { row: string; label: string; value: string }> = {
  normal: { row: 'bg-white dark:bg-gray-800', label: 'text-gray-700 dark:text-gray-200', value: 'text-gray-900 dark:text-white' },
  abnormal: { row: 'bg-amber-50 dark:bg-amber-900/20', label: 'text-amber-700 dark:text-amber-300', value: 'text-amber-800 dark:text-amber-200' },
  critical: { row: 'bg-red-50 dark:bg-red-900/20', label: 'text-red-700 dark:text-red-300', value: 'text-red-700 dark:text-red-300' },
};

/** Rover-style glance: one row per vital with its recent trend and latest value, abnormal rows tinted. */
export const EchoVitalsGlance: React.FC<{ vitals: VitalSigns[]; dateOfBirth?: string }> = ({ vitals, dateOfBirth }) => {
  const rows = buildVitalsGlance(vitals, dateOfBirth);
  if (!rows.length) return null;
  const lastTime = vitals[0]?.recorded_at ?? vitals[0]?.lastUpdated;

  return (
    <section className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md">
      <header className="flex items-baseline justify-between bg-gray-100 dark:bg-gray-700 px-4 py-2.5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Latest vitals</h2>
        {lastTime && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(lastTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </header>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {rows.map((row) => {
          const style = ROW_STYLE[row.status];
          return (
            <li key={row.key} className={`flex items-center gap-3 px-4 py-3 ${style.row}`}>
              <span className={`w-14 shrink-0 text-base font-medium ${style.label}`}>{row.label}</span>
              <Sparkline series={row.series} alert={row.status !== 'normal'} />
              <span className={`ml-auto flex items-center gap-1.5 text-2xl sm:text-3xl font-semibold tabular-nums ${style.value}`}>
                {row.status !== 'normal' && <AlertCircle className="h-5 w-5" aria-label={row.status} />}
                {row.latest}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
