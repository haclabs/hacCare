import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isSupabaseConfigured, checkDatabaseHealth } from '../../../lib/api/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';

export interface SystemInfo {
  dbStatus: 'connected' | 'disconnected' | 'checking' | 'error';
  dbPing: number | null;
  lastPingTime: Date | null;
  connectionAttempts: number;
  uptime: number;
  memoryUsage: number | null;
  networkStatus: boolean;
  lastRefresh: Date;
}

export interface FeatureStatus {
  authentication: 'operational' | 'degraded' | 'down';
  patientData: 'operational' | 'degraded' | 'down';
  alerts: 'operational' | 'degraded' | 'down';
  vitals: 'operational' | 'degraded' | 'down';
  medications: 'operational' | 'degraded' | 'down';
}

const initialSystemInfo: SystemInfo = {
  dbStatus: 'checking',
  dbPing: null,
  lastPingTime: null,
  connectionAttempts: 0,
  uptime: 0,
  memoryUsage: null,
  networkStatus: navigator.onLine,
  lastRefresh: new Date(),
};

const initialFeatureStatus: FeatureStatus = {
  authentication: 'operational',
  patientData: 'operational',
  alerts: 'operational',
  vitals: 'operational',
  medications: 'operational',
};

export function useSettingsMonitor() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(initialSystemInfo);
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>(initialFeatureStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pingDatabase = useCallback(async (): Promise<{ success: boolean; ping: number | null }> => {
    try {
      const start = Date.now();
      const isHealthy = await checkDatabaseHealth();
      const ping = Date.now() - start;
      return { success: isHealthy, ping };
    } catch {
      return { success: false, ping: null };
    }
  }, []);

  const checkFeatureStatus = useCallback(async (currentDbStatus: SystemInfo['dbStatus']) => {
    try {
      const newFeatureStatus: FeatureStatus = {
        authentication: 'operational',
        patientData: 'operational',
        alerts: 'operational',
        vitals: 'operational',
        medications: 'operational',
      };

      if (currentDbStatus === 'disconnected') {
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      } else if (currentDbStatus === 'error') {
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      } else if (!isSupabaseConfigured) {
        newFeatureStatus.patientData = 'operational';
        newFeatureStatus.alerts = 'operational';
        newFeatureStatus.vitals = 'operational';
        newFeatureStatus.medications = 'operational';
      } else {
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      }

      if (!navigator.onLine) {
        newFeatureStatus.alerts = 'down';
      }

      setFeatureStatus(newFeatureStatus);
    } catch (error) {
      secureLogger.error('Error checking feature status:', error);
    }
  }, []);

  const getMemoryUsage = (): number | null => {
    if ('memory' in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (memory && memory.usedJSHeapSize && memory.totalJSHeapSize) {
        return Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
      }
    }
    return null;
  };

  const updateSystemInfo = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { success, ping } = await pingDatabase();
      const newDbStatus: SystemInfo['dbStatus'] = success ? 'connected' : 'disconnected';

      setSystemInfo(prev => ({
        ...prev,
        dbStatus: newDbStatus,
        dbPing: ping,
        lastPingTime: new Date(),
        connectionAttempts: prev.connectionAttempts + 1,
        memoryUsage: getMemoryUsage(),
        networkStatus: navigator.onLine,
        lastRefresh: new Date(),
      }));

      await checkFeatureStatus(newDbStatus);
    } catch (error) {
      secureLogger.error('Error updating system info:', error);
      setSystemInfo(prev => ({ ...prev, dbStatus: 'error', lastRefresh: new Date() }));
    } finally {
      setIsRefreshing(false);
    }
  }, [pingDatabase, checkFeatureStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateSystemInfo();
    const interval = setInterval(updateSystemInfo, 30000);

    const handleOnline = () => {
      setSystemInfo(prev => ({ ...prev, networkStatus: true }));
      updateSystemInfo();
    };
    const handleOffline = () => {
      setSystemInfo(prev => ({ ...prev, networkStatus: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSystemInfo]);

  const getStatusIcon = (status: string): { icon: LucideIcon; color: string } => {
    switch (status) {
      case 'operational':
      case 'connected':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400' };
      case 'degraded':
        return { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400' };
      case 'down':
      case 'disconnected':
      case 'error':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400' };
      case 'checking':
        return { icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400 animate-spin' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const formatUptime = (): string => {
    const uptimeMs = performance.now();
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return { systemInfo, featureStatus, isRefreshing, updateSystemInfo, getStatusIcon, formatUptime };
}
