// Date-only DOBs ('YYYY-MM-DD') must be read as local dates. new Date('1963-08-01') is UTC
// midnight, which is July 31 anywhere west of Greenwich, so pin a western timezone here.
process.env.TZ = 'America/Edmonton';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateAge, formatDOB } from './patientUtils';
import { calculatePreciseAge } from './vitalRanges';

afterEach(() => {
  vi.useRealTimers();
});

describe('date-of-birth handling west of UTC', () => {
  it('formats a DOB as the stored calendar day', () => {
    expect(formatDOB('1963-08-01')).toBe(new Date(1963, 7, 1).toLocaleDateString());
  });

  it('does not count the birthday a day early', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 31, 12));
    expect(calculateAge('1963-08-01')).toBe(62);

    vi.setSystemTime(new Date(2026, 7, 1, 12));
    expect(calculateAge('1963-08-01')).toBe(63);
  });

  it('treats a newborn born today as 0 days old', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14, 12));
    const age = calculatePreciseAge('2026-10-14');
    expect(age.days).toBe(0);
    expect(age.years).toBe(0);
    expect(age.months).toBe(0);
  });
});
