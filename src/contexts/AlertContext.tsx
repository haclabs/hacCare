import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchActiveAlerts, acknowledgeAlert as acknowledgeAlertService, runAlertChecks } from '../lib/alertService';
import { useAuth } from './AuthContext';
import { Alert } from '../types'; 
import { supabase } from '../lib/supabase';

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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { user } = useAuth();

  const unreadCount = alerts.filter(alert => !alert.acknowledged).length;

  const refreshAlerts = async () => {
    try {
      setLoading(true);
      const refreshTime = new Date().toISOString();
      console.log('Refreshing alerts at:', refreshTime);
      setError(null);
      const fetchedAlerts = await fetchActiveAlerts();
      
      // Log each alert for debugging
      fetchedAlerts.forEach(alert => {
        console.log(`Alert: ${alert.type} - ${alert.message} - Priority: ${alert.priority} - Acknowledged: ${alert.acknowledged} - Timestamp: ${alert.timestamp}`);
      });
      
      console.log(`Fetched ${fetchedAlerts.length} active alerts`);
      setAlerts(fetchedAlerts);
      setLastRefresh(new Date());
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
      const checkStartTime = new Date();
      console.log('Running alert checks at:', checkStartTime.toISOString());
      setError(null);
      await runAlertChecks();
      
      // Wait a short time to ensure database operations complete
      console.log('Alert checks completed, waiting before refresh...');
      setTimeout(async () => {
        console.log('Refreshing alerts after checks');
        await refreshAlerts();
        console.log('Alert refresh completed at:', new Date().toISOString());
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run checks');
      setLoading(false);
    } finally {
      // Loading state is now managed by the setTimeout callback
    }
  };

  useEffect(() => {
    refreshAlerts();
    
    // Set up real-time subscription to alerts table
    const alertsSubscription = supabase
      .channel('alerts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patient_alerts' }, 
        () => {
          console.log('Alert table changed, refreshing alerts');
          refreshAlerts();
        }
      )
      .subscribe();
      
    // Run initial alert checks
    runChecks();
    
    // Set up interval to run checks every 5 minutes
    const checkInterval = setInterval(() => {
      console.log('Running scheduled alert checks');
      runChecks();
    }, 5 * 60 * 1000);
    
    return () => {
      alertsSubscription.unsubscribe();
      clearInterval(checkInterval);
    };
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