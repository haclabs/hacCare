/**
 * Oral tablet/capsule dosing — the student counts how many tablets they give and the
 * total dose is worked out from the per-tablet strength on the label.
 */

const ORAL_ROUTE = /\b(oral|po|p\.o\.|by mouth|sublingual|sl|buccal)\b/i;

/** Oral solid route with a single per-unit strength (e.g. "325mg"). Liquids ("160mg/5mL") are excluded. */
export function isOralTabletMedication(route: string | null | undefined, dosage: string | null | undefined): boolean {
  if (!route || !ORAL_ROUTE.test(route)) return false;
  return !(dosage ?? '').includes('/');
}

export interface TabletStrength {
  amount: number;
  unit: string;
}

/** Parses "325mg", "0.5 mg", "1,000 mg", "25 mcg" into amount + unit. Returns null if not a single strength. */
export function parseTabletStrength(dosage: string | null | undefined): TabletStrength | null {
  const match = (dosage ?? '').trim().match(/^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|\.\d+)\s*([a-zµμ]+)$/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit: match[2] };
}

/** Tablet counts are whole or half tablets, up to 10. */
export function isValidTabletCount(count: number): boolean {
  return Number.isFinite(count) && count > 0 && count <= 10 && Number.isInteger(count * 2);
}

function formatNumber(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

export function formatTotalDose(count: number, strength: TabletStrength | null): string | null {
  if (!strength || !isValidTabletCount(count)) return null;
  return `${formatNumber(count * strength.amount)} ${strength.unit}`;
}

/** The value saved to medication_administrations.administered_dose, e.g. "2 tablets (650 mg)". */
export function formatTabletDose(count: number, strength: TabletStrength | null): string {
  const label = `${formatNumber(count)} ${count === 1 ? 'tablet' : 'tablets'}`;
  const total = formatTotalDose(count, strength);
  return total ? `${label} (${total})` : label;
}
