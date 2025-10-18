/**
 * BCMA Hook - Integrates BCMA functionality with existing barcode scanning
 */

import { useState, useCallback } from 'react';
import { Patient, Medication } from '../../../types';
import { bcmaService, BCMAValidationResult } from '../../../services/clinical/bcmaService';
import { isBCMACurrentlyActive } from '../../../services/simulation/bcmaState';

export interface BCMAState {
  isActive: boolean;
  currentMedication: Medication | null;
  currentPatient: Patient | null;
  scannedPatientId: string;
  scannedMedicationId: string;
  validationResult: BCMAValidationResult | null;
  administrationInProgress: boolean;
}

export const useBCMA = () => {
  const [state, setState] = useState<BCMAState>({
    isActive: false,
    currentMedication: null,
    currentPatient: null,
    scannedPatientId: '',
    scannedMedicationId: '',
    validationResult: null,
    administrationInProgress: false
  });

  const startBCMAProcess = useCallback((patient: Patient, medication: Medication) => {
    setState({
      isActive: true,
      currentMedication: medication,
      currentPatient: patient,
      scannedPatientId: '',
      scannedMedicationId: '',
      validationResult: null,
      administrationInProgress: false
    });
  }, []);

  const cancelBCMAProcess = useCallback(() => {
    setState({
      isActive: false,
      currentMedication: null,
      currentPatient: null,
      scannedPatientId: '',
      scannedMedicationId: '',
      validationResult: null,
      administrationInProgress: false
    });
  }, []);

  const handleBarcodeScanned = useCallback((barcode: string) => {
    console.log('🔵 useBCMA: Barcode received:', barcode);
    console.log('🔵 useBCMA: Current state:', state);
    console.log('🔵 useBCMA: Global BCMA active:', isBCMACurrentlyActive());
    
    // Don't process if BCMAAdministration component is active
    if (isBCMACurrentlyActive() && !state.isActive) {
      console.log('🔵 useBCMA: BCMAAdministration is active, skipping useBCMA processing');
      return;
    }
    
    if (!state.isActive || !state.currentPatient || !state.currentMedication) {
      console.log('🔵 useBCMA: Not active or missing patient/medication');
      return;
    }

    // Updated patterns for MED prefix format and new ultra-short format
    const isPatientBarcode = barcode.startsWith('PT') || barcode.startsWith('PAT-') || barcode === state.currentPatient.patient_id;
    // New format: M + letter + 5 digits (e.g., MA26325) OR legacy MED format
    const isMedicationBarcode = barcode.startsWith('MED') || /^M[A-Z]\d{5}$/.test(barcode);

    console.log('🔵 useBCMA: Is patient barcode:', isPatientBarcode);
    console.log('🔵 useBCMA: Is medication barcode:', isMedicationBarcode);

    if (isPatientBarcode && !state.scannedPatientId) {
      console.log('🔵 useBCMA: Setting scanned patient ID');
      setState(prev => ({
        ...prev,
        scannedPatientId: barcode
      }));
    } else if (isMedicationBarcode && !state.scannedMedicationId) {
      console.log('🔵 useBCMA: Setting scanned medication ID');
      const newState = {
        ...state,
        scannedMedicationId: barcode
      };

      // If we have both scans, validate
      if (state.scannedPatientId) {
        console.log('🔵 useBCMA: Both barcodes scanned, validating...');
        const validation = bcmaService.validateBarcodes(
          state.scannedPatientId,
          barcode,
          state.currentPatient,
          state.currentMedication
        );

        setState({
          ...newState,
          validationResult: validation
        });
      } else {
        setState(newState);
      }
    }
  }, [state]);

  const generateMedicationBarcode = useCallback((medication: Medication) => {
    return bcmaService.generateMedicationBarcode(medication);
  }, []);

  const generatePatientBarcode = useCallback((patient: Patient) => {
    return bcmaService.generatePatientBarcode(patient);
  }, []);

  const completeAdministration = useCallback(async (
    currentUser: { id: string; name: string },
    manualOverrides: string[] = [],
    notes?: string
  ) => {
    if (!state.currentPatient || !state.currentMedication || !state.validationResult) {
      throw new Error('Invalid state for administration completion');
    }

    setState(prev => ({ ...prev, administrationInProgress: true }));

    try {
      const log = await bcmaService.createAdministrationLog(
        state.currentMedication,
        state.currentPatient,
        currentUser,
        state.scannedPatientId,
        state.scannedMedicationId,
        state.validationResult,
        manualOverrides,
        notes
      );

      // Calculate next due time
      const nextDue = bcmaService.calculateNextDueTime(state.currentMedication);

      setState(prev => ({ ...prev, administrationInProgress: false }));

      return {
        success: true,
        log,
        nextDue,
        updatedMedication: {
          ...state.currentMedication,
          last_administered: new Date().toISOString(),
          next_due: nextDue
        }
      };
    } catch (error) {
      setState(prev => ({ ...prev, administrationInProgress: false }));
      throw error;
    }
  }, [state]);

  return {
    state,
    startBCMAProcess,
    cancelBCMAProcess,
    handleBarcodeScanned,
    generateMedicationBarcode,
    generatePatientBarcode,
    completeAdministration
  };
};
