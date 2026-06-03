import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { TRTreatmentPlanRow, TreatmentPlanDraft } from '../types';

type PlanRowInput = Omit<TRTreatmentPlanRow, 'id' | 'created_at' | 'updated_at'>;

async function fetchTreatmentPlanRows(
  patientId: string,
  tenantId: string,
): Promise<TRTreatmentPlanRow[]> {
  const { data, error } = await supabase
    .from('tr_treatment_plan_rows')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function insertTreatmentPlanRow(
  input: PlanRowInput,
): Promise<TRTreatmentPlanRow> {
  const { data, error } = await supabase
    .from('tr_treatment_plan_rows')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateTreatmentPlanRow(
  id: string,
  updates: Partial<TreatmentPlanDraft>,
): Promise<TRTreatmentPlanRow> {
  const { data, error } = await supabase
    .from('tr_treatment_plan_rows')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteTreatmentPlanRow(id: string): Promise<void> {
  const { error } = await supabase
    .from('tr_treatment_plan_rows')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export function useTreatmentPlan(patientId: string, tenantId: string) {
  return useQuery({
    queryKey: queryKeys.trTreatmentPlan(patientId, tenantId),
    queryFn: () => fetchTreatmentPlanRows(patientId, tenantId),
    enabled: !!patientId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddTreatmentPlanRow(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: PlanRowInput) => insertTreatmentPlanRow(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trTreatmentPlan(patientId, tenantId),
      });
    },
  });
  return { add: mutation.mutateAsync, isAdding: mutation.isPending, error: mutation.error };
}

export function useUpdateTreatmentPlanRow(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TreatmentPlanDraft> }) =>
      updateTreatmentPlanRow(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trTreatmentPlan(patientId, tenantId),
      });
    },
  });
  return { update: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useDeleteTreatmentPlanRow(patientId: string, tenantId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteTreatmentPlanRow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trTreatmentPlan(patientId, tenantId),
      });
    },
  });
  return { remove: mutation.mutateAsync, isRemoving: mutation.isPending };
}
