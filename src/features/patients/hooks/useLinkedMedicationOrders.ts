import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../lib/api/queryClient';
import { useTenant } from '../../../contexts/TenantContext';
import {
  fetchLinkedMedicationOrders,
  type LinkedMedicationOrder,
} from '../../../services/clinical/medicationOrderService';

// Held orders are released by the database clock; matches the MAR / orders polling cadence.
const SIMULATION_POLL_MS = 30_000;

/** Medication doctors' orders for a patient, keyed by order_link_key for MAR / BCMA lookups. */
export function useLinkedMedicationOrders(patientId: string, poll = false) {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const query = useQuery({
    queryKey: [...queryKeys.patientMedicationOrders(patientId), tenantId],
    queryFn: () => fetchLinkedMedicationOrders(patientId, tenantId!),
    enabled: !!patientId && !!tenantId,
    staleTime: 30_000,
    refetchInterval: poll ? SIMULATION_POLL_MS : false,
  });

  const byKey = useMemo(
    () => new Map<string, LinkedMedicationOrder>((query.data ?? []).map((o) => [o.order_link_key, o])),
    [query.data]
  );

  return { ordersByKey: byKey, ...query };
}
