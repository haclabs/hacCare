import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { TRProgressNote } from '../types';

type NoteInput = Omit<TRProgressNote, 'id' | 'created_at'>;

async function fetchProgressNotes(
  patientId: string,
  tenantId: string,
): Promise<TRProgressNote[]> {
  const { data, error } = await supabase
    .from('tr_progress_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

async function insertProgressNote(input: NoteInput): Promise<TRProgressNote> {
  const { data, error } = await supabase
    .from('tr_progress_notes')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useProgressNotes(patientId: string, tenantId: string) {
  return useQuery({
    queryKey: queryKeys.trProgressNotes(patientId, tenantId),
    queryFn: () => fetchProgressNotes(patientId, tenantId),
    enabled: !!patientId && !!tenantId,
    staleTime: 0,
  });
}

export function useSaveProgressNote(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: NoteInput) => insertProgressNote(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trProgressNotes(patientId, tenantId),
      });
    },
  });

  return {
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
