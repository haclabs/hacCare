import { createContext, useState, useEffect, ReactNode } from 'react';
import { fetchActiveAlerts, acknowledgeAlert as acknowledgeAlertService, runAlertChecks } from '../lib/alertService';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from './TenantContext';
import { Alert } from '../types'; 
import { isSupabaseConfigured, checkDatabaseHealth } from '../lib/supabase';
import { filterByTenant } from '../lib/tenantService';

/**
 * Deduplicate alerts based on patient, type, and message similarity
 */
const deduplicateAlerts = (alerts: Alert[]): Alert[] => {
  const alertMap = new Map<string, Alert>();
  
  for (const alert of alerts) {
    // Create a unique key based on patient, type, and core message content
    let messageKey = alert.message;
    
    // For medication alerts, extract medication name for grouping
    if (alert.type === 'Medication Due') {
      const medicationMatch = alert.message.match(/^(OVERDUE: )?([^0-9]+)/);
      messageKey = medicationMatch ? medicationMatch[2].trim() : alert.message;
    }
    
    // For vital signs alerts, extract vital type for grouping
    if (alert.type === 'Vital Signs Alert') {
      const vitalMatch = alert.message.match(/^(Temperature|Blood Pressure|Heart Rate|Oxygen Saturation|Respiratory Rate)/);
      messageKey = vitalMatch ? vitalMatch[1] : alert.message;
    }
    
    const key = `${alert.patientId}-${alert.type}-${messageKey}`;
    
    // Keep the most recent alert for each unique key
    if (!alertMap.has(key) || new Date(alert.timestamp) > new Date(alertMap.get(key)!.timestamp)) {
      alertMap.set(key, alert);
    }
  }
  
  return Array.from(alertMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

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
  // Removed unused lastRefresh state
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const { user } = useAuth();
  const { currentTenant, isMultiTenantAdmin, selectedTenantId } = useTenant();

  const unreadCount = alerts.filter(alert => !alert.acknowledged).length;

  const refreshAlerts = async () => {
    // Rate limiting: prevent refreshes more than once every 2 seconds
    const now = Date.now();
    if (now - lastRefreshTime < 2000) {
      console.log('⏭️ Alert refresh rate limited, skipping...');
      return;
    }
    setLastRefreshTime(now);
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
      
      // Filter alerts by tenant
      let filteredAlerts = fetchedAlerts;
      
      if (isMultiTenantAdmin) {
        if (selectedTenantId) {
          // Super admin viewing a specific tenant
          console.log('🔓 Super admin filtering alerts for tenant:', selectedTenantId);
          filteredAlerts = filterByTenant(fetchedAlerts, selectedTenantId);
          console.log(`Filtered ${fetchedAlerts.length} alerts to ${filteredAlerts.length} for selected tenant`);
        } else {
          // Super admin viewing all tenants
          console.log('🔓 Super admin - showing all alerts from all tenants');
          filteredAlerts = fetchedAlerts;
        }
      } else if (currentTenant) {
        // Regular user - filter by their tenant
        console.log('🏢 Filtering alerts for user tenant:', currentTenant.name);
        filteredAlerts = filterByTenant(fetchedAlerts, currentTenant.id);
        console.log(`Filtered ${fetchedAlerts.length} alerts to ${filteredAlerts.length} for tenant`);
      } else {
        // User has no tenant - for testing/development, show all alerts
        console.log('⚠️ User has no tenant - showing all alerts for development/testing');
        console.log('   In production, users should be assigned to tenants for proper data isolation');
        filteredAlerts = fetchedAlerts; // Show all alerts instead of empty array
        setError('Note: You are not assigned to any organization. In production, please contact your administrator to assign you to a tenant.');
      }
      
      // Deduplicate alerts based on patient, type, and similar messages
      const deduplicatedAlerts = deduplicateAlerts(filteredAlerts);
      
      // Log each alert for debugging
      deduplicatedAlerts.forEach(alert => {
        console.log(`Alert: ${alert.type} - ${alert.message} - Priority: ${alert.priority} - Acknowledged: ${alert.acknowledged} - Timestamp: ${alert.timestamp}`);
      });
      
      console.log(`Fetched ${fetchedAlerts.length} alerts, deduplicated to ${deduplicatedAlerts.length} alerts`);
      setAlerts(deduplicatedAlerts);
      // Removed setLastRefresh(new Date()) as lastRefresh is unused
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
      
      // Update local state immediately for better UX
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );
      
      // Update database
      await acknowledgeAlertService(alertId, user.id);
      
      console.log(`✅ Alert ${alertId} acknowledged successfully`);
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
      
      // Revert local state on error
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: false, acknowledged_at: undefined }
            : alert
        )
      );
    }
  };

  const runChecks = async () => {
    // Prevent multiple simultaneous checks
    if (isRunningChecks) {
      console.log('⏭️ Alert checks already running, skipping...');
      return;
    }

    try {
      setIsRunningChecks(true);
      
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
      }, 2000); // Reduced delay to 2 seconds
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run checks';
      console.error('Alert checks error:', errorMessage);
      setError(`Connection error: ${errorMessage}. Please check your Supabase configuration.`);
      setLoading(false);
    } finally {
      setIsRunningChecks(false);
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
    
    // DISABLED: Real-time subscription can cause infinite loops
    // Set up real-time subscription to alerts table with debouncing
    // let alertsSubscription: any = null;
    // let refreshTimeout: NodeJS.Timeout | null = null;
    
    // try {
    //   alertsSubscription = supabase
    //     .channel('alerts-changes')
    //     .on('postgres_changes', 
    //       { event: '*', schema: 'public', table: 'patient_alerts' }, 
    //       () => {
    //         console.log('Alert table changed, debouncing refresh...');
            
    //         // Clear existing timeout
    //         if (refreshTimeout) {
    //           clearTimeout(refreshTimeout);
    //         }
            
    //         // Set new timeout to debounce rapid changes
    //         refreshTimeout = setTimeout(() => {
    //           console.log('Executing debounced alert refresh');
    //           refreshAlerts();
    //         }, 1000); // 1 second debounce
    //       }
    //     )
    //     .subscribe();
    // } catch (subscriptionError) {
    //   console.error('Failed to set up real-time subscription:', subscriptionError);
    //   // Continue without real-time updates
    // }
      
    // Run initial alert checks after a delay
    setTimeout(() => {
      runChecks();
    }, 10000); // Increased initial delay to 10 seconds
    
    // Set up interval to run checks every 15 minutes (reduced frequency)
    let checkInterval = setInterval(() => {
      console.log('Running scheduled alert checks');
      runChecks();
    }, 15 * 60 * 1000); // Run checks every 15 minutes instead of 10
    
    return () => {
      // if (refreshTimeout) {
      //   clearTimeout(refreshTimeout);
      // }
      // if (alertsSubscription) {
      //   try {
      //     alertsSubscription.unsubscribe();
      //   } catch (error) {
      //     console.error('Error unsubscribing from alerts:', error);
      //   }
      // }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isSupabaseConfigured]);

  // Refresh alerts when tenant selection changes
  useEffect(() => {
    if (isSupabaseConfigured) {
      refreshAlerts();
    }
  }, [currentTenant, selectedTenantId, isMultiTenantAdmin]);

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