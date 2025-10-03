import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createAssessment,
  fetchPatientAssessments,
  updateAssessment,
  deleteAssessment,
  PatientAssessment 
} from '../../lib/assessmentService';
import { WoundCareService } from '../../lib/woundCareService';
import { WoundAssessment } from '../../types';
import { queryKeys } from '../../lib/queryClient';

// ========================================
// 📋 ASSESSMENT QUERY HOOKS
// ========================================

/**
 * Fetch assessments for a patient with smart caching
 * Replaces manual assessment fetching from components
 */
export function usePatientAssessments(patientId: string) {
  return useQuery({
    queryKey: queryKeys.patientAssessments(patientId),
    queryFn: () => fetchPatientAssessments(patientId),
    staleTime: 3 * 60 * 1000, // 3 minutes - assessment data changes moderately
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    enabled: !!patientId,
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error?.message?.includes('permission denied')) return false;
      return failureCount < 2;
    },
    placeholderData: [],
  });
}

/**
 * Get assessments by type for focused views
 * Useful for specialized assessment workflows
 */
export function useAssessmentsByType(patientId: string, assessmentType?: 'physical' | 'pain' | 'neurological') {
  const { data: assessments = [], isLoading, error } = usePatientAssessments(patientId);
  
  const filteredAssessments = assessmentType 
    ? assessments.filter(assessment => assessment.assessment_type === assessmentType)
    : assessments;
    
  const counts = {
    physical: assessments.filter(a => a.assessment_type === 'physical').length,
    pain: assessments.filter(a => a.assessment_type === 'pain').length,
    neurological: assessments.filter(a => a.assessment_type === 'neurological').length,
    total: assessments.length,
  };
  
  return {
    assessments: filteredAssessments,
    counts,
    isLoading,
    error,
    latestAssessment: filteredAssessments[0], // Assuming sorted by date desc
  };
}

/**
 * Get recent assessments for dashboard summary
 * Shows latest assessment activity
 */
export function useRecentAssessments(patientId: string, limit = 5) {
  const { data: assessments = [] } = usePatientAssessments(patientId);
  
  return {
    assessments: assessments.slice(0, limit),
    hasMore: assessments.length > limit,
    count: assessments.length,
  };
}

// ========================================
// 🩹 WOUND CARE QUERY HOOKS
// ========================================

/**
 * Fetch wounds for a patient with smart caching
 * Critical for wound care monitoring
 */
export function usePatientWounds(patientId: string) {
  return useQuery({
    queryKey: queryKeys.patientWounds(patientId),
    queryFn: () => fetchPatientWounds(patientId),
    staleTime: 2 * 60 * 1000, // 2 minutes - wound data needs regular updates
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
    enabled: !!patientId,
    retry: (failureCount, error) => {
      if (error?.message?.includes('permission denied')) return false;
      return failureCount < 3;
    },
    placeholderData: [],
  });
}

/**
 * Get wounds by healing progress for monitoring
 * Critical for wound care alerts and prioritization
 */
export function useWoundsByProgress(patientId: string) {
  const { data: wounds = [], isLoading, error } = usePatientWounds(patientId);
  
  const woundsByProgress = {
    improving: wounds.filter(w => w.healingProgress === 'Improving'),
    stable: wounds.filter(w => w.healingProgress === 'Stable'),
    deteriorating: wounds.filter(w => w.healingProgress === 'Deteriorating'),
    new: wounds.filter(w => w.healingProgress === 'New'),
  };
  
  const counts = {
    improving: woundsByProgress.improving.length,
    stable: woundsByProgress.stable.length,
    deteriorating: woundsByProgress.deteriorating.length,
    new: woundsByProgress.new.length,
    total: wounds.length,
    critical: woundsByProgress.deteriorating.length + woundsByProgress.new.length,
  };
  
  return {
    wounds: woundsByProgress,
    counts,
    isLoading,
    error,
    criticalWounds: [...woundsByProgress.deteriorating, ...woundsByProgress.new],
  };
}

/**
 * Get wounds by body view for assessment interface
 * Useful for body diagram visualization
 */
export function useWoundsByView(patientId: string, view?: 'anterior' | 'posterior') {
  const { data: wounds = [] } = usePatientWounds(patientId);
  
  const filteredWounds = view 
    ? wounds.filter(wound => wound.view === view)
    : wounds;
    
  return {
    wounds: filteredWounds,
    anteriorCount: wounds.filter(w => w.view === 'anterior').length,
    posteriorCount: wounds.filter(w => w.view === 'posterior').length,
  };
}

// ========================================
// 📋 ASSESSMENT MUTATIONS
// ========================================

/**
 * Create new assessment with optimistic updates
 * Replaces manual assessment creation
 */
export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessment: Omit<PatientAssessment, 'id'>) => createAssessment(assessment),
    onMutate: async (newAssessment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientAssessments(newAssessment.patient_id) 
      });
      
      // Snapshot previous value
      const previousAssessments = queryClient.getQueryData<PatientAssessment[]>(
        queryKeys.patientAssessments(newAssessment.patient_id)
      );
      
      // Optimistically add new assessment
      const optimisticAssessment: PatientAssessment = {
        ...newAssessment,
        id: `temp-${Date.now()}`,
        assessment_date: new Date().toISOString(),
      };
      
      queryClient.setQueryData<PatientAssessment[]>(
        queryKeys.patientAssessments(newAssessment.patient_id),
        (old = []) => [optimisticAssessment, ...old]
      );
      
      return { previousAssessments };
    },
    onError: (error, newAssessment, context) => {
      // Rollback on error
      if (context?.previousAssessments) {
        queryClient.setQueryData(
          queryKeys.patientAssessments(newAssessment.patient_id),
          context.previousAssessments
        );
      }
      console.error('❌ Failed to create assessment:', error);
    },
    onSuccess: (data, variables) => {
      console.log(`✅ ${data.assessment_type} assessment created successfully`);
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.patientAssessments(variables.patient_id) 
      });
    },
  });
}

/**
 * Update assessment with optimistic updates
 * Handles assessment modifications
 */
export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assessmentId, updates }: { assessmentId: string; updates: Partial<PatientAssessment> }) =>
      updateAssessment(assessmentId, updates),
    onMutate: async ({ assessmentId, updates }) => {
      // Find the patient ID from existing data
      const allQueries = queryClient.getQueriesData<PatientAssessment[]>({
        predicate: (query) => query.queryKey[0] === 'patients' && query.queryKey[2] === 'assessments'
      });
      
      let patientId: string | undefined;
      for (const [queryKey, assessments] of allQueries) {
        if (assessments) {
          const assessment = assessments.find(a => a.id === assessmentId);
          if (assessment) {
            patientId = assessment.patient_id;
            break;
          }
        }
      }
      
      if (!patientId) return { previousAssessments: [] };
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientAssessments(patientId) 
      });
      
      // Snapshot previous value
      const previousAssessments = queryClient.getQueryData<PatientAssessment[]>(
        queryKeys.patientAssessments(patientId)
      );
      
      // Optimistically update assessment
      queryClient.setQueryData<PatientAssessment[]>(
        queryKeys.patientAssessments(patientId),
        (old = []) => old.map(assessment => 
          assessment.id === assessmentId 
            ? { ...assessment, ...updates }
            : assessment
        )
      );
      
      return { previousAssessments, patientId };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousAssessments && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientAssessments(context.patientId),
          context.previousAssessments
        );
      }
      console.error('❌ Failed to update assessment:', error);
    },
    onSuccess: (data) => {
      console.log(`✅ ${data.assessment_type} assessment updated successfully`);
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientAssessments(context.patientId) 
        });
      }
    },
  });
}

/**
 * Delete assessment with optimistic updates
 * Handles assessment removal
 */
export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessmentId: string) => deleteAssessment(assessmentId),
    onMutate: async (assessmentId) => {
      // Find the patient ID and assessment from existing data
      const allQueries = queryClient.getQueriesData<PatientAssessment[]>({
        predicate: (query) => query.queryKey[0] === 'patients' && query.queryKey[2] === 'assessments'
      });
      
      let patientId: string | undefined;
      let assessmentToDelete: PatientAssessment | undefined;
      
      for (const [queryKey, assessments] of allQueries) {
        if (assessments) {
          assessmentToDelete = assessments.find(a => a.id === assessmentId);
          if (assessmentToDelete) {
            patientId = assessmentToDelete.patient_id;
            break;
          }
        }
      }
      
      if (!patientId) return { previousAssessments: [] };
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientAssessments(patientId) 
      });
      
      // Snapshot previous value
      const previousAssessments = queryClient.getQueryData<PatientAssessment[]>(
        queryKeys.patientAssessments(patientId)
      );
      
      // Optimistically remove assessment
      queryClient.setQueryData<PatientAssessment[]>(
        queryKeys.patientAssessments(patientId),
        (old = []) => old.filter(assessment => assessment.id !== assessmentId)
      );
      
      return { previousAssessments, patientId, assessmentToDelete };
    },
    onError: (error, assessmentId, context) => {
      // Rollback on error
      if (context?.previousAssessments && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientAssessments(context.patientId),
          context.previousAssessments
        );
      }
      console.error('❌ Failed to delete assessment:', error);
    },
    onSuccess: (data, assessmentId, context) => {
      console.log(`✅ ${context?.assessmentToDelete?.assessment_type} assessment deleted successfully`);
    },
    onSettled: (data, error, assessmentId, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientAssessments(context.patientId) 
        });
      }
    },
  });
}

// ========================================
// 🩹 WOUND CARE MUTATIONS
// ========================================

/**
 * Create new wound with optimistic updates
 * Critical for wound documentation workflow
 */
export function useCreateWound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wound, patientId }: { wound: WoundUI; patientId: string }) => 
      createWound(wound, patientId),
    onMutate: async ({ wound, patientId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientWounds(patientId) 
      });
      
      // Snapshot previous value
      const previousWounds = queryClient.getQueryData<WoundUI[]>(
        queryKeys.patientWounds(patientId)
      );
      
      // Optimistically add new wound
      const optimisticWound: WoundUI = {
        ...wound,
        id: `temp-${Date.now()}`,
        assessmentDate: new Date().toISOString(),
      };
      
      queryClient.setQueryData<WoundUI[]>(
        queryKeys.patientWounds(patientId),
        (old = []) => [optimisticWound, ...old]
      );
      
      return { previousWounds };
    },
    onError: (error, { patientId }, context) => {
      // Rollback on error
      if (context?.previousWounds) {
        queryClient.setQueryData(
          queryKeys.patientWounds(patientId),
          context.previousWounds
        );
      }
      console.error('❌ Failed to create wound:', error);
    },
    onSuccess: (data, { patientId }) => {
      console.log(`✅ Wound "${data.location}" created successfully`);
    },
    onSettled: (data, error, { patientId }) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.patientWounds(patientId) 
      });
    },
  });
}

/**
 * Update wound with optimistic updates
 * Handles wound progress tracking
 */
export function useUpdateWound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ woundId, updates }: { woundId: string; updates: Partial<WoundUI> }) =>
      updateWound(woundId, updates),
    onMutate: async ({ woundId, updates }) => {
      // Find the patient ID from existing data
      const allQueries = queryClient.getQueriesData<WoundUI[]>({
        predicate: (query) => query.queryKey[0] === 'patients' && query.queryKey[2] === 'wounds'
      });
      
      let patientId: string | undefined;
      for (const [queryKey, wounds] of allQueries) {
        if (wounds && wounds.some(w => w.id === woundId)) {
          // Extract patient ID from query key
          patientId = queryKey[1] as string;
          break;
        }
      }
      
      if (!patientId) return { previousWounds: [] };
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientWounds(patientId) 
      });
      
      // Snapshot previous value
      const previousWounds = queryClient.getQueryData<WoundUI[]>(
        queryKeys.patientWounds(patientId)
      );
      
      // Optimistically update wound
      queryClient.setQueryData<WoundUI[]>(
        queryKeys.patientWounds(patientId),
        (old = []) => old.map(wound => 
          wound.id === woundId 
            ? { ...wound, ...updates }
            : wound
        )
      );
      
      return { previousWounds, patientId };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousWounds && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientWounds(context.patientId),
          context.previousWounds
        );
      }
      console.error('❌ Failed to update wound:', error);
    },
    onSuccess: (data) => {
      console.log(`✅ Wound "${data.location}" updated successfully`);
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientWounds(context.patientId) 
        });
      }
    },
  });
}

/**
 * Delete wound with optimistic updates
 * Handles wound removal from documentation
 */
export function useDeleteWound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (woundId: string) => deleteWound(woundId),
    onMutate: async (woundId) => {
      // Find the patient ID and wound from existing data
      const allQueries = queryClient.getQueriesData<WoundUI[]>({
        predicate: (query) => query.queryKey[0] === 'patients' && query.queryKey[2] === 'wounds'
      });
      
      let patientId: string | undefined;
      let woundToDelete: WoundUI | undefined;
      
      for (const [queryKey, wounds] of allQueries) {
        if (wounds) {
          woundToDelete = wounds.find(w => w.id === woundId);
          if (woundToDelete) {
            patientId = queryKey[1] as string;
            break;
          }
        }
      }
      
      if (!patientId) return { previousWounds: [] };
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patientWounds(patientId) 
      });
      
      // Snapshot previous value
      const previousWounds = queryClient.getQueryData<WoundUI[]>(
        queryKeys.patientWounds(patientId)
      );
      
      // Optimistically remove wound
      queryClient.setQueryData<WoundUI[]>(
        queryKeys.patientWounds(patientId),
        (old = []) => old.filter(wound => wound.id !== woundId)
      );
      
      return { previousWounds, patientId, woundToDelete };
    },
    onError: (error, woundId, context) => {
      // Rollback on error
      if (context?.previousWounds && context?.patientId) {
        queryClient.setQueryData(
          queryKeys.patientWounds(context.patientId),
          context.previousWounds
        );
      }
      console.error('❌ Failed to delete wound:', error);
    },
    onSuccess: (data, woundId, context) => {
      console.log(`✅ Wound "${context?.woundToDelete?.location}" deleted successfully`);
    },
    onSettled: (data, error, woundId, context) => {
      // Always refetch to ensure data consistency
      if (context?.patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.patientWounds(context.patientId) 
        });
      }
    },
  });
}
