import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { TRAssessmentScore } from '../types';

type ScoreInput = Omit<TRAssessmentScore, 'id' | 'created_at' | 'updated_at'>;

/** Fetch all scores for this patient+tenant (one row per tool, latest only). */
async function fetchAllAssessmentScores(
  patientId: string,
  tenantId: string,
): Promise<TRAssessmentScore[]> {
  const { data, error } = await supabase
    .from('tr_assessment_scores')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Fetch the latest entry for a specific tool. */
async function fetchLatestToolScore(
  patientId: string,
  tenantId: string,
  toolName: string,
): Promise<TRAssessmentScore | null> {
  const { data, error } = await supabase
    .from('tr_assessment_scores')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .eq('tool_name', toolName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Always INSERT a new score row — history is preserved. */
async function insertAssessmentScore(
  input: ScoreInput,
): Promise<TRAssessmentScore> {
  const { data, error } = await supabase
    .from('tr_assessment_scores')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** All scores for this patient — used by Card 3, Card 4, and LAS summary. */
export function useAllAssessmentScores(patientId: string, tenantId: string) {
  const query = useQuery({
    queryKey: queryKeys.trAssessmentScores(patientId, tenantId),
    queryFn: () => fetchAllAssessmentScores(patientId, tenantId),
    enabled: !!patientId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const scores = query.data ?? [];

  /** Returns the latest baseline row for a given tool (pre-seeded instructor data). */
  const getBaseline = (toolName: string): TRAssessmentScore | undefined =>
    scores.find((s) => s.tool_name === toolName && s.is_baseline);

  /** Returns the latest student-entered row for a given tool. */
  const getStudentEntry = (toolName: string): TRAssessmentScore | undefined =>
    scores.find((s) => s.tool_name === toolName && !s.is_baseline);

  return { ...query, scores, getBaseline, getStudentEntry };
}

/** Latest entry for a single tool — used when you only need one tool. */
export function useLatestToolScore(
  patientId: string,
  tenantId: string,
  toolName: string,
) {
  return useQuery({
    queryKey: queryKeys.trAssessmentScore(patientId, tenantId, toolName),
    queryFn: () => fetchLatestToolScore(patientId, tenantId, toolName),
    enabled: !!patientId && !!tenantId && !!toolName,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveAssessmentScore(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ScoreInput) => insertAssessmentScore(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trAssessmentScores(patientId, tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trAssessmentScore(patientId, tenantId, variables.tool_name),
      });
    },
  });

  return {
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}
