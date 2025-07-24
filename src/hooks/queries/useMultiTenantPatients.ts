import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Patient, VitalSigns, PatientNote } from '../../types';
import {
  getPatientsByTenant,
  createPatientWithTenant,
  updatePatientWithTenant,
  deletePatientWithTenant,
  getPatientByIdWithTenant,
  addVitalsWithTenant,
  addPatientNoteWithTenant,
  getTenantPatientStats
} from '../../lib/multiTenantPatientService';
import { useTenant } from '../../contexts/TenantContext';

/**
 * Custom hook for multi-tenant patient operations
 */
export function useMultiTenantPatients() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Get patients for current tenant
  const {
    data: patients = [],
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['patients', currentTenant?.id],
    queryFn: () => currentTenant ? getPatientsByTenant(currentTenant.id) : Promise.resolve({ data: [], error: null }),
    enabled: !!currentTenant,
    select: (response) => response.data || []
  });

  // Get patient stats for current tenant
  const {
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['patientStats', currentTenant?.id],
    queryFn: () => currentTenant ? getTenantPatientStats(currentTenant.id) : Promise.resolve({ data: null, error: null }),
    enabled: !!currentTenant,
    select: (response) => response.data
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (patientData: any) => { // Accept any data, filtering happens in the service
      if (!currentTenant) throw new Error('No tenant selected');
      return createPatientWithTenant(patientData, currentTenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['patientStats', currentTenant?.id] });
    }
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: ({ patientId, updates }: { patientId: string; updates: any }) => { // Accept any updates, filtering happens in the service
      if (!currentTenant) throw new Error('No tenant selected');
      return updatePatientWithTenant(patientId, updates, currentTenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
    }
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: (patientId: string) => {
      if (!currentTenant) throw new Error('No tenant selected');
      return deletePatientWithTenant(patientId, currentTenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['patientStats', currentTenant?.id] });
    }
  });

  // Add vitals mutation
  const addVitalsMutation = useMutation({
    mutationFn: ({ patientId, vitals }: { patientId: string; vitals: Omit<VitalSigns, 'id'> }) => {
      if (!currentTenant) throw new Error('No tenant selected');
      return addVitalsWithTenant(patientId, vitals, currentTenant.id);
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients', currentTenant?.id] });
    }
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: ({ patientId, note }: { patientId: string; note: Omit<PatientNote, 'id' | 'created_at'> }) => {
      if (!currentTenant) throw new Error('No tenant selected');
      return addPatientNoteWithTenant(patientId, note, currentTenant.id);
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients', currentTenant?.id] });
    }
  });

  return {
    // Data
    patients,
    stats,
    
    // Loading states
    isLoading,
    statsLoading,
    
    // Error
    error,
    
    // Actions
    refetch,
    createPatient: createPatientMutation.mutateAsync,
    updatePatient: updatePatientMutation.mutateAsync,
    deletePatient: deletePatientMutation.mutateAsync,
    addVitals: addVitalsMutation.mutateAsync,
    addNote: addNoteMutation.mutateAsync,
    
    // Mutation states
    isCreating: createPatientMutation.isPending,
    isUpdating: updatePatientMutation.isPending,
    isDeleting: deletePatientMutation.isPending,
    isAddingVitals: addVitalsMutation.isPending,
    isAddingNote: addNoteMutation.isPending,
  };
}

/**
 * Custom hook for getting a specific patient by ID with tenant validation
 */
export function useMultiTenantPatient(patientId: string) {
  const { currentTenant } = useTenant();

  return useQuery({
    queryKey: ['patient', patientId, currentTenant?.id],
    queryFn: () => {
      if (!currentTenant || !patientId) {
        return Promise.resolve({ data: null, error: null });
      }
      return getPatientByIdWithTenant(patientId, currentTenant.id);
    },
    enabled: !!currentTenant && !!patientId,
    select: (response) => response.data
  });
}
