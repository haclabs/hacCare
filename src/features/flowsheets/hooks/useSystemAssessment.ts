/**
 * useSystemAssessment
 *
 * Shared React Query hooks for reading and writing to patient_system_assessments.
 * Every native flowsheet form should use these instead of calling Supabase
 * directly — centralises the query key, stale time, and cache invalidation.
 *
 * Usage inside a form component:
 *
 *   const { latest, isLoading } = useLatestSystemAssessment(
 *     patient.id, tenantId, 'respiratory'
 *   );
 *
 *   const { save, isSaving, error } = useSaveSystemAssessment(
 *     patient.id, tenantId, 'respiratory'
 *   );
 *
 *   // On form submit:
 *   await save({ ...payload, patient_id: patient.id, tenant_id: tenantId, system_type: 'respiratory' });
 *   onSaved(); // hub returns to grid
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { queryKeys } from '../../../lib/api/queryClient';
import type { SaveSystemAssessmentInput, SystemAssessmentRow } from '../types';

// ── Private fetchers (not exported — use hooks below) ─────────────────────────

async function fetchLatestSystemAssessment(
  patientId: string,
  tenantId: string,
  systemType: string,
): Promise<SystemAssessmentRow | null> {
  const { data, error } = await supabase
    .from('patient_system_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .eq('system_type', systemType)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function insertSystemAssessment(
  input: SaveSystemAssessmentInput,
): Promise<SystemAssessmentRow> {
  const { data, error } = await supabase
    .from('patient_system_assessments')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Public hooks ──────────────────────────────────────────────────────────────

/**
 * Fetches the most-recent assessment entry for a given patient + system_type.
 * Returns `null` when the patient has no prior entry (first-time form open).
 *
 * Stale time: 5 minutes — assessments don't change frequently mid-session.
 */
export function useLatestSystemAssessment(
  patientId: string,
  tenantId: string,
  systemType: string,
) {
  return useQuery({
    queryKey: queryKeys.systemAssessment(patientId, tenantId, systemType),
    queryFn: () => fetchLatestSystemAssessment(patientId, tenantId, systemType),
    enabled: !!patientId && !!tenantId && !!systemType,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation for inserting a new system assessment row.
 * On success, invalidates the latest-assessment query so the form immediately
 * reflects the saved state if the user opens it again.
 *
 * Returns { save, isSaving, error } — call `save(payload)` on submit.
 */
export function useSaveSystemAssessment(
  patientId: string,
  tenantId: string,
  systemType: string,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: SaveSystemAssessmentInput) => insertSystemAssessment(input),
    onSuccess: () => {
      // Invalidate both the specific entry and the broader per-patient list so
      // any "lastRecorded" timestamps in the hub grid also refresh.
      queryClient.invalidateQueries({
        queryKey: queryKeys.systemAssessment(patientId, tenantId, systemType),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.systemAssessments(patientId, tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.systemAssessmentHistory(patientId, tenantId, systemType),
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

// ── History hook ──────────────────────────────────────────────────────────────

async function fetchSystemAssessmentHistory(
  patientId: string,
  tenantId: string,
  systemType: string,
): Promise<SystemAssessmentRow[]> {
  const { data, error } = await supabase
    .from('patient_system_assessments')
    .select('id, patient_id, tenant_id, system_type, assessment_data, nurse_id, nurse_name, is_baseline, recorded_at, created_at')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .eq('system_type', systemType)
    .eq('is_baseline', false)
    .order('recorded_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches all non-baseline assessment entries for a given patient + system_type,
 * newest first. Used to render the history strip at the top of each form.
 *
 * Stale time: 0 — always fresh so new entries appear immediately after save.
 */
export function useSystemAssessmentHistory(
  patientId: string,
  tenantId: string,
  systemType: string,
) {
  return useQuery({
    queryKey: queryKeys.systemAssessmentHistory(patientId, tenantId, systemType),
    queryFn: () => fetchSystemAssessmentHistory(patientId, tenantId, systemType),
    enabled: !!patientId && !!tenantId && !!systemType,
    staleTime: 0,
  });
}
