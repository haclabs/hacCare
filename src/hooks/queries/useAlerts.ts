import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchActiveAlerts, acknowledgeAlert as acknowledgeAlertService, runAlertChecks } from '../../lib/alertService';
import { supabase, isSupabaseConfigured, checkDatabaseHealth } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryClient';
import { Alert } from '../../types';

// ========================================
// 🚨 ALERT QUERY HOOKS
// ========================================

/**
 * Fetch all active alerts with smart caching
 * Replaces manual alert fetching from AlertContext
 */
export function useActiveAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts.active,
    queryFn: async (): Promise<Alert[]> => {
      // Check if Supabase is configured before attempting to fetch
      if (!isSupabaseConfigured) {
        console.warn('⚠️ Supabase not configured, returning empty alerts');
        return [];
      }

      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('⚠️ Database unavailable - cannot fetch alerts');
        throw new Error('Database connection failed. Please check your Supabase configuration.');
      }

      const refreshTime = new Date().toISOString();
      console.log('Fetching active alerts at:', refreshTime);
      
      const fetchedAlerts = await fetchActiveAlerts();
      
      // Log each alert for debugging
      fetchedAlerts.forEach(alert => {
        console.log(`Alert: ${alert.type} - ${alert.message} - Priority: ${alert.priority} - Acknowledged: ${alert.acknowledged} - Timestamp: ${alert.timestamp}`);
      });
      
      console.log(`✅ Fetched ${fetchedAlerts.length} active alerts`);
      return fetchedAlerts;
    },
    staleTime: 30 * 1000, // 30 seconds - alerts need frequent updates
    gcTime: 2 * 60 * 1000, // 2 minutes in cache
    refetchInterval: 60 * 1000, // Auto-refresh every minute for critical alerts
    retry: (failureCount, error) => {
      // Don't retry configuration errors
      if (error?.message?.includes('Supabase configuration')) return false;
      if (error?.message?.includes('Database connection failed')) return false;
      return failureCount < 3;
    },
    // Start with empty array instead of undefined to prevent loading flickers
    placeholderData: [],
  });
}

/**
 * Get unread alert count
 * Derived from active alerts for performance
 */
export function useUnreadAlertCount() {
  const { data: alerts = [] } = useActiveAlerts();
  
  return {
    unreadCount: alerts.filter(alert => !alert.acknowledged).length,
    criticalCount: alerts.filter(alert => !alert.acknowledged && alert.priority === 'Critical').length,
    highCount: alerts.filter(alert => !alert.acknowledged && alert.priority === 'High').length,
  };
}

/**
 * Get alerts by priority
 * Useful for filtering different alert types
 */
export function useAlertsByPriority(priority?: 'Low' | 'Medium' | 'High' | 'Critical') {
  const { data: alerts = [], isLoading, error } = useActiveAlerts();
  
  const filteredAlerts = priority 
    ? alerts.filter(alert => alert.priority === priority)
    : alerts;
    
  return {
    alerts: filteredAlerts,
    isLoading,
    error,
    count: filteredAlerts.length,
  };
}

// ========================================
// 🚨 ALERT MUTATIONS
// ========================================

/**
 * Acknowledge alert mutation with optimistic updates
 * Replaces manual acknowledgeAlert function from AlertContext
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Database connection failed. Please check your Supabase configuration.');
      }
      
      await acknowledgeAlertService(alertId, userId);
      return { alertId, acknowledgedAt: new Date().toISOString() };
    },
    // Optimistic update - immediately update UI before server confirms
    onMutate: async ({ alertId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.alerts.active });
      
      // Snapshot previous value
      const previousAlerts = queryClient.getQueryData<Alert[]>(queryKeys.alerts.active);
      
      // Optimistically update alert
      queryClient.setQueryData<Alert[]>(queryKeys.alerts.active, (old = []) =>
        old.map(alert => 
          alert.id === alertId 
            ? { 
                ...alert, 
                acknowledged: true, 
                acknowledged_at: new Date().toISOString() 
              }
            : alert
        )
      );
      
      return { previousAlerts };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(queryKeys.alerts.active, context.previousAlerts);
      }
      console.error('❌ Failed to acknowledge alert:', error);
    },
    onSuccess: ({ alertId }) => {
      console.log(`✅ Alert ${alertId} acknowledged successfully`);
    },
    onSettled: () => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.active });
    },
  });
}

/**
 * Run alert checks mutation
 * Triggers system-wide alert generation and refresh
 */
export function useRunAlertChecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) {
        throw new Error('Database not configured');
      }

      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Database connection failed. Please check your Supabase configuration.');
      }

      console.log('🔄 Running alert checks...');
      await runAlertChecks();
      console.log('✅ Alert checks completed');
    },
    onSuccess: () => {
      // Invalidate alerts to fetch new ones generated by checks
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.active });
      console.log('✅ Alert checks completed, refreshing alerts...');
    },
    onError: (error) => {
      console.error('❌ Alert checks failed:', error);
    },
  });
}

/**
 * Dismiss/delete alert mutation
 * For alerts that can be permanently removed
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Database not configured');
      }

      // This would be implemented in alertService if needed
      // For now, just acknowledge the alert
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await acknowledgeAlertService(alertId, user.id);
      return alertId;
    },
    onMutate: async (alertId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.alerts.active });
      
      // Snapshot previous value
      const previousAlerts = queryClient.getQueryData<Alert[]>(queryKeys.alerts.active);
      
      // Optimistically remove alert
      queryClient.setQueryData<Alert[]>(queryKeys.alerts.active, (old = []) =>
        old.filter(alert => alert.id !== alertId)
      );
      
      return { previousAlerts };
    },
    onError: (error, _alertId, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(queryKeys.alerts.active, context.previousAlerts);
      }
      console.error('❌ Failed to dismiss alert:', error);
    },
    onSuccess: (alertId) => {
      console.log(`✅ Alert ${alertId} dismissed successfully`);
    },
    onSettled: () => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.active });
    },
  });
}

// ========================================
// 🛡️ HELPER HOOKS
// ========================================

/**
 * Alert polling hook for real-time updates
 * Can be enabled/disabled based on component visibility
 * Default interval set to 15 minutes (900000ms) to reduce server load
 */
export function useAlertPolling(enabled = true, interval = 900000) {
  const { refetch } = useActiveAlerts();
  
  return useQuery({
    queryKey: ['alert-polling', interval],
    queryFn: () => refetch(),
    refetchInterval: enabled ? interval : false,
    enabled,
    // Don't store results, just trigger refetch
    select: () => null,
  });
}

/**
 * Get alert statistics
 * Useful for dashboard widgets
 */
export function useAlertStats() {
  const { data: alerts = [] } = useActiveAlerts();
  
  const stats = {
    total: alerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    acknowledged: alerts.filter(a => a.acknowledged).length,
    byPriority: {
      critical: alerts.filter(a => a.priority === 'Critical').length,
      high: alerts.filter(a => a.priority === 'High').length,
      medium: alerts.filter(a => a.priority === 'Medium').length,
      low: alerts.filter(a => a.priority === 'Low').length,
    },
    byType: alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
  
  return stats;
}
