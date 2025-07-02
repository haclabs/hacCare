import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { 
  fetchActiveAlerts, 
  acknowledgeAlert as acknowledgeAlertDB, 
  runAlertChecks,
  subscribeToAlerts,
  cleanupExpiredAlerts
} from '../lib/alertService';
import { useAuth } from './AuthContext';

/**
 * Alert Context Interface
 * Manages real-time alerts throughout the application
 */
interface AlertContextType {
  alerts: Alert[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  runChecks: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

/**
 * Alert Provider Component
 * Manages real-time alert state and provides alert functions to child components
 */
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Load alerts from database
   */
  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isSupabaseConfigured) {
        console.log('❌ Supabase not configured for alerts');
        setAlerts([]);
        return;
      }

      console.log('🔔 Loading alerts...');
      const fetchedAlerts = await fetchActiveAlerts();
      setAlerts(fetchedAlerts);
      console.log(`✅ Loaded ${fetchedAlerts.length} alerts`);
    } catch (err: any) {
      console.error('❌ Error loading alerts:', err);
      setError(err.message || 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = async (alertId: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      await acknowledgeAlertDB(alertId, user.id);
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (err: any) {
      console.error('❌ Error acknowledging alert:', err);
      setError(err.message || 'Failed to acknowledge alert');
      throw err;
    }
  };

  /**
   * Run alert checks manually
   */
  const runChecks = async () => {
    try {
      if (!isSupabaseConfigured) {
        console.log('❌ Supabase not configured for alert checks');
        return;
      }

      console.log('🔄 Running manual alert checks...');
      await runAlertChecks();
      await loadAlerts(); // Refresh alerts after checks
    } catch (err: any) {
      console.error('❌ Error running alert checks:', err);
      setError(err.message || 'Failed to run alert checks');
    }
  };

  /**
   * Initialize alerts and set up real-time updates
   */
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Initial load
    loadAlerts();

    // Set up real-time subscription
    const subscription = subscribeToAlerts((updatedAlerts) => {
      console.log('🔔 Received real-time alert update');
      setAlerts(updatedAlerts);
    });

    // Set up periodic alert checks (every 5 minutes)
    const alertCheckInterval = setInterval(async () => {
      console.log('⏰ Running scheduled alert checks...');
      await runAlertChecks();
      await loadAlerts();
    }, 5 * 60 * 1000);

    // Set up periodic cleanup (every hour)
    const cleanupInterval = setInterval(async () => {
      console.log('🧹 Running scheduled cleanup...');
      await cleanupExpiredAlerts();
      await loadAlerts();
    }, 60 * 60 * 1000);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up alert subscriptions...');
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(alertCheckInterval);
      clearInterval(cleanupInterval);
    };
  }, [isSupabaseConfigured]);

  // Calculate unread count
  const unreadCount = alerts.filter(alert => !alert.acknowledged).length;

  const value = {
    alerts,
    unreadCount,
    loading,
    error,
    acknowledgeAlert,
    refreshAlerts: loadAlerts,
    runChecks
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
};