import { useState, useEffect } from 'react';
import { fetchDoctorsOrders } from '../services/clinical/doctorsOrdersService';
import { secureLogger } from '../lib/security/secureLogger';

export const useDoctorsOrdersAlert = (patientId: string, refreshTrigger?: number) => {
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnacknowledgedCount = async () => {
      try {
        setLoading(true);
        const orders = await fetchDoctorsOrders(patientId);
        const unacknowledgedOrders = orders.filter(order => !order.is_acknowledged);
        setUnacknowledgedCount(unacknowledgedOrders.length);
      } catch (error) {
        secureLogger.error('Error loading doctors orders for alert count', error);
        setUnacknowledgedCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      loadUnacknowledgedCount();
    }
  }, [patientId, refreshTrigger]);

  return { unacknowledgedCount, loading };
};