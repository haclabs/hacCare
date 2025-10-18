import React, { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Database, Wifi, WifiOff, Clock, Server
} from 'lucide-react';
import { isSupabaseConfigured, checkDatabaseHealth } from '../../lib/api/supabase';

/**
 * System Status Component
 * 
 * Real-time monitoring of system health and database connectivity.
 * Provides visual indicators and detailed status information.
 */
export const SystemStatus: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState({
    dbStatus: 'checking' as 'connected' | 'disconnected' | 'checking' | 'error',
    dbPing: null as number | null,
    lastPingTime: null as Date | null,
    connectionAttempts: 0,
    uptime: 0,
    networkStatus: navigator.onLine,
    lastRefresh: new Date()
  });

  const [featureStatus, setFeatureStatus] = useState({
    authentication: 'operational' as 'operational' | 'degraded' | 'down',
    patientData: 'operational' as 'operational' | 'degraded' | 'down',
    alerts: 'operational' as 'operational' | 'degraded' | 'down',
    vitals: 'operational' as 'operational' | 'degraded' | 'down',
    medications: 'operational' as 'operational' | 'degraded' | 'down'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Ping database and measure response time
   */
  const pingDatabase = async (): Promise<{ success: boolean; ping: number | null }> => {
    if (!isSupabaseConfigured) {
      return { success: false, ping: null };
    }

    const startTime = performance.now();
    try {
      const isHealthy = await checkDatabaseHealth();
      const endTime = performance.now();
      const ping = Math.round(endTime - startTime);
      
      return { success: isHealthy, ping };
    } catch (error) {
      const endTime = performance.now();
      const ping = Math.round(endTime - startTime);
      return { success: false, ping };
    }
  };

  /**
   * Check feature status based on database and network connectivity
   */
  const checkFeatureStatus = async () => {
    const newFeatureStatus = { ...featureStatus };

    try {
      // Update feature status based on database connectivity
      if (systemInfo.dbStatus === 'connected') {
        newFeatureStatus.authentication = 'operational';
        newFeatureStatus.patientData = 'operational';
        newFeatureStatus.alerts = 'operational';
        newFeatureStatus.vitals = 'operational';
        newFeatureStatus.medications = 'operational';
      } else if (systemInfo.dbStatus === 'checking') {
        newFeatureStatus.authentication = 'operational';
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      } else {
        newFeatureStatus.authentication = 'operational';
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      }

      // Network-dependent features
      if (!systemInfo.networkStatus) {
        newFeatureStatus.alerts = 'down';
        newFeatureStatus.patientData = 'degraded';
      }

      setFeatureStatus(newFeatureStatus);
    } catch (error) {
      console.error('Error checking feature status:', error);
    }
  };

  /**
   * Update system information
   */
  const updateSystemInfo = async () => {
    setIsRefreshing(true);
    
    try {
      // Ping database
      const { success, ping } = await pingDatabase();
      
      // Update system info
      setSystemInfo(prev => ({
        ...prev,
        dbStatus: success ? 'connected' : 'disconnected',
        dbPing: ping,
        lastPingTime: new Date(),
        connectionAttempts: prev.connectionAttempts + 1,
        networkStatus: navigator.onLine,
        lastRefresh: new Date()
      }));

      // Update feature status
      await checkFeatureStatus();
    } catch (error) {
      console.error('Error updating system info:', error);
      setSystemInfo(prev => ({
        ...prev,
        dbStatus: 'error',
        lastRefresh: new Date()
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Initialize system monitoring
   */
  useEffect(() => {
    // Initial check
    updateSystemInfo();

    // Set up periodic monitoring
    const interval = setInterval(updateSystemInfo, 30000); // Every 30 seconds

    // Monitor network status
    const handleOnline = () => {
      setSystemInfo(prev => ({ ...prev, networkStatus: true }));
      updateSystemInfo();
    };
    
    const handleOffline = () => {
      setSystemInfo(prev => ({ ...prev, networkStatus: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Get status icon and color
   */
  const getStatusIcon = (status: string) => {
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

  /**
   * Format uptime
   */
  const formatUptime = () => {
    const uptimeMs = performance.now();
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Status</h2>
        </div>
        <button
          onClick={updateSystemInfo}
          disabled={isRefreshing}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Database Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Database</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {systemInfo.dbPing !== null ? `${systemInfo.dbPing}ms` : 'No ping data'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(() => {
              const { icon: Icon, color } = getStatusIcon(systemInfo.dbStatus);
              return <Icon className={`h-4 w-4 ${color}`} />;
            })()}
            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {systemInfo.dbStatus}
            </span>
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {systemInfo.networkStatus ? (
              <Wifi className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Network</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Internet connectivity
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {systemInfo.networkStatus ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {systemInfo.networkStatus ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Session Uptime */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Session Uptime</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Since page load
              </div>
            </div>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatUptime()}
          </span>
        </div>

        {/* Feature Status */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Feature Status</h3>
          
          <div className="space-y-3">
            {Object.entries(featureStatus).map(([feature, status]) => {
              const { icon: Icon, color } = getStatusIcon(status);
              const featureNames = {
                authentication: 'Authentication',
                patientData: 'Patient Data',
                alerts: 'Alert System',
                vitals: 'Vital Signs',
                medications: 'Medications'
              };

              return (
                <div key={feature} className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {featureNames[feature as keyof typeof featureNames]}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-xs capitalize">
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last Refresh */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Last updated: {systemInfo.lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};