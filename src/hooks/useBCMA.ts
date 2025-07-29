/**
 * BCMA Hook - Integrates BCMA functionality with existing barcode scanning
 */

import { useState, useCallback } from 'react';
import { Patient, Medication } from '../types';
import { bcmaService, BCMAValidationResult } from '../lib/bcmaService';

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
    if (!state.isActive || !state.currentPatient || !state.currentMedication) return;

    // Determine if this is a patient or medication barcode
    const isPatientBarcode = barcode.includes('PT-') || barcode.includes('PAT-') || 
                            barcode === state.currentPatient.patient_id;
    const isMedicationBarcode = barcode.includes('MED-') || barcode.includes('RX-') || 
                               barcode === state.currentMedication.id;

    if (isPatientBarcode && !state.scannedPatientId) {
      setState(prev => ({
        ...prev,
        scannedPatientId: barcode
      }));
    } else if (isMedicationBarcode && !state.scannedMedicationId) {
      const newState = {
        ...state,
        scannedMedicationId: barcode
      };

      // If we have both scans, validate
      if (state.scannedPatientId) {
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
