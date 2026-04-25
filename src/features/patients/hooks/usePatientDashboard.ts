/**
 * usePatientDashboard
 *
 * React Query hook that replaces the manual useEffect / refresh-trigger / setState
 * pattern in ModularPatientDashboard for patient load, unacknowledged labs count,
 * and unacknowledged handover notes count.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchPatientById } from '../../../services/patient/patientService';
import { fetchPatientMedications } from '../../../services/clinical/medicationService';
import { hasUnacknowledgedLabs } from '../../../services/clinical/labService';
import { getPatientHandoverNotes } from '../../../services/patient/handoverService';
import { useTenant } from '../../../contexts/TenantContext';
import { secureLogger } from '../../../lib/security/secureLogger';

export function usePatientDashboard(patientId: string | undefined) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // ─── Main patient + medications (combined fetch) ───────────────────────────
  const { data: patient = null, isLoading, error } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;

      const [patientData, medicationsData] = await Promise.all([
        fetchPatientById(patientId),
        fetchPatientMedications(patientId).catch((err) => {
          secureLogger.warn('Failed to fetch medications:', err);
          return [];
        }),
      ]);

      if (!patientData) return null;

      secureLogger.debug(`Patient loaded with ${medicationsData.length} medications`);
      return { ...patientData, medications: medicationsData };
    },
    enabled: !!patientId,
  });

  // ─── Unacknowledged labs badge ─────────────────────────────────────────────
  const { data: unacknowledgedLabsCount = 0 } = useQuery({
    queryKey: ['labs-unacked', patientId, currentTenant?.id],
    queryFn: async () => {
      if (!patientId || !currentTenant?.id) return 0;
      const { hasUnacked } = await hasUnacknowledgedLabs(patientId, currentTenant.id);
      return hasUnacked ? 1 : 0;
    },
    enabled: !!patientId && !!currentTenant?.id,
  });

  // ─── Unacknowledged handover notes badge ───────────────────────────────────
  const { data: unacknowledgedHandoverCount = 0 } = useQuery({
    queryKey: ['handover-unacked', patientId],
    queryFn: async () => {
      if (!patientId) return 0;
      const notes = await getPatientHandoverNotes(patientId);
      return notes.filter(note => !note.acknowledged_by).length;
    },
    enabled: !!patientId,
  });

  // ─── Invalidation helpers (called by action handlers in the component) ─────
  const invalidatePatient = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
  }, [queryClient, patientId]);

  const invalidateLabsCount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['labs-unacked', patientId, currentTenant?.id] });
  }, [queryClient, patientId, currentTenant?.id]);

  const invalidateHandoverCount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['handover-unacked', patientId] });
  }, [queryClient, patientId]);

  return {
    patient,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load patient') : null,
    unacknowledgedLabsCount,
    unacknowledgedHandoverCount,
    invalidatePatient,
    invalidateLabsCount,
    invalidateHandoverCount,
  };
}
