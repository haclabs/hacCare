import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { TRScreeningEntry } from '../types';

type ScreeningInput = Omit<TRScreeningEntry, 'id' | 'created_at' | 'updated_at'>;

async function fetchLatestScreening(
  patientId: string,
  tenantId: string,
): Promise<TRScreeningEntry | null> {
  const { data, error } = await supabase
    .from('tr_screening_entries')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertScreening(input: ScreeningInput): Promise<TRScreeningEntry> {
  const { data: existing } = await supabase
    .from('tr_screening_entries')
    .select('id')
    .eq('patient_id', input.patient_id)
    .eq('tenant_id', input.tenant_id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('tr_screening_entries')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('tr_screening_entries')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useTRScreening(patientId: string, tenantId: string) {
  return useQuery({
    queryKey: queryKeys.trScreening(patientId, tenantId),
    queryFn: () => fetchLatestScreening(patientId, tenantId),
    enabled: !!patientId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveTRScreening(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ScreeningInput) => upsertScreening(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trScreening(patientId, tenantId),
      });
    },
  });

  return {
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}
