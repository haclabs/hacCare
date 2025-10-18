import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchPatientMedications, 
  createMedication, 
  updateMedication, 
  deleteMedication,
  recordMedicationAdministration,
  fetchMedicationAdministrationHistory,
  fetchPatientAdministrationHistory24h,
  getPatientByMedicationId,
  updateMedicationNextDue
} from '../../services/clinical/medicationService';
import { Medication, MedicationAdministration } from '../../types';
import { queryKeys } from '../../lib/api/queryClient';

// ========================================
// 💊 MEDICATION QUERY HOOKS
// ========================================

/**
 * Fetch medications for a patient with smart caching
 * Replaces manual medication fetching from components
 */
export function usePatientMedications(patientId: string) {
  return useQuery({
    queryKey: queryKeys.patientMedications(patientId),
    queryFn: () => fetchPatientMedications(patientId),
    staleTime: 2 * 60 * 1000, // 2 minutes - medication data needs regular updates
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
    enabled: !!patientId,
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error?.message?.includes('permission denied')) return false;
      return failureCount < 3;
    },
    // Start with empty array instead of undefined
    placeholderData: [],
  });
}

/**
 * Get medication administration history
 * Useful for tracking patient medication adherence
 */
export function useMedicationHistory(medicationId: string, patientId: string) {
  return useQuery({
    queryKey: ['medication', medicationId, 'history', patientId],
    queryFn: () => fetchMedicationAdministrationHistory(medicationId, patientId),
    staleTime: 1 * 60 * 1000, // 1 minute - history updates frequently
    gcTime: 3 * 60 * 1000,
    enabled: !!medicationId && !!patientId,
    placeholderData: [],
  });
}

/**
 * Look up patient by medication barcode
 * Critical for barcode scanning workflow
 */
export function usePatientByMedicationId(medicationId: string) {
  return useQuery({
    queryKey: ['medication-lookup', medicationId],
    queryFn: () => getPatientByMedicationId(medicationId),
    staleTime: 10 * 60 * 1000, // 10 minutes - barcode lookups don't change often
    gcTime: 15 * 60 * 1000,
    enabled: !!medicationId && medicationId.length > 0,
    retry: 1, // Only retry once for barcode lookups
  });
}

/**
 * Lookup medication by barcode with intelligent retry
 * Essential for barcode scanning workflow in medication administration
 */
