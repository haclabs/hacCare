/**
 * Shared option lists for the MAR Add/Edit medication forms.
 *
 * Both forms must use the same stored values: when they diverged, medications saved by one form
 * opened with blank Route/Frequency/Category selects in the other.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export const ROUTE_OPTIONS: SelectOption[] = [
  { value: 'Oral', label: 'Oral (PO)' },
  { value: 'SL', label: 'Sublingual (SL)' },
  { value: 'IV', label: 'Intravenous (IV)' },
  { value: 'IM', label: 'Intramuscular (IM)' },
  { value: 'SC', label: 'Subcutaneous (SC)' },
  { value: 'Topical', label: 'Topical' },
  { value: 'Transdermal', label: 'Transdermal' },
  { value: 'Inhalation', label: 'Inhalation' },
  { value: 'Nasal', label: 'Nasal' },
  { value: 'Rectal', label: 'Rectal' },
];

export const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: '1 time daily', label: '1 time daily' },
  { value: '2 times daily', label: '2 times daily' },
  { value: '3 times daily', label: '3 times daily' },
  { value: '4 times daily', label: '4 times daily' },
  { value: 'Every 4 hours', label: 'Every 4 hours' },
  { value: 'As needed (PRN)', label: 'As needed (PRN)' },
  { value: 'One Time Admin (Now)', label: 'One Time Admin (Now)' },
  { value: 'Continuous', label: 'Continuous infusion' },
  { value: 'Once monthly', label: 'Once monthly' },
];

// 'unscheduled' is allowed by the DB but deliberately omitted: the MAR grid has no section for it,
// so such a medication would never be displayed.
export const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'prn', label: 'PRN (As Needed) - No alerts' },
  { value: 'scheduled', label: 'Scheduled - Time-based alerts' },
  { value: 'continuous', label: 'IV/Continuous - Critical alerts' },
  { value: 'stat', label: 'STAT (No Alert)' },
  { value: 'diabetic', label: '🩸 Diabetic - Glucose monitoring' },
];

/** medications_catalog.route (constrained lowercase words) → form route value. */
const CATALOG_ROUTE_TO_FORM: Record<string, string> = {
  oral: 'Oral',
  sublingual: 'SL',
  intravenous: 'IV',
  intramuscular: 'IM',
  subcutaneous: 'SC',
  topical: 'Topical',
  transdermal: 'Transdermal',
  inhalation: 'Inhalation',
  nasal: 'Nasal',
  rectal: 'Rectal',
};

/** Codes the old Edit form saved before the option lists were unified. */
const LEGACY_ROUTE_ALIASES: Record<string, string> = {
  po: 'Oral',
  top: 'Topical',
  inh: 'Inhalation',
};

export function mapCatalogRoute(catalogRoute: string): string {
  return CATALOG_ROUTE_TO_FORM[catalogRoute.trim().toLowerCase()] ?? '';
}

/** Returns '' for catalog categories the forms don't offer, so the instructor must choose one. */
export function mapCatalogCategory(catalogCategory: string): string {
  return CATEGORY_OPTIONS.some((o) => o.value === catalogCategory) ? catalogCategory : '';
}

/** Maps a stored route onto a form option; unrecognised values are returned unchanged. */
export function normalizeRoute(route: string | null | undefined): string {
  const trimmed = (route ?? '').trim();
  const key = trimmed.toLowerCase();
  const option = ROUTE_OPTIONS.find((o) => o.value.toLowerCase() === key);
  return option?.value ?? LEGACY_ROUTE_ALIASES[key] ?? CATALOG_ROUTE_TO_FORM[key] ?? trimmed;
}

/**
 * Appends the current value when it isn't a standard option, so a select never renders blank for
 * existing data (e.g. legacy frequencies like "Once daily", which BCMA timing still keys on).
 */
export function withCurrentValue(options: SelectOption[], current: string | null | undefined): SelectOption[] {
  if (!current || options.some((o) => o.value === current)) return options;
  return [...options, { value: current, label: current }];
}

/** Scheduled doses per day implied by a frequency string, or 0 if it isn't a fixed daily schedule. */
export { dosesPerDay } from '../../../services/clinical/medicationFrequency';

/** Generate a random M-series barcode for free-entry (non-catalog) medications. */
export function generateFreeEntryBarcode(name: string): string {
  const prefix = (name.replace(/[^A-Za-z]/g, '').charAt(0) || 'X').toUpperCase();
  const code = Math.floor(10000 + Math.random() * 90000);
  return `M${prefix}${code}`;
}
