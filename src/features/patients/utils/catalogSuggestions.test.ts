import { describe, expect, it } from 'vitest';

import type { CatalogEntry } from '../../../services/clinical/medicationService';
import { findCatalogSuggestions } from './catalogSuggestions';

const entry = (id: string, name: string, brand_name: string | null, strength: string): CatalogEntry => ({
  id,
  barcode: `MZ${id}`,
  name,
  brand_name,
  formulation: 'tablet',
  strength,
  route: 'oral',
  category: 'scheduled',
  display_order: null,
});

const catalog = [
  entry('1', 'Amlodipine', null, '5 mg'),
  entry('2', 'Insulin Aspart', 'NovoRapid', '100 units/mL'),
  entry('3', 'Insulin Lispro', 'Admelog', '100 units/mL'),
  entry('4', 'Acetaminophen', 'Tylenol', '325 mg'),
];

describe('findCatalogSuggestions', () => {
  it('needs at least three letters before suggesting', () => {
    expect(findCatalogSuggestions('am', catalog)).toEqual([]);
    expect(findCatalogSuggestions('aml', catalog).map((e) => e.id)).toEqual(['1']);
  });

  it('ignores a typed strength and is case-insensitive', () => {
    expect(findCatalogSuggestions('AMLODIPINE 5mg', catalog).map((e) => e.id)).toEqual(['1']);
  });

  it('matches brand names', () => {
    expect(findCatalogSuggestions('tylenol', catalog).map((e) => e.id)).toEqual(['4']);
    expect(findCatalogSuggestions('novorapid', catalog).map((e) => e.id)).toEqual(['2']);
  });

  it('requires every word to match', () => {
    expect(findCatalogSuggestions('insulin', catalog).map((e) => e.id)).toEqual(['2', '3']);
    expect(findCatalogSuggestions('insulin lispro', catalog).map((e) => e.id)).toEqual(['3']);
  });

  it('returns nothing for a name not in the catalog', () => {
    expect(findCatalogSuggestions('Zopiclone', catalog)).toEqual([]);
  });
});