export function useMedicationByBarcode(barcode: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['medications', 'barcode', barcode],
    queryFn: async () => {
      if (!barcode) return null;
      
      // Simulate barcode lookup - in real implementation this would call a barcode API
      const mockMedications = [
        { id: 'MED001', name: 'Lisinopril 10mg', barcode: 'MED001' },
        { id: 'MED002', name: 'Metformin 500mg', barcode: 'MED002' },
        { id: 'MED003', name: 'Atorvastatin 20mg', barcode: 'MED003' },
      ];
      
      const found = mockMedications.find(med => med.barcode === barcode);
      if (!found) {
        throw new Error(`Medication with barcode ${barcode} not found`);
      }
      
      return found;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - barcode data is relatively static
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
    enabled: options?.enabled !== false && !!barcode,
    retry: (failureCount, error) => {
      // Don't retry if medication not found
      if (error?.message?.includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Get medications due soon for a patient
 * Derived from patient medications for alerts
 */
export function useDueMedications(patientId: string) {
  const { data: medications = [] } = usePatientMedications(patientId);
  
  const dueMedications = medications.filter(med => {
    if (!med.next_due || med.status !== 'Active') return false;
    
    try {
      const now = new Date();
      const dueTime = new Date(med.next_due);
      const timeDiff = dueTime.getTime() - now.getTime();
      
      // Due within next hour but not overdue
      return timeDiff <= 60 * 60 * 1000 && timeDiff > 0;
    } catch {
      return false;
    }
  });
  
  return {
    medications: dueMedications,
    count: dueMedications.length,
    criticalCount: dueMedications.filter(m => m.category === 'continuous').length,
  };
}

/**
 * Get overdue medications for a patient
 * Critical for patient safety alerts
 * Excludes PRN medications as they are given only as needed
 */
export function useOverdueMedications(patientId: string) {
  const { data: medications = [] } = usePatientMedications(patientId);
  
  const overdueMedications = medications.filter(med => {
    if (!med.next_due || med.status !== 'Active') return false;
    
    // PRN medications are never overdue since they're given only as needed
    if (med.category === 'prn') return false;
    
    try {
      const now = new Date();
      const dueTime = new Date(med.next_due);
      return dueTime.getTime() < now.getTime();
    } catch {
      return false;
    }
  });
  
  return {
    medications: overdueMedications,
    count: overdueMedications.length,
    criticalCount: overdueMedications.filter(m => m.category === 'continuous').length,
  };
}

/**
 * Get medications by category with real-time counts
 * Useful for medication administration tabs
 */
export function useMedicationsByCategory(patientId: string, category?: 'scheduled' | 'prn' | 'continuous') {
  const { data: medications = [], isLoading, error } = usePatientMedications(patientId);
  
  const filteredMedications = category 
    ? medications.filter(med => med.category === category && med.status === 'Active')
    : medications;
    
  const counts = {
    scheduled: medications.filter(m => m.category === 'scheduled' && m.status === 'Active').length,
    prn: medications.filter(m => m.category === 'prn' && m.status === 'Active').length,
    continuous: medications.filter(m => m.category === 'continuous' && m.status === 'Active').length,
    total: medications.length,
  };
  
  return {
    medications: filteredMedications,
    counts,
    isLoading,
    error,
  };
}

// ========================================
// 💊 MEDICATION MUTATIONS
// ========================================

/**
 * Create new medication with optimistic updates
 * Replaces manual medication creation
 */
export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (medication: Omit<Medication, 'id'>) => createMedication(medication),
    onMutate: async (newMedication) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientMedications(newMedication.patient_id!) 
      });
      
      // Snapshot previous value
      const previousMedications = queryClient.getQueryData<Medication[]>(
        queryKeys.patientMedications(newMedication.patient_id!)
      );
      
      // Optimistically add new medication
      const optimisticMedication: Medication = {
        ...newMedication,
        id: `temp-${Date.now()}`,
        patient_id: newMedication.patient_id!,
        status: 'Active',
      } as Medication;
      
      queryClient.setQueryData<Medication[]>(
        queryKeys.patientMedications(newMedication.patient_id!),
        (old = []) => [optimisticMedication, ...old]
      );
      
      return { previousMedications };
    },
    onError: (error, newMedication, context) => {
      // Rollback on error
      if (context?.previousMedications) {
        queryClient.setQueryData(
          queryKeys.patientMedications(newMedication.patient_id!),
          context.previousMedications
        );
      }
      console.error('❌ Failed to create medication:', error);
    },
    onSuccess: (data, _variables) => {
      console.log(`✅ Medication "${data.name}" created successfully`);
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.patientMedications(variables.patient_id!) 
      });
    },
  });
}

/**
 * Update medication with optimistic updates
 * Handles medication modifications
 */
export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ medicationId, updates }: { medicationId: string; updates: Partial<Medication> }) =>
      updateMedication(medicationId, updates),
    onMutate: async ({ medicationId, updates }) => {
      // Find the patient ID from existing data
      const allQueries = queryClient.getQueriesData<Medication[]>({
        queryKey: ['patients']
      });
      
      let patientId: string | undefined;
      for (const [_queryKey, medications] of allQueries) {
        if (medications) {
          const medication = medications.find(m => m.id === medicationId);
          if (medication) {
            patientId = medication.patient_id;
            break;
          }
        }
      }
      
      if (!patientId) return { previousMedications: [] };
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientMedications(patientId) 
      });
      
      // Snapshot previous value
      const previousMedications = queryClient.getQueryData<Medication[]>(
        queryKeys.patientMedications(patientId)
      );
      
      // Optimistically update medication
      queryClient.setQueryData<Medication[]>(
        queryKeys.patientMedications(patientId),
        (old = []) => old.map(med => 
          med.id === medicationId 
            ? { ...med, ...updates }
            : med
        )
      );
      
      return { previousMedications, patientId };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousMedications && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientMedications(context.patientId),
          context.previousMedications
        );
      }
      console.error('❌ Failed to update medication:', error);
    },
    onSuccess: (data) => {
      console.log(`✅ Medication "${data.name}" updated successfully`);
    },
    onSettled: (_data, _error, _variables, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientMedications(context.patientId) 
        });
      }
    },
  });
}

