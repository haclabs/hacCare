import { useState, useEffect } from 'react';
import { fetchDoctorsOrders } from '../services/clinical/doctorsOrdersService';
import { secureLogger } from '../lib/security/secureLogger';
import { useTenant } from '../contexts/TenantContext';

// Orders can be held back until N minutes into a simulation (released by RLS), so the
// badge has to re-check on a timer there or students would not see a new order arrive.
const SIMULATION_POLL_MS = 30_000;

export const useDoctorsOrdersAlert = (patientId: string, refreshTrigger?: number) => {
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { currentTenant } = useTenant();
  const isSimulationTenant =
    currentTenant?.tenant_type === 'simulation_active' || !!currentTenant?.is_simulation;

  useEffect(() => {
    let cancelled = false;
    const loadUnacknowledgedCount = async (showLoading: boolean) => {
      try {
        if (showLoading) setLoading(true);
        const orders = await fetchDoctorsOrders(patientId);
        const unacknowledgedOrders = orders.filter(order => !order.is_acknowledged);
        if (!cancelled) setUnacknowledgedCount(unacknowledgedOrders.length);
      } catch (error) {
        secureLogger.error('Error loading doctors orders for alert count', error);
        if (!cancelled && showLoading) setUnacknowledgedCount(0);
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    if (!patientId) return;
    loadUnacknowledgedCount(true);
    const interval = isSimulationTenant
      ? setInterval(() => loadUnacknowledgedCount(false), SIMULATION_POLL_MS)
      : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [patientId, refreshTrigger, isSimulationTenant]);

  return { unacknowledgedCount, loading };
};