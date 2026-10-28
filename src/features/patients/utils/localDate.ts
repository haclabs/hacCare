/** Today's date as YYYY-MM-DD in the user's timezone (toISOString() gives the UTC date). */
export function todayLocalISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Formats a YYYY-MM-DD date for display without the UTC-midnight shift to the previous day. */
export function formatLocalDate(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString();
}