/**
 * Delete medication with optimistic updates
 * Handles medication removal
 */
export function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (medicationId: string) => deleteMedication(medicationId),
    onMutate: async (medicationId) => {
      // Find the patient ID and medication from existing data
      const allQueries = queryClient.getQueriesData<Medication[]>({
        queryKey: ['patients']
      });
      
      let patientId: string | undefined;
      let medicationToDelete: Medication | undefined;
      
      for (const [_queryKey, medications] of allQueries) {
        if (medications) {
          medicationToDelete = medications.find(m => m.id === medicationId);
          if (medicationToDelete) {
            patientId = medicationToDelete.patient_id;
            break;
          }
        }
      }
      
      if (!patientId) return { previousMedications: [] };
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientMedications(patientId) 
      });
      
      // Snapshot previous value
      const previousMedications = queryClient.getQueryData<Medication[]>(
        queryKeys.patientMedications(patientId)
      );
      
      // Optimistically remove medication
      queryClient.setQueryData<Medication[]>(
        queryKeys.patientMedications(patientId),
        (old = []) => old.filter(med => med.id !== medicationId)
      );
      
      return { previousMedications, patientId, medicationToDelete };
    },
    onError: (error, _medicationId, context) => {
      // Rollback on error
      if (context?.previousMedications && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientMedications(context.patientId),
          context.previousMedications
        );
      }
      console.error('❌ Failed to delete medication:', error);
    },
    onSuccess: (_data, _medicationId, context) => {
      console.log(`✅ Medication "${context?.medicationToDelete?.name}" deleted successfully`);
    },
    onSettled: (_data, _error, _medicationId, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientMedications(context.patientId) 
        });
      }
    },
  });
}

/**
 * Record medication administration with optimistic updates
 * Critical for medication adherence tracking
 */
export function useRecordMedicationAdministration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (administration: Omit<MedicationAdministration, 'id'>) =>
      recordMedicationAdministration(administration),
    onMutate: async (administration) => {
      const patientId = administration.patient_id!;
      const medicationId = administration.medication_id!;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientMedications(patientId) 
      });
      
      // Snapshot previous value
      const previousMedications = queryClient.getQueryData<Medication[]>(
        queryKeys.patientMedications(patientId)
      );
      
      // Optimistically update medication last_administered
      queryClient.setQueryData<Medication[]>(
        queryKeys.patientMedications(patientId),
        (old = []) => old.map(med => 
          med.id === medicationId 
            ? { 
                ...med, 
                last_administered: administration.timestamp,
                // Calculate rough next due time (will be corrected by server)
                next_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              }
            : med
        )
      );
      
      return { previousMedications, patientId, medicationId };
    },
    onError: (error, _administration, context) => {
      // Rollback on error
      if (context?.previousMedications && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientMedications(context.patientId),
          context.previousMedications
        );
      }
      console.error('❌ Failed to record medication administration:', error);
    },
    onSuccess: (_data, _administration, context) => {
      console.log(`✅ Medication administration recorded successfully`);
      
      // Invalidate medication history
      if (context?.medicationId && context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: ['medication', context.medicationId, 'history', context.patientId] 
        });
      }
    },
    onSettled: (_data, _error, _administration, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientMedications(context.patientId) 
        });
      }
    },
  });
}

/**
 * Update medication next due time
 * Useful for medication scheduling adjustments
 */
export function useUpdateMedicationNextDue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ medicationId, nextDue }: { medicationId: string; nextDue: string }) =>
      updateMedicationNextDue(medicationId, nextDue),
    onSuccess: (_data, { medicationId }) => {
      // Invalidate all medication queries to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['patients'] 
      });
      console.log(`✅ Medication ${medicationId} next due time updated`);
    },
    onError: (error) => {
      console.error('❌ Failed to update medication next due time:', error);
    },
  });
}

/**
 * Get patient's medication administration history for the last 24 hours
 * Used for MAR history view
 */
export function usePatientAdministrationHistory24h(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId, 'administration-history-24h'],
    queryFn: () => fetchPatientAdministrationHistory24h(patientId),
    staleTime: 2 * 60 * 1000, // 2 minutes - recent administrations
    gcTime: 5 * 60 * 1000,
    enabled: !!patientId,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}
