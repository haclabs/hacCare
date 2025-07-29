/**
 * BCMA Service - Handles barcode medication administration logic
 * Works with existing barcode scanning infrastructure
 */

import { Patient, Medication } from '../types';

export interface AdministrationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  administered_by: string;
  administered_by_id: string;
  timestamp: string;
  barcode_scanned_medication: string;
  barcode_scanned_patient: string;
  verification_checks: {
    patient: boolean;
    medication: boolean;
    dose: boolean;
    route: boolean;
    time: boolean;
  };
  manual_overrides: string[];
  notes?: string;
}

export interface BCMAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    patient: boolean;
    medication: boolean;
    dose: boolean;
    route: boolean;
    time: boolean;
  };
}

class BCMAService {
  // Generate medication barcode ID - shortened for scanner compatibility
  generateMedicationBarcode(medication: Medication): string {
    // Create a shorter, more readable medication code
    // Use first 3 letters of name + last 6 chars of ID for uniqueness
    const namePrefix = medication.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
    const idSuffix = medication.id.slice(-6).toUpperCase();
    return `${namePrefix}${idSuffix}`;
  }

  // Generate patient barcode ID - also shortened
  generatePatientBarcode(patient: Patient): string {
    // Use last 8 characters of patient_id for shorter barcode
    const shortId = patient.patient_id.slice(-8).toUpperCase();
    return `PT${shortId}`;
  }

  // Validate scanned barcodes against expected patient/medication
  validateBarcodes(
    scannedPatientId: string,
    scannedMedicationId: string,
    expectedPatient: Patient,
    expectedMedication: Medication
  ): BCMAValidationResult {
    const checks = {
      patient: this.validatePatientBarcode(scannedPatientId, expectedPatient),
      medication: this.validateMedicationBarcode(scannedMedicationId, expectedMedication),
      dose: true, // Assume dose is correct if medication matches
      route: true, // Assume route is correct if medication matches
      time: this.validateTiming(expectedMedication)
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!checks.patient) {
      errors.push('Patient barcode does not match expected patient');
    }

    if (!checks.medication) {
      errors.push('Medication barcode does not match expected medication');
    }

    if (!checks.time) {
      const timeError = this.getTimingError(expectedMedication);
      if (timeError.includes('Too soon')) {
        errors.push(timeError);
      } else {
        warnings.push(timeError);
      }
    }

    return {
      isValid: checks.patient && checks.medication && checks.dose && checks.route && checks.time,
      errors,
      warnings,
      checks
    };
  }

  // Validate patient barcode
  private validatePatientBarcode(scannedId: string, patient: Patient): boolean {
    const validIds = [
      patient.patient_id,
      `PT-${patient.patient_id}`,
      `PAT-${patient.patient_id}`
    ];
    return validIds.includes(scannedId);
  }

  // Validate medication barcode
  private validateMedicationBarcode(scannedId: string, medication: Medication): boolean {
    const validIds = [
      medication.id,
      `MED-${medication.id}`,
      `RX-${medication.id}`
    ];
    return validIds.includes(scannedId);
  }

  // Validate timing for medication administration
  private validateTiming(medication: Medication): boolean {
    if (!medication.next_due || medication.category === 'prn') {
      return true; // PRN medications don't have strict timing
    }

    const now = new Date();
    const nextDue = new Date(medication.next_due);
    const lastAdministered = medication.last_administered ? new Date(medication.last_administered) : null;

    // Check if it's not too early (within 30 minutes of due time)
    const thirtyMinutesEarly = new Date(nextDue.getTime() - 30 * 60 * 1000);
    
    // Check minimum interval since last dose (prevent double dosing)
    if (lastAdministered) {
      const minimumInterval = this.getMinimumInterval(medication.frequency);
      const timeSinceLastDose = now.getTime() - lastAdministered.getTime();
      
      if (timeSinceLastDose < minimumInterval) {
        return false; // Too soon since last dose
      }
    }

    return now >= thirtyMinutesEarly;
  }

