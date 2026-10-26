import { describe, it, expect } from 'vitest';
import {
  isOralTabletMedication,
  parseTabletStrength,
  isValidTabletCount,
  formatTotalDose,
  formatTabletDose,
} from './tabletDose';

describe('isOralTabletMedication', () => {
  it('accepts oral routes with a single strength', () => {
    expect(isOralTabletMedication('Oral', '325mg')).toBe(true);
    expect(isOralTabletMedication('PO', '5 mg')).toBe(true);
    expect(isOralTabletMedication('Sublingual', '0.4 mg')).toBe(true);
  });

  it('rejects oral liquids and non-oral routes', () => {
    expect(isOralTabletMedication('Oral', '160mg/5mL')).toBe(false);
    expect(isOralTabletMedication('IV', '325mg')).toBe(false);
    expect(isOralTabletMedication('Subcutaneous', '10 units')).toBe(false);
    expect(isOralTabletMedication('Topical', '1%')).toBe(false);
    expect(isOralTabletMedication(undefined, '325mg')).toBe(false);
  });
});

describe('parseTabletStrength', () => {
  it('parses common strengths', () => {
    expect(parseTabletStrength('325mg')).toEqual({ amount: 325, unit: 'mg' });
    expect(parseTabletStrength('0.5 mg')).toEqual({ amount: 0.5, unit: 'mg' });
    expect(parseTabletStrength('1,000 mg')).toEqual({ amount: 1000, unit: 'mg' });
    expect(parseTabletStrength('25 mcg')).toEqual({ amount: 25, unit: 'mcg' });
  });

  it('returns null for anything that is not a single strength', () => {
    expect(parseTabletStrength('1 tablet BID')).toBeNull();
    expect(parseTabletStrength('5/325 mg')).toBeNull();
    expect(parseTabletStrength('')).toBeNull();
    expect(parseTabletStrength(null)).toBeNull();
  });
});

describe('isValidTabletCount', () => {
  it('allows whole and half tablets up to 10', () => {
    expect(isValidTabletCount(0.5)).toBe(true);
    expect(isValidTabletCount(2)).toBe(true);
    expect(isValidTabletCount(10)).toBe(true);
    expect(isValidTabletCount(0)).toBe(false);
    expect(isValidTabletCount(0.25)).toBe(false);
    expect(isValidTabletCount(11)).toBe(false);
    expect(isValidTabletCount(NaN)).toBe(false);
  });
});

describe('formatTabletDose', () => {
  const strength = { amount: 325, unit: 'mg' };

  it('includes the total dose', () => {
    expect(formatTotalDose(2, strength)).toBe('650 mg');
    expect(formatTabletDose(2, strength)).toBe('2 tablets (650 mg)');
    expect(formatTabletDose(1, strength)).toBe('1 tablet (325 mg)');
    expect(formatTabletDose(0.5, { amount: 0.5, unit: 'mg' })).toBe('0.5 tablets (0.25 mg)');
  });

  it('falls back to the count when strength is unknown', () => {
    expect(formatTabletDose(2, null)).toBe('2 tablets');
  });
});
