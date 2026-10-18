/**
 * Release timing for doctors' orders that an instructor holds back until N minutes into a
 * simulation. The database enforces visibility (RLS policy doctors_orders_hide_unreleased); this
 * only drives what staff are shown about an order's schedule.
 */

export const MAX_RELEASE_AFTER_MINUTES = 1440;

export type OrderReleaseStatus =
  | { kind: 'immediate' }
  /** Has a delay, but there is no running clock (template, or simulation not started yet). */
  | { kind: 'scheduled'; minutes: number }
  | { kind: 'held'; minutes: number; releaseAt: Date }
  | { kind: 'released'; minutes: number; releaseAt: Date };

export function getOrderReleaseStatus(
  releaseAfterMinutes: number | null | undefined,
  simulationStartsAt: string | null | undefined,
  now: Date = new Date()
): OrderReleaseStatus {
  const minutes = releaseAfterMinutes ?? 0;
  if (minutes <= 0) return { kind: 'immediate' };
  if (!simulationStartsAt) return { kind: 'scheduled', minutes };

  const releaseAt = new Date(new Date(simulationStartsAt).getTime() + minutes * 60_000);
  return releaseAt.getTime() <= now.getTime()
    ? { kind: 'released', minutes, releaseAt }
    : { kind: 'held', minutes, releaseAt };
}

/** 30 → "30 min", 60 → "1 h", 90 → "1 h 30 min". */
export function formatReleaseDelay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Form input → column value. Blank, zero or invalid means "no delay". */
export function parseReleaseAfterMinutes(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) return null;
  return Math.min(value, MAX_RELEASE_AFTER_MINUTES);
}
