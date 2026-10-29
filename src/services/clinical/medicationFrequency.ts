/**
 * Frequency parsing shared by the medication forms and MAR/BCMA scheduling.
 *
 * Stored frequencies come in several wordings ("1 time daily" from the Add form, legacy
 * "Once daily" / "BID (Twice daily)", "Every 4 hours PRN", "Q12H"), so callers must not
 * key lookups on exact strings.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Scheduled doses per day implied by a frequency string, or 0 if it isn't a fixed daily schedule. */
export function dosesPerDay(frequency: string): number {
  const f = frequency.toLowerCase();
  if (f.includes('prn') || f.includes('as needed')) return 0;
  const numeric = f.match(/(\d+)\s*times?\s+daily/);
  if (numeric) return parseInt(numeric[1], 10);
  if (/\b(qid|four times)\b/.test(f)) return 4;
  if (/\b(tid|three times)\b/.test(f)) return 3;
  if (/\b(bid|twice)\b/.test(f)) return 2;
  if (/\bonce daily\b/.test(f)) return 1;
  return 0;
}

/** Hours between scheduled doses, or null when the frequency has no fixed interval (PRN, continuous, one-time). */
export function doseIntervalHours(frequency: string): number | null {
  const f = frequency.toLowerCase();
  if (/\bonce monthly\b/.test(f)) return 30 * 24;
  const hourly = f.match(/\b(?:every\s+(\d+)\s*h(?:ours?|rs?)?|q\s*(\d+)\s*h)\b/);
  if (hourly) return parseInt(hourly[1] ?? hourly[2], 10);
  const perDay = dosesPerDay(frequency);
  return perDay > 0 ? 24 / perDay : null;
}

/** Scheduled interval (ms) between doses, falling back to 24 hours when the frequency has none. */
export function doseIntervalMs(frequency: string): number {
  return (doseIntervalHours(frequency) ?? 24) * HOUR_MS;
}
