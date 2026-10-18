import React from 'react';
import { Timer } from 'lucide-react';
import { getOrderReleaseStatus, formatReleaseDelay, MAX_RELEASE_AFTER_MINUTES } from '../utils/orderRelease';

const formatClock = (d: Date) =>
  d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });

interface ReleaseDelayFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Instructor-only: hold an order back from students until N minutes after the simulation starts. */
export const ReleaseDelayField: React.FC<ReleaseDelayFieldProps> = ({ value, onChange }) => (
  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
    <label htmlFor="order-release-after" className="flex items-center gap-1.5 text-sm font-medium text-purple-900 mb-1">
      <Timer className="h-4 w-4" />
      Show to students after (minutes into simulation)
    </label>
    <div className="flex items-center gap-3">
      <input
        id="order-release-after"
        type="number"
        min={0}
        max={MAX_RELEASE_AFTER_MINUTES}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-28 px-3 py-2 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      />
      <p className="text-xs text-purple-800">
        Leave blank or 0 to show immediately. The countdown starts when the simulation is launched,
        and restarts when you press Play after a reset. Instructors and admins always see the order.
      </p>
    </div>
  </div>
);

interface ReleaseDelayBadgeProps {
  releaseAfterMinutes: number | null | undefined;
  simulationStartsAt: string | null | undefined;
}

/** Staff-facing: tells the instructor when (or whether) students can see this order. */
export const ReleaseDelayBadge: React.FC<ReleaseDelayBadgeProps> = ({ releaseAfterMinutes, simulationStartsAt }) => {
  const status = getOrderReleaseStatus(releaseAfterMinutes, simulationStartsAt);
  if (status.kind === 'immediate') return null;

  const delay = `${formatReleaseDelay(status.minutes)} delay`;
  const { label, cls, title } =
    status.kind === 'held'
      ? {
          label: `${delay} · hidden until ${formatClock(status.releaseAt)}`,
          cls: 'bg-purple-100 text-purple-800 border-purple-300',
          title: 'Students cannot see this order yet. Only staff see this badge.',
        }
      : status.kind === 'released'
      ? {
          label: `${delay} · released ${formatClock(status.releaseAt)}`,
          cls: 'bg-gray-100 text-gray-700 border-gray-200',
          title: 'Students can now see this order. Only staff see this badge.',
        }
      : {
          label: delay,
          cls: 'bg-purple-100 text-purple-800 border-purple-300',
          title: `Students see this order ${formatReleaseDelay(status.minutes)} after the simulation is launched (or Play after a reset). Only staff see this badge.`,
        };

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium space-x-1 ${cls}`}
      title={title}
    >
      <Timer className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
};
