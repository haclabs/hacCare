import { describe, expect, it } from 'vitest';
import { composeMedicationOrderText } from './medicationOrderText';

describe('composeMedicationOrderText', () => {
  it('includes the scheduled administration times', () => {
    expect(
      composeMedicationOrderText({
        name: 'Metoprolol',
        dosage: '25 mg',
        route: 'Oral',
        frequency: '2 times daily',
        category: 'scheduled',
        admin_time: '08:00',
        admin_times: ['08:00', '20:00'],
      })
    ).toBe('Metoprolol 25 mg Oral — 2 times daily (08:00, 20:00)');
  });

  it('falls back to the single admin time', () => {
    expect(
      composeMedicationOrderText({
        name: 'Furosemide',
        dosage: '40 mg',
        route: 'IV',
        frequency: '1 time daily',
        category: 'scheduled',
        admin_time: '09:00',
        admin_times: null,
      })
    ).toBe('Furosemide 40 mg IV — 1 time daily (09:00)');
  });

  it('omits times for PRN, STAT and continuous medications', () => {
    expect(
      composeMedicationOrderText({
        name: 'Acetaminophen',
        dosage: '650 mg',
        route: 'Oral',
        frequency: 'As needed (PRN)',
        category: 'prn',
        admin_time: '08:00',
      })
    ).toBe('Acetaminophen 650 mg Oral — As needed (PRN)');
  });

  it('returns an empty string until a medication is chosen', () => {
    expect(
      composeMedicationOrderText({ name: '', dosage: '', route: '', frequency: '1 time daily', category: undefined })
    ).toBe('');
  });
});
