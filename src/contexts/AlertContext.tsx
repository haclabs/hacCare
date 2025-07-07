import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchActiveAlerts, acknowledgeAlert as acknowledgeAlertService, runAlertChecks } from '../lib/alertService';
import { useAuth } from './AuthContext';
import { Alert } from '../types';

interface AlertContextType {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  runChecks: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const unreadCount = alerts.filter(alert => !alert.acknowledged).length;

  const refreshAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAlerts = await fetchActiveAlerts();
      setAlerts(fetchedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      await acknowledgeAlertService(alertId, user.id);
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const runChecks = async () => {
    try {
      setLoading(true);
      setError(null);
      await runAlertChecks();
      await refreshAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run checks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAlerts();
  }, []);

  const value: AlertContextType = {
    alerts,
    loading,
    error,
    unreadCount,
    acknowledgeAlert,
    refreshAlerts,
    runChecks,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}