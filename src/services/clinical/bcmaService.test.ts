import { describe, it, expect } from 'vitest';
import { bcmaService } from './bcmaService';
import type { Patient, Medication } from '../../types';

/**
 * BCMA Five-Rights verification tests.
 *
 * These cover the barcode-matching and timing logic in bcmaService.validateBarcodes(),
 * which is the last line of defense before a medication administration is recorded.
 * A false-positive match here is a patient-safety bug, so the matching rules
 * (direct id, generated barcode, legacy prefixes, catalog barcode) are tested explicitly.
 */

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-uuid-1',
    patient_id: 'P12345678',
    tenant_id: 'tenant-a',
    first_name: 'Jane',
    last_name: 'Doe',
    date_of_birth: '1990-01-01',
    gender: 'Female',
    room_number: '101',
    bed_number: 'A',
    admission_date: '2026-01-01',
    condition: 'Stable',
    diagnosis: 'N/A',
    allergies: [],
    blood_type: 'O+',
    emergency_contact_name: 'John Doe',
    emergency_contact_relationship: 'Spouse',
    emergency_contact_phone: '555-0100',
    vitals: [],
    notes: [],
    ...overrides
  };
}

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-uuid-1',
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Once daily',
    route: 'Oral',
    start_date: '2026-01-01',
    prescribed_by: 'Dr. Smith',
    next_due: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    status: 'Active',
    ...overrides
  };
}

describe('bcmaService.validateBarcodes - patient identity check', () => {
  it('matches when the scanned code is the raw patient_id', () => {
    const patient = makePatient();
    const medication = makeMedication();
    const result = bcmaService.validateBarcodes(patient.patient_id, medication.id, patient, medication);
    expect(result.checks.patient).toBe(true);
  });

  it('matches when the scanned code is the generated PT-prefixed barcode', () => {
    const patient = makePatient();
    const medication = makeMedication();
    const generated = bcmaService.generatePatientBarcode(patient);
    const result = bcmaService.validateBarcodes(generated, medication.id, patient, medication);
    expect(result.checks.patient).toBe(true);
  });

  it('matches legacy PT- and PAT- prefixed formats', () => {
    const patient = makePatient();
    const medication = makeMedication();

    const legacy1 = bcmaService.validateBarcodes(`PT-${patient.patient_id}`, medication.id, patient, medication);
    const legacy2 = bcmaService.validateBarcodes(`PAT-${patient.patient_id}`, medication.id, patient, medication);

    expect(legacy1.checks.patient).toBe(true);
    expect(legacy2.checks.patient).toBe(true);
  });

  it('rejects a barcode belonging to a different patient and reports an error', () => {
    const patient = makePatient();
    const otherPatient = makePatient({ id: 'patient-uuid-2', patient_id: 'P99999999' });
    const medication = makeMedication();

    const result = bcmaService.validateBarcodes(otherPatient.patient_id, medication.id, patient, medication);

    expect(result.checks.patient).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Patient barcode does not match expected patient');
  });
});

describe('bcmaService.validateBarcodes - medication identity check', () => {
  it('matches when the scanned code is the raw medication id', () => {
    const patient = makePatient();
    const medication = makeMedication();
    const result = bcmaService.validateBarcodes(patient.patient_id, medication.id, patient, medication);
    expect(result.checks.medication).toBe(true);
  });

  it('matches the generated hash-based barcode', () => {
    const patient = makePatient();
    const medication = makeMedication();
    const generated = bcmaService.generateMedicationBarcode(medication);
    const result = bcmaService.validateBarcodes(patient.patient_id, generated, patient, medication);
    expect(result.checks.medication).toBe(true);
  });

  it('matches a pre-assigned catalog barcode directly, bypassing the hash', () => {
    const patient = makePatient();
    const medication = makeMedication({ barcode: 'MZ00123' });
    const result = bcmaService.validateBarcodes(patient.patient_id, 'MZ00123', patient, medication);
    expect(result.checks.medication).toBe(true);
  });

  it('rejects a barcode belonging to a different medication and reports an error', () => {
    const patient = makePatient();
    const medication = makeMedication();
    const otherMedication = makeMedication({ id: 'med-uuid-2', name: 'Warfarin' });

    const result = bcmaService.validateBarcodes(
      patient.patient_id,
      otherMedication.id,
      patient,
      medication
    );

    expect(result.checks.medication).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Medication barcode does not match expected medication');
  });
});

describe('bcmaService.validateBarcodes - timing checks', () => {
  it('always passes timing for PRN medications regardless of due time', () => {
    const patient = makePatient();
    const medication = makeMedication({
      category: 'prn',
      next_due: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // long overdue is irrelevant for PRN
    });

    const result = bcmaService.validateBarcodes(patient.patient_id, medication.id, patient, medication);
    expect(result.checks.time).toBe(true);
  });

  it('flags administering too soon after the last dose (production context)', () => {
    const patient = makePatient();
    const medication = makeMedication({
      frequency: 'Once daily', // 20h minimum interval
      last_administered: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      next_due: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()
    });

    const result = bcmaService.validateBarcodes(patient.patient_id, medication.id, patient, medication);

    expect(result.checks.time).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Too soon'))).toBe(true);
  });

  it('warns (but does not error) when administering more than 30 minutes early', () => {
    const patient = makePatient();
    const medication = makeMedication({
      next_due: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
    });

    const result = bcmaService.validateBarcodes(patient.patient_id, medication.id, patient, medication);

    expect(result.checks.time).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('Administering early'))).toBe(true);
  });

  it('ignores stale next_due/last_administered from before the simulation session started', () => {
    const sessionStartedAt = new Date().toISOString();
    const patient = makePatient();
    const medication = makeMedication({
      // Both fields predate the simulation session (leftover from a prior group's run)
      last_administered: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      next_due: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    });

    const result = bcmaService.validateBarcodes(
      patient.patient_id,
      medication.id,
      patient,
      medication,
      sessionStartedAt
    );

    expect(result.checks.time).toBe(true);
  });

  it('treats a null sessionStartedAt (reset/pending simulation) as no prior dose this session', () => {
    const patient = makePatient();
    const medication = makeMedication({
      last_administered: new Date().toISOString(), // would otherwise be "too soon"
      frequency: 'Once daily'
    });

    const result = bcmaService.validateBarcodes(
      patient.patient_id,
      medication.id,
      patient,
      medication,
      null
    );

    expect(result.checks.time).toBe(true);
  });

  it('still enforces the minimum interval for a dose given after the session started', () => {
    const sessionStartedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // session started 1h ago
    const patient = makePatient();
    const medication = makeMedication({
      frequency: 'Once daily', // 20h minimum interval
      last_administered: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 min ago, within session
    });

    const result = bcmaService.validateBarcodes(
      patient.patient_id,
      medication.id,
      patient,
      medication,
      sessionStartedAt
    );

    expect(result.checks.time).toBe(false);
  });
});

describe('bcmaService.validateBarcodes - overall validity', () => {
  it('is valid only when patient, medication and timing all pass', () => {
    const patient = makePatient();
    const medication = makeMedication({
      next_due: new Date(Date.now() - 5 * 60 * 1000).toISOString() // due 5 min ago, within the 30-min window
    });

    const result = bcmaService.validateBarcodes(patient.patient_id, medication.id, patient, medication);

    expect(result.checks).toEqual({ patient: true, medication: true, dose: true, route: true, time: true });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
