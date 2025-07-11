import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchActiveAlerts, acknowledgeAlert as acknowledgeAlertService, runAlertChecks } from '../lib/alertService';
import { useAuth } from '../hooks/useAuth';
import { Alert } from '../types'; 
import { supabase, isSupabaseConfigured, checkDatabaseHealth } from '../lib/supabase';

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

export { AlertContext };

export type { AlertContextType };

export interface AlertProviderProps {
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
      // Check if Supabase is configured before attempting to fetch
      if (!isSupabaseConfigured) {
        console.warn('⚠️ Supabase not configured, skipping alert refresh');
        setAlerts([]);
        setError('Database connection not configured. Please check your environment variables.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const refreshTime = new Date().toISOString();
      console.log('Refreshing alerts at:', refreshTime);
      setError(null);
      
      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('⚠️ Database unavailable - cannot fetch alerts');
        setAlerts([]);
        setError('Database connection failed. Please check your Supabase configuration.');
        return;
      }
      
      const fetchedAlerts = await fetchActiveAlerts();
      
      // Log each alert for debugging
      fetchedAlerts.forEach(alert => {
        console.log(`Alert: ${alert.type} - ${alert.message} - Priority: ${alert.priority} - Acknowledged: ${alert.acknowledged} - Timestamp: ${alert.timestamp}`);
      });
      
      console.log(`Fetched ${fetchedAlerts.length} active alerts`);
      setAlerts(fetchedAlerts);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alerts';
      console.error('Error refreshing alerts:', err);
      setError(`Connection error: ${errorMessage}. Please check your Supabase configuration.`);
      // Set empty alerts array on error to prevent undefined state
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('⚠️ Database unavailable - cannot acknowledge alert');
        setError('Database connection failed. Please check your Supabase configuration.');
        return;
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
      // Check if Supabase is configured before running checks
      if (!isSupabaseConfigured) { 
        console.warn('⚠️ Supabase not configured, skipping alert checks');
        setError('Database connection not configured. Please check your environment variables.');
        return;
      }

      setLoading(true);
      const checkTime = new Date().toISOString();
      console.log('Running alert checks at:', checkTime);
      setError(null);
      
      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('⚠️ Database unavailable - cannot run alert checks');
        setError('Database connection failed. Please check your Supabase configuration.');
        return;
      }
      
      await runAlertChecks();
      
      // Wait a short time to ensure database operations complete
      console.log('Alert checks completed at:', new Date().toISOString(), 'waiting before refresh...');
      setTimeout(async () => {
        try {
          console.log('Refreshing alerts after checks');
          await refreshAlerts();
          console.log('Alert refresh completed at:', new Date().toISOString());
        } catch (refreshError) {
          console.error('Error refreshing alerts after checks:', refreshError);
        } finally {
          setLoading(false);
        }
      }, 3000); // Increased delay to ensure database operations complete
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run checks';
      console.error('Alert checks error:', errorMessage);
      setError(`Connection error: ${errorMessage}. Please check your Supabase configuration.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only initialize if Supabase is configured
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured, skipping alert initialization');
      setError('Database connection not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    refreshAlerts();
    
    // Set up real-time subscription to alerts table
    let alertsSubscription: any = null;
    
    try {
      alertsSubscription = supabase
        .channel('alerts-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'patient_alerts' }, 
          () => {
            console.log('Alert table changed, refreshing alerts');
            refreshAlerts();
          }
        )
        .subscribe();
    } catch (subscriptionError) {
      console.error('Failed to set up real-time subscription:', subscriptionError);
      // Continue without real-time updates
    }
      
    // Run initial alert checks
    setTimeout(() => {
      runChecks();
    }, 3000);
    
    // Set up interval to run checks every 5 minutes
    let checkInterval = setInterval(() => {
      console.log('Running scheduled alert checks');
      runChecks();
    }, 5 * 60 * 1000); // Run checks every 5 minutes
    
    return () => {
      if (alertsSubscription) {
        try {
          alertsSubscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from alerts:', error);
        }
      }
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    };
  }, [isSupabaseConfigured]);

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