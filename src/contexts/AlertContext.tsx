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
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [initialized, setInitialized] = useState(false);
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
      
      if (!fetchedAlerts || fetchedAlerts.length === 0) {
        // If no alerts from database, use mock data
        console.log('No alerts found in database, using mock data');
        import('../data/mockData').then(({ mockAlerts }) => {
          setAlerts(mockAlerts);
          console.log(`✅ Loaded ${mockAlerts.length} mock alerts`);
        });
        return;
      }
      
      // Deduplicate alerts based on message and patient
      const uniqueAlerts = deduplicateAlerts(fetchedAlerts);
      
      setAlerts(uniqueAlerts);
      console.log(`✅ Loaded ${uniqueAlerts.length} alerts (after deduplication)`);
    } catch (err: any) {
      console.error('❌ Error loading alerts:', err);
      setError(err.message || 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deduplicate alerts based on message and patient
   * This prevents multiple alerts with the same content
   */
  const deduplicateAlerts = (alertList: Alert[]): Alert[] => {
    const uniqueMap = new Map<string, Alert>();
    
    // Sort by timestamp (newest first) so we keep the most recent alert when duplicates exist
    const sortedAlerts = [...alertList].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Use patient+type+message as a unique key
    sortedAlerts.forEach(alert => {
      const key = `${alert.patientId}-${alert.type}-${alert.message}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, alert);
      }
    });
    
    return Array.from(uniqueMap.values());
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

      // Only run checks if it's been at least 2 minutes since the last check
      const now = new Date();
      const timeSinceLastCheck = now.getTime() - lastCheckTime.getTime();
      const twoMinutesMs = 2 * 60 * 1000;
      
      if (timeSinceLastCheck < twoMinutesMs) {
        console.log(`🕒 Skipping alert check - last check was ${Math.round(timeSinceLastCheck / 1000)} seconds ago`);
        return;
      }
      
      console.log('🔄 Running manual alert checks...');
      await runAlertChecks();
      setLastCheckTime(now);
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
    loadAlerts().then(() => setInitialized(true));

    // Set up real-time subscription
    const subscription = subscribeToAlerts((updatedAlerts) => {
      console.log('🔔 Received real-time alert update');
      // Apply deduplication to real-time updates as well
      const uniqueAlerts = deduplicateAlerts(updatedAlerts);
      setAlerts(uniqueAlerts);
    });

    // Set up periodic alert checks (every 5 minutes)
    const alertCheckInterval = setInterval(async () => {
      console.log('⏰ Running scheduled alert checks...');
      try {
        await runAlertChecks();
        setLastCheckTime(new Date());
        await loadAlerts();
      } catch (error) {
        console.error('Error in scheduled alert checks:', error);
      }
    }, 5 * 60 * 1000);

    // Set up periodic cleanup (every hour)
    const cleanupInterval = setInterval(async () => {
      console.log('🧹 Running scheduled cleanup...');
      try {
        await cleanupExpiredAlerts();
        await loadAlerts();
      } catch (error) {
        console.error('Error in scheduled alert cleanup:', error);
      }
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
  const unreadCount = initialized ? alerts.filter(alert => !alert.acknowledged).length : 0;

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