import { bcmaService } from '../../services/clinical/bcmaService';
import type { Patient } from '../../types';

/**
 * Resolve a scanned wristband to a patient in the current simulation, using the same
 * barcode formats the BCMA Five-Rights check accepts. Exact matches only — a loose
 * match here would open the wrong patient's MAR.
 */
export function findPatientByWristband<T extends Pick<Patient, 'patient_id'>>(
  barcode: string,
  patients: T[]
): T | undefined {
  const scanned = barcode.trim();
  if (!scanned) return undefined;
  return patients.find((p) => !!p.patient_id && bcmaService.validatePatientBarcode(scanned, p));
}
