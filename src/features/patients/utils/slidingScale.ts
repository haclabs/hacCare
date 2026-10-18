/**
 * Insulin sliding (correction) scale attached to a diabetic medication.
 * Stored as JSONB on patient_medications.sliding_scale; bounds are mmol/L and inclusive.
 */

export type SlidingScaleAction = 'units' | 'call_md' | 'hold';

export interface SlidingScaleRow {
  min: number | null;
  max: number | null;
  action: SlidingScaleAction;
  units: number | null;
}

/** Editor representation: inputs stay as text until the form is saved. */
export interface SlidingScaleDraftRow {
  min: string;
  max: string;
  action: SlidingScaleAction;
  units: string;
}

export const emptyDraftRow = (): SlidingScaleDraftRow => ({ min: '', max: '', action: 'units', units: '' });

export function toDraftRows(scale: SlidingScaleRow[] | null | undefined): SlidingScaleDraftRow[] {
  return (scale ?? []).map((row) => ({
    min: row.min?.toString() ?? '',
    max: row.max?.toString() ?? '',
    action: row.action,
    units: row.units?.toString() ?? '',
  }));
}

const parseNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
};

/** Converts editor rows to the stored shape. Fully blank rows are dropped; an empty scale saves as null. */
export function fromDraftRows(drafts: SlidingScaleDraftRow[]): { scale: SlidingScaleRow[] | null; error: string | null } {
  const rows: SlidingScaleRow[] = [];

  for (const [i, draft] of drafts.entries()) {
    const label = `Sliding scale row ${i + 1}`;
    if (!draft.min.trim() && !draft.max.trim() && !draft.units.trim()) continue;

    const min = parseNumber(draft.min);
    const max = parseNumber(draft.max);
    if (Number.isNaN(min) || Number.isNaN(max)) return { scale: null, error: `${label}: glucose must be a number` };
    if (min === null && max === null) return { scale: null, error: `${label}: enter a "from" or "to" glucose` };
    if (min !== null && max !== null && min > max) return { scale: null, error: `${label}: "from" is higher than "to"` };

    let units: number | null = null;
    if (draft.action === 'units') {
      units = parseNumber(draft.units);
      if (units === null || Number.isNaN(units) || units < 0) {
        return { scale: null, error: `${label}: enter the number of units (0 or more)` };
      }
    }
    rows.push({ min, max, action: draft.action, units });
  }

  return { scale: rows.length ? rows : null, error: null };
}

/** Index of the first row covering this glucose, or -1. */
export function findScaleRowIndex(scale: SlidingScaleRow[] | null | undefined, glucose: number): number {
  if (!scale || !Number.isFinite(glucose)) return -1;
  // Readings are entered to one decimal; round so 10.04 doesn't fall between 10.0 and 10.1
  const g = Math.round(glucose * 10) / 10;
  return scale.findIndex((row) => (row.min === null || g >= row.min) && (row.max === null || g <= row.max));
}

const fmt = (n: number) => n.toFixed(1);

export function formatScaleRange(row: SlidingScaleRow): string {
  if (row.min !== null && row.max !== null) return `${fmt(row.min)} – ${fmt(row.max)}`;
  if (row.min !== null) return `${fmt(row.min)} or higher`;
  return `${fmt(row.max as number)} or lower`;
}

export function formatScaleResult(row: SlidingScaleRow): string {
  if (row.action === 'call_md') return 'Call MD';
  if (row.action === 'hold') return 'Hold';
  return `${row.units} unit${row.units === 1 ? '' : 's'}`;
}
