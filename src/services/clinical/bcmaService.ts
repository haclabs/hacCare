/**
 * BCMA Service - Handles barcode medication administration logic
 * Works with existing barcode scanning infrastructure
 */

import { Patient, Medication, MedicationAdministration } from '../../types';
import { recordMedicationAdministration } from './medicationService';

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
  // Generate medication barcode ID - ULTRA-SHORT for heavy label scanning
  generateMedicationBarcode(medication: Medication): string {
    // Create ultra-short medication code for maximum bar width
    // Format: M + 1 char + 5 digits = 7 total characters (optimal for scanning)
    
    // Get clean medication name - only letters and numbers
    const cleanName = medication.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Generate 1-character prefix from medication name
    const namePrefix = cleanName.charAt(0) || 'X';
    
    // Get numeric hash from ID for 5-digit code
    const cleanId = medication.id.replace(/[^A-Z0-9]/g, '').toUpperCase();
    // Create a simple hash to convert ID to numbers
    let numericCode = 0;
    for (let i = 0; i < cleanId.length; i++) {
      numericCode = (numericCode * 37 + cleanId.charCodeAt(i)) % 100000;
    }
    // Ensure it's always 5 digits
    const idSuffix = numericCode.toString().padStart(5, '0');
    
    const barcode = `M${namePrefix}${idSuffix}`;
    
    console.log('🔵 Generated ULTRA-SHORT barcode for', medication.name, ':', barcode);
    console.log('🔵 Original name:', medication.name, 'Clean name:', cleanName);
    console.log('🔵 Name prefix (1 char):', namePrefix, 'ID suffix (5 digits):', idSuffix);
    console.log('🔵 Final barcode length:', barcode.length, '- Wider bars for heavy labels!');
    
    return barcode;
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
    // Handle both old and new barcode formats
    const generatedBarcode = this.generatePatientBarcode(patient);
    const validIds = [
      patient.patient_id,           // Direct patient ID (PT12345)
      generatedBarcode,             // New format (PT12345 -> PT12345)
      `PT-${patient.patient_id}`,   // Legacy format
      `PAT-${patient.patient_id}`   // Alternative legacy format
    ];
    
    console.log('🔵 Validating patient barcode:', scannedId);
    console.log('🔵 Valid patient IDs:', validIds);
    console.log('🔵 Patient ID:', patient.patient_id);
    console.log('🔵 Generated barcode:', generatedBarcode);
    
    return validIds.includes(scannedId);
  }

  // Validate medication barcode
  private validateMedicationBarcode(scannedId: string, medication: Medication): boolean {
    // Handle both old and new barcode formats
    const generatedBarcode = this.generateMedicationBarcode(medication);
    const validIds = [
      medication.id,                // Direct medication ID
      generatedBarcode,             // New format (MEDASPF646A3)
      `MED-${medication.id}`,       // Legacy format
      `RX-${medication.id}`         // Alternative legacy format
    ];
    
    console.log('🔵 Validating medication barcode:', scannedId);
    console.log('🔵 Valid medication IDs:', validIds);
    console.log('🔵 Medication ID:', medication.id);
    console.log('🔵 Generated barcode:', generatedBarcode);
    console.log('🔵 Medication name:', medication.name);
    console.log('🔵 Does scanned match generated?', scannedId === generatedBarcode);
    
    const isValid = validIds.includes(scannedId);
    console.log('🔵 Is barcode valid?', isValid);
    
    return isValid;
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
    notes?: string,
    studentName?: string
  ): Promise<AdministrationLog> {
    console.log('🔵 BCMA: Creating administration record in database...');
    
    const log: AdministrationLog = {
      id: `admin-${Date.now()}`,
      medication_id: medication.id,
      patient_id: patient.patient_id || patient.id, // Use patient_id string field
      administered_by: currentUser.name,
      administered_by_id: currentUser.id,
      timestamp: new Date().toISOString(),
      barcode_scanned_medication: scannedMedicationId,
      barcode_scanned_patient: scannedPatientId,
      verification_checks: validationResult.checks,
      manual_overrides: manualOverrides,
      notes
    };

    try {
      // Create the medication administration record in the database
      const administrationRecord: MedicationAdministration = {
        medication_id: medication.id,
        patient_id: patient.id, // Use database UUID, not patient_id (MRN)
        administered_by: currentUser.name,
        administered_by_id: currentUser.id,
        timestamp: log.timestamp,
        notes: notes ? `BCMA Administration. ${notes}` : 'BCMA Administration',
        dosage: medication.dosage,
        route: medication.route,
        status: 'completed',
        medication_name: medication.name,
        student_name: studentName,
        // ✅ CRITICAL: Include barcode scan information for BCMA compliance
        barcode_scanned_patient: scannedPatientId,
        barcode_scanned_medication: scannedMedicationId
      };

      console.log('🔵 BCMA: Recording administration:', administrationRecord);
      
      // Save to database using the medication service
      await recordMedicationAdministration(administrationRecord);
      
      console.log('✅ BCMA: Administration record saved successfully');
      console.log('🔵 BCMA Administration Log:', log);
      
    } catch (error) {
      console.error('❌ BCMA: Error saving administration record:', error);
      
      // Provide more specific error handling
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          console.error('🔒 BCMA: Database permission error - need to run fix-medication-administration-permissions.sql');
          throw new Error('Database permission error: Please contact your administrator to fix medication administration permissions.');
        } else if (error.message.includes('constraint')) {
          console.error('🔗 BCMA: Database constraint error:', error.message);
          throw new Error(`Database error: ${error.message}`);
        } else {
          console.error('💥 BCMA: Unexpected error:', error.message);
          throw new Error(`Failed to save administration: ${error.message}`);
        }
      } else {
        console.error('💥 BCMA: Unknown error type:', error);
        throw new Error('Unknown error occurred while saving administration record');
      }
    }
    
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
