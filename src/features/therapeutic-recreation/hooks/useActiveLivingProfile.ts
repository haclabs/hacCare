import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { TRActiveLivingProfile } from '../types';

type ALPInput = Omit<TRActiveLivingProfile, 'id' | 'created_at' | 'updated_at'>;

async function fetchActiveLivingProfile(
  patientId: string,
  tenantId: string,
): Promise<TRActiveLivingProfile | null> {
  const { data, error } = await supabase
    .from('tr_active_living_profiles')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertActiveLivingProfile(
  input: ALPInput,
): Promise<TRActiveLivingProfile> {
  const { data: existing } = await supabase
    .from('tr_active_living_profiles')
    .select('id')
    .eq('patient_id', input.patient_id)
    .eq('tenant_id', input.tenant_id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('tr_active_living_profiles')
      .update({ narrative: input.narrative, recorded_by: input.recorded_by, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('tr_active_living_profiles')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useActiveLivingProfile(patientId: string, tenantId: string) {
  return useQuery({
    queryKey: queryKeys.trActiveLivingProfile(patientId, tenantId),
    queryFn: () => fetchActiveLivingProfile(patientId, tenantId),
    enabled: !!patientId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveActiveLivingProfile(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ALPInput) => upsertActiveLivingProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trActiveLivingProfile(patientId, tenantId),
      });
    },
  });

  return {
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}
