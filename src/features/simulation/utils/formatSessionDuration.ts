import { differenceInMinutes } from 'date-fns';

/**
 * How long a completed session actually ran (Start → Complete), e.g. "1h 5m".
 * Falls back to the planned length only when the timestamps are missing.
 */
export function formatSessionDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
  plannedMinutes?: number | null,
): string {
  let minutes: number | null = null;
  if (startedAt && completedAt) {
    minutes = Math.max(0, differenceInMinutes(new Date(completedAt), new Date(startedAt)));
  } else if (plannedMinutes) {
    minutes = plannedMinutes;
  }
  if (minutes === null) return 'N/A';
  if (minutes < 1) return '< 1m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
