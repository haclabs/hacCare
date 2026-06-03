import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { TRInterdisciplinaryInterp } from '../types';

type InterpInput = Omit<TRInterdisciplinaryInterp, 'id' | 'created_at' | 'updated_at'>;

async function fetchAllInterpretations(
  patientId: string,
  tenantId: string,
): Promise<TRInterdisciplinaryInterp[]> {
  const { data, error } = await supabase
    .from('tr_interdisciplinary_interps')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Upsert — one interpretation per score_group per patient per tenant. */
async function upsertInterpretation(
  input: InterpInput,
): Promise<TRInterdisciplinaryInterp> {
  const { data: existing } = await supabase
    .from('tr_interdisciplinary_interps')
    .select('id')
    .eq('patient_id', input.patient_id)
    .eq('tenant_id', input.tenant_id)
    .eq('score_group', input.score_group)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('tr_interdisciplinary_interps')
      .update({
        interpretation: input.interpretation,
        recorded_by: input.recorded_by,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('tr_interdisciplinary_interps')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useTRInterpretations(patientId: string, tenantId: string) {
  const query = useQuery({
    queryKey: queryKeys.trInterpretations(patientId, tenantId),
    queryFn: () => fetchAllInterpretations(patientId, tenantId),
    enabled: !!patientId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const getInterp = (
    scoreGroup: 'berg' | 'rai_mds' | 'fitness',
  ): string => {
    const found = query.data?.find((i) => i.score_group === scoreGroup);
    return found?.interpretation ?? '';
  };

  return { ...query, getInterp };
}

export function useSaveTRInterpretation(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: InterpInput) => upsertInterpretation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trInterpretations(patientId, tenantId),
      });
    },
  });

  return {
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}