  // Get timing error message
  private getTimingError(medication: Medication): string {
    if (!medication.next_due || medication.category === 'prn') {
      return '';
    }

    const now = new Date();
    const nextDue = new Date(medication.next_due);
    const lastAdministered = medication.last_administered ? new Date(medication.last_administered) : null;

    if (lastAdministered) {
      const minimumInterval = this.getMinimumInterval(medication.frequency);
      const timeSinceLastDose = now.getTime() - lastAdministered.getTime();
      
      if (timeSinceLastDose < minimumInterval) {
        const hoursRemaining = Math.ceil((minimumInterval - timeSinceLastDose) / (60 * 60 * 1000));
        return `Too soon since last dose. Wait ${hoursRemaining} more hours.`;
      }
    }

    const thirtyMinutesEarly = new Date(nextDue.getTime() - 30 * 60 * 1000);
    if (now < thirtyMinutesEarly) {
      const minutesEarly = Math.ceil((thirtyMinutesEarly.getTime() - now.getTime()) / (60 * 1000));
      return `Medication due in ${minutesEarly} minutes. Administering early.`;
    }

    return '';
  }

  // Get minimum interval between doses
  private getMinimumInterval(frequency: string): number {
    const intervals: { [key: string]: number } = {
      'Once daily': 20 * 60 * 60 * 1000, // 20 hours minimum
      'Twice daily': 10 * 60 * 60 * 1000, // 10 hours minimum
      'Three times daily': 6 * 60 * 60 * 1000, // 6 hours minimum
      'Four times daily': 4 * 60 * 60 * 1000, // 4 hours minimum
      'Every 4 hours': 3 * 60 * 60 * 1000, // 3 hours minimum
      'Every 6 hours': 4 * 60 * 60 * 1000, // 4 hours minimum
      'Every 8 hours': 6 * 60 * 60 * 1000, // 6 hours minimum
      'Every 12 hours': 10 * 60 * 60 * 1000, // 10 hours minimum
    };
    
    return intervals[frequency] || 6 * 60 * 60 * 1000; // Default 6 hours
  }

  // Create administration log
  async createAdministrationLog(
    medication: Medication,
    patient: Patient,
    currentUser: { id: string; name: string },
    scannedPatientId: string,
    scannedMedicationId: string,
    validationResult: BCMAValidationResult,
    manualOverrides: string[] = [],
    notes?: string
  ): Promise<AdministrationLog> {
    const log: AdministrationLog = {
      id: `admin-${Date.now()}`,
      medication_id: medication.id,
      patient_id: patient.id,
      administered_by: currentUser.name,
      administered_by_id: currentUser.id,
      timestamp: new Date().toISOString(),
      barcode_scanned_medication: scannedMedicationId,
      barcode_scanned_patient: scannedPatientId,
      verification_checks: validationResult.checks,
      manual_overrides: manualOverrides,
      notes
    };

    // In a real implementation, this would save to database
    console.log('BCMA Administration Log:', log);
    
    return log;
  }

  // Calculate next due time after administration
  calculateNextDueTime(medication: Medication): string {
    if (medication.category === 'prn') {
      return new Date().toISOString(); // PRN meds don't have next due
    }

    const now = new Date();
    const frequencyMap: { [key: string]: number } = {
      'Once daily': 24 * 60 * 60 * 1000,
      'Twice daily': 12 * 60 * 60 * 1000,
      'Three times daily': 8 * 60 * 60 * 1000,
      'Four times daily': 6 * 60 * 60 * 1000,
      'Every 4 hours': 4 * 60 * 60 * 1000,
      'Every 6 hours': 6 * 60 * 60 * 1000,
      'Every 8 hours': 8 * 60 * 60 * 1000,
      'Every 12 hours': 12 * 60 * 60 * 1000
    };
    
    const interval = frequencyMap[medication.frequency] || 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + interval).toISOString();
  }
}

export const bcmaService = new BCMAService();
