import { useState, useCallback } from 'react';
import { transferPatient, PatientTransferOptions, PatientTransferResult } from '../services/patient/patientTransferService';

/**
 * Hook for patient transfer functionality
 */
export const usePatientTransfer = () => {
  const [transferring, setTransferring] = useState(false);
  const [lastResult, setLastResult] = useState<PatientTransferResult | null>(null);

  const transfer = useCallback(async (options: PatientTransferOptions): Promise<PatientTransferResult> => {
    setTransferring(true);
    setLastResult(null);

    try {
      const result = await transferPatient(options);
      setLastResult(result);
      return result;
    } catch (error) {
      const errorResult: PatientTransferResult = {
        success: false,
        message: 'Transfer failed unexpectedly',
        error: (error as Error).message
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setTransferring(false);
    }
  }, []);

  const movePatient = useCallback(async (
    patientId: string, 
    targetTenantId: string,
    options: Partial<PatientTransferOptions> = {}
  ) => {
    return transfer({
      sourcePatientId: patientId,
      targetTenantId,
      preserveOriginal: false,
      transferNotes: true,
      transferVitals: true,
      transferMedications: true,
      transferAssessments: true,
      ...options
    });
  }, [transfer]);

  const duplicatePatient = useCallback(async (
    patientId: string, 
    targetTenantId: string,
    newPatientId?: string,
    options: Partial<PatientTransferOptions> = {}
  ) => {
    return transfer({
      sourcePatientId: patientId,
      targetTenantId,
      preserveOriginal: true,
      newPatientId,
      transferNotes: true,
      transferVitals: true,
      transferMedications: true,
      transferAssessments: true,
      ...options
    });
  }, [transfer]);

  return {
    transfer,
    movePatient,
    duplicatePatient,
    transferring,
    lastResult,
    clearResult: () => setLastResult(null)
  };
};