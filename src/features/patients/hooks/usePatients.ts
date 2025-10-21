import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/api/queryClient';
import { 
  fetchPatients, 
  fetchPatientById, 
  createPatient, 
  updatePatient, 
  deletePatient,
  fetchPatientVitals,
  updatePatientVitals,
  fetchPatientNotes,
  createPatientNote,
  updatePatientNote,
  deletePatientNote
} from '../../../services/patient/patientService';
import { fetchPatientMedications } from '../../../services/clinical/medicationService';
import { Patient, VitalSigns, PatientNote } from '../../../types';
import { useTenant } from '../../../contexts/TenantContext';

/**
 * Hook to fetch all patients
 * Replaces the patients state in PatientContext
 * Automatically filters by current tenant for multi-tenant isolation
 * For active simulation tenants, fetches from simulation_patients table
 */
export function usePatients() {
  const { currentTenant } = useTenant();
  
  // For active simulation tenants, use the simulation_id
  const simulationId = currentTenant?.simulation_id;
  
  return useQuery({
    queryKey: [...queryKeys.patients, currentTenant?.id, simulationId],
    queryFn: () => fetchPatients(simulationId, currentTenant?.id), // Pass simulation_id first, then tenant_id
    staleTime: 2 * 60 * 1000, // Patient list is fresh for 2 minutes
    select: (patients) => {
      // Safety check: ensure patients is an array before sorting
      if (!Array.isArray(patients)) {
        console.warn('usePatients: received non-array data:', patients);
        return [];
      }
      // Sort patients by admission date (newest first)
      return patients.sort((a, b) => 
        new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime()
      );
    },
  });
}

/**
 * Hook to fetch a specific patient by ID
 * Includes automatic refetching when patient data becomes stale
 */
export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patient(patientId!),
    queryFn: () => fetchPatientById(patientId!),
    enabled: !!patientId, // Only run query if patientId exists
    staleTime: 3 * 60 * 1000, // Individual patient data is fresh for 3 minutes
  });
}

/**
 * Hook to fetch patient vital signs
 */
export function usePatientVitals(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patientVitals(patientId!),
    queryFn: () => fetchPatientVitals(patientId!),
    enabled: !!patientId,
    staleTime: 30 * 1000, // Vitals are fresh for 30 seconds (critical data)
  });
}

/**
 * Hook to fetch patient notes
 */
export function usePatientNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patientNotes(patientId!),
    queryFn: () => fetchPatientNotes(patientId!),
    enabled: !!patientId,
    staleTime: 1 * 60 * 1000, // Notes are fresh for 1 minute
  });
}

/**
 * Hook to fetch patient medications
 */
export function usePatientMedications(patientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patientMedications(patientId!),
    queryFn: () => fetchPatientMedications(patientId!),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000, // Medications are fresh for 2 minutes
  });
}

/**
 * Mutation hook to create a new patient
 * Includes automatic cache updates
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPatient,
    onSuccess: (newPatient) => {
      // Add the new patient to the patients list cache
      queryClient.setQueryData(queryKeys.patients, (oldPatients: Patient[] = []) => {
        return [newPatient, ...oldPatients];
      });
      
      // Set the individual patient cache
      queryClient.setQueryData(queryKeys.patient(newPatient.id), newPatient);
      
      // Invalidate patients list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
    onError: (error) => {
      console.error('Failed to create patient:', error);
    },
  });
}

/**
 * Mutation hook to update a patient
 * Uses optimistic updates for better UX
 */
export function useUpdatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ patientId, updates }: { patientId: string; updates: Partial<Patient> }) => 
      updatePatient({ ...updates, id: patientId } as Patient),
    
    // Optimistic update - update UI immediately
    onMutate: async ({ patientId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.patient(patientId) });
      
      // Snapshot the previous value
      const previousPatient = queryClient.getQueryData(queryKeys.patient(patientId));
      
      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.patient(patientId), (old: Patient | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
      
      // Update the patient in the patients list as well
      queryClient.setQueryData(queryKeys.patients, (oldPatients: Patient[] = []) => {
        return oldPatients.map(patient => 
          patient.id === patientId ? { ...patient, ...updates } : patient
        );
      });
      
      return { previousPatient, patientId };
    },
    
    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousPatient) {
        queryClient.setQueryData(
          queryKeys.patient(context.patientId), 
          context.previousPatient
        );
      }
      console.error('Failed to update patient:', error);
    },
    
    // Always refetch after error or success
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patient(variables.patientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
}

/**
 * Mutation hook to delete a patient
 */
export function useDeletePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePatient,
    onSuccess: (_, patientId) => {
      // Remove patient from patients list
      queryClient.setQueryData(queryKeys.patients, (oldPatients: Patient[] = []) => {
        return oldPatients.filter(patient => patient.id !== patientId);
      });
      
      // Remove individual patient cache
      queryClient.removeQueries({ queryKey: queryKeys.patient(patientId) });
      
      // Remove related data
      queryClient.removeQueries({ queryKey: queryKeys.patientVitals(patientId) });
      queryClient.removeQueries({ queryKey: queryKeys.patientNotes(patientId) });
      queryClient.removeQueries({ queryKey: queryKeys.patientMedications(patientId) });
    },
    onError: (error) => {
      console.error('Failed to delete patient:', error);
    },
  });
}

/**
 * Mutation hook to update patient vitals
 * Uses optimistic updates for immediate feedback
 */
export function useUpdatePatientVitals() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ patientId, vitals }: { patientId: string; vitals: VitalSigns }) =>
      updatePatientVitals(patientId, vitals),
    
    onMutate: async ({ patientId, vitals }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.patientVitals(patientId) });
      
      const previousVitals = queryClient.getQueryData(queryKeys.patientVitals(patientId));
      
      // Optimistically add new vitals to the list
      queryClient.setQueryData(queryKeys.patientVitals(patientId), (old: VitalSigns[] = []) => {
        return [vitals, ...old];
      });
      
      return { previousVitals, patientId };
    },
    
    onError: (error, _variables, context) => {
      if (context?.previousVitals) {
        queryClient.setQueryData(
          queryKeys.patientVitals(context.patientId),
          context.previousVitals
        );
      }
      console.error('Failed to update vitals:', error);
    },
    
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientVitals(variables.patientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patient(variables.patientId) });
    },
  });
}

/**
 * Mutation hook to create a patient note
 */
export function useCreatePatientNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPatientNote,
    onSuccess: (newNote, variables) => {
      // Add note to the notes list
      queryClient.setQueryData(
        queryKeys.patientNotes(variables.patient_id), 
        (oldNotes: PatientNote[] = []) => {
          return [newNote, ...oldNotes];
        }
      );
      
      // Invalidate patient data to update note count
      queryClient.invalidateQueries({ queryKey: queryKeys.patient(variables.patient_id) });
    },
    onError: (error) => {
      console.error('Failed to create note:', error);
    },
  });
}

/**
 * Mutation hook to update a patient note
 */
export function useUpdatePatientNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: Partial<PatientNote> }) =>
      updatePatientNote(noteId, updates),
    
    onSuccess: (updatedNote, variables) => {
      if (!updatedNote?.patient_id) return;
      
      // Update the note in the notes list
      queryClient.setQueryData(
        queryKeys.patientNotes(updatedNote.patient_id),
        (oldNotes: PatientNote[] = []) => {
          return oldNotes.map(note => 
            note.id === variables.noteId ? updatedNote : note
          );
        }
      );
    },
    onError: (error) => {
      console.error('Failed to update note:', error);
    },
  });
}

/**
 * Mutation hook to delete a patient note
 */
export function useDeletePatientNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePatientNote,
    onSuccess: (_, noteId) => {
      // Remove note from all patient notes lists
      queryClient.setQueriesData(
        { queryKey: ['patient'], type: 'active' },
        (oldNotes: PatientNote[] | undefined) => {
          if (!oldNotes) return oldNotes;
          return oldNotes.filter(note => note.id !== noteId);
        }
      );
    },
    onError: (error) => {
      console.error('Failed to delete note:', error);
    },
  });
}

/**
 * Utility hook to refresh all patient data
 * Useful for manual refresh operations
 */
export function useRefreshPatientData() {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
    refreshPatient: (patientId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patient(patientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patientVitals(patientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patientNotes(patientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patientMedications(patientId) });
    },
  };
}
