import { describe, it, expect } from 'vitest';
import {
  findScaleRowIndex,
  fromDraftRows,
  toDraftRows,
  formatScaleRange,
  formatScaleResult,
  type SlidingScaleRow,
} from './slidingScale';

// The Code Blue corrective-dose order
const scale: SlidingScaleRow[] = [
  { min: 4.1, max: 10.0, action: 'units', units: 0 },
  { min: 10.1, max: 12.0, action: 'units', units: 1 },
  { min: 12.1, max: 15.0, action: 'units', units: 2 },
  { min: 15.1, max: 18.0, action: 'units', units: 3 },
  { min: 18.1, max: null, action: 'call_md', units: null },
];

describe('findScaleRowIndex', () => {
  it('matches inclusive bounds', () => {
    expect(findScaleRowIndex(scale, 4.1)).toBe(0);
    expect(findScaleRowIndex(scale, 10.0)).toBe(0);
    expect(findScaleRowIndex(scale, 10.1)).toBe(1);
    expect(findScaleRowIndex(scale, 13.2)).toBe(2);
  });

  it('matches open-ended rows', () => {
    expect(findScaleRowIndex(scale, 18.1)).toBe(4);
    expect(findScaleRowIndex(scale, 30)).toBe(4);
  });

  it('rounds to one decimal so readings do not fall between rows', () => {
    expect(findScaleRowIndex(scale, 10.04)).toBe(0);
    expect(findScaleRowIndex(scale, 10.06)).toBe(1);
  });

  it('returns -1 when nothing covers the reading', () => {
    expect(findScaleRowIndex(scale, 3.5)).toBe(-1);
    expect(findScaleRowIndex(null, 8)).toBe(-1);
    expect(findScaleRowIndex(scale, NaN)).toBe(-1);
  });
});

describe('fromDraftRows', () => {
  it('round-trips through the editor representation', () => {
    expect(fromDraftRows(toDraftRows(scale))).toEqual({ scale, error: null });
  });

  it('drops blank rows and saves an empty scale as null', () => {
    expect(fromDraftRows([{ min: '', max: '', action: 'units', units: '' }])).toEqual({ scale: null, error: null });
  });

  it('ignores the units box for Call MD / Hold rows', () => {
    const { scale: rows } = fromDraftRows([{ min: '', max: '3.9', action: 'hold', units: '5' }]);
    expect(rows).toEqual([{ min: null, max: 3.9, action: 'hold', units: null }]);
  });

  it('rejects invalid rows with a row number', () => {
    expect(fromDraftRows([{ min: '12', max: '10', action: 'units', units: '1' }]).error).toMatch(/row 1.*higher/);
    expect(fromDraftRows([{ min: '', max: '', action: 'units', units: '2' }]).error).toMatch(/row 1/);
    expect(fromDraftRows([{ min: '4', max: '10', action: 'units', units: '' }]).error).toMatch(/units/);
    expect(fromDraftRows([{ min: 'abc', max: '10', action: 'units', units: '1' }]).error).toMatch(/number/);
  });
});

describe('formatting', () => {
  it('formats ranges and results', () => {
    expect(formatScaleRange(scale[0])).toBe('4.1 – 10.0');
    expect(formatScaleRange(scale[4])).toBe('18.1 or higher');
    expect(formatScaleRange({ min: null, max: 3.9, action: 'hold', units: null })).toBe('3.9 or lower');
    expect(formatScaleResult(scale[0])).toBe('0 units');
    expect(formatScaleResult(scale[1])).toBe('1 unit');
    expect(formatScaleResult(scale[4])).toBe('Call MD');
  });
});
