/**
 * Checks for medications_catalog entries so they print cleanly on barcode labels.
 *
 * Labels print NAME (12px bold uppercase, ~1.75in, cut off with an ellipsis), "(Brand)" on its
 * own 10px line (medicationNameHtml in bulkLabelService), then STRENGTH (17px bold, runs under the
 * QR code when long), then FORMULATION (9px). Thresholds are approximate character counts for
 * that layout.
 */

export const LABEL_NAME_CHARS = 18;
/** Includes the two brackets the label adds around the brand. */
export const LABEL_BRAND_CHARS = 24;
export const LABEL_STRENGTH_CHARS = 15;

/** Hard input limits; the label thresholds above are warnings only. */
export const NAME_MAX_LENGTH = 40;
export const BRAND_MAX_LENGTH = 30;
export const STRENGTH_MAX_LENGTH = 25;

export const CATALOG_FORMULATIONS = [
  'tablet', 'capsule', 'liquid', 'powder', 'injection', 'IV solution', 'mini-bag', 'insulin pen',
  'cream', 'patch', 'inhaler', 'drops', 'spray', 'suppository', 'enema', 'bottle',
];

const DOSE_PATTERN = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|units?|meq|iu|%)(?![a-z])/i;
const NO_STRENGTH_ALLOWED = /^per order$/i;

/** "50mg/ml" → "50 mg/mL", "100 units / mL" → "100 units/mL". */
export function normalizeStrength(strength: string): string {
  return strength
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/(\d)(mg|mcg|g|ml|meq|iu|units?)\b/gi, '$1 $2')
    .replace(/\bgrams?\b/gi, 'g')
    .replace(/\bml\b/gi, 'mL')
    .replace(/\bmeq\b/gi, 'mEq')
    .replace(/\biu\b/gi, 'IU');
}

function containsWord(text: string, word: string): boolean {
  if (!word.trim()) return false;
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}($|[^a-z])`, 'i').test(text);
}

export interface CatalogEntryWarnings {
  name: string[];
  brand: string[];
  strength: string[];
}

export function getCatalogEntryWarnings(entry: {
  name: string;
  brand_name: string;
  strength: string;
  formulation: string;
}): CatalogEntryWarnings {
  const name = entry.name.trim();
  const brand = entry.brand_name.trim();
  const strength = entry.strength.trim();
  const warnings: CatalogEntryWarnings = { name: [], brand: [], strength: [] };

  if (name.length > LABEL_NAME_CHARS) {
    warnings.name.push(`Over ${LABEL_NAME_CHARS} characters — the end will be cut off on printed labels.`);
  }
  if (DOSE_PATTERN.test(name)) {
    warnings.name.push('Includes a strength — put that in Strength, which prints under the name.');
  }
  if (containsWord(name, entry.formulation)) {
    warnings.name.push(`Repeats the formulation "${entry.formulation}", which already prints on the label.`);
  }
  if (/[()]/.test(name)) {
    warnings.name.push('Put the brand in Brand Name instead of brackets.');
  }
  if (brand && containsWord(name, brand)) {
    warnings.name.push('Repeats the brand, which prints on its own line.');
  }

  if (brand.length > LABEL_BRAND_CHARS - 2) {
    warnings.brand.push(`Over ${LABEL_BRAND_CHARS - 2} characters — the end will be cut off on printed labels.`);
  }
  if (/[()]/.test(brand)) {
    warnings.brand.push('No brackets needed — they are added when the label prints.');
  }

  if (strength) {
    if (strength.length > LABEL_STRENGTH_CHARS) {
      warnings.strength.push(`Over ${LABEL_STRENGTH_CHARS} characters — runs under the QR code on labels.`);
    }
    if (!/\d/.test(strength) && !NO_STRENGTH_ALLOWED.test(strength)) {
      warnings.strength.push('Enter the product strength, e.g. "100 units/mL" (or "per order").');
    }
    if (/\/\s*kg\b/i.test(strength)) {
      warnings.strength.push("Looks weight-based — enter the product strength; the ordered dose belongs on the patient's medication.");
    }
    if (containsWord(strength, entry.formulation)) {
      warnings.strength.push(`Repeats the formulation "${entry.formulation}".`);
    }
  }

  return warnings;
}
