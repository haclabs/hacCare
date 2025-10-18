import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Terminal, User, Bell, Shield, Database, Wifi, WifiOff, Clock, Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, MemoryStick } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { isSupabaseConfigured, checkDatabaseHealth } from '../../../lib/api/supabase';
import { ConnectionDiagnostics } from './ConnectionDiagnostics';
import { SecuritySettings } from './SecuritySettings';

/**
 * Settings Component
 * 
 * Comprehensive settings panel for user preferences and system configuration.
 * Includes theme management, notification settings, and real-time system monitoring.
 * 
 * Features:
 * - Dark/Light mode toggle with system preference option
 * - User profile settings
 * - Notification preferences
 * - Real-time system information display
 * - Database connection status and ping monitoring
 * - Feature status indicators
 * - Performance metrics
 */
export const Settings: React.FC = () => {
  const { theme, isDarkMode, setTheme, toggleDarkMode, setDarkMode } = useTheme();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'connection'>('general');

  // System monitoring state
  const [systemInfo, setSystemInfo] = useState({
    dbStatus: 'checking' as 'connected' | 'disconnected' | 'checking' | 'error',
    dbPing: null as number | null,
    lastPingTime: null as Date | null,
    connectionAttempts: 0,
    uptime: 0,
    memoryUsage: null as number | null,
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
   * Check feature status
   */
  const checkFeatureStatus = async () => {
    const newFeatureStatus = { ...featureStatus };

    try {
      // Check authentication
      if (profile) {
        newFeatureStatus.authentication = 'operational';
      } else {
        newFeatureStatus.authentication = 'degraded';
      }

      // Check database-dependent features
      if (systemInfo.dbStatus === 'connected') {
        // All features are operational when database is connected
        newFeatureStatus.patientData = 'operational';
        newFeatureStatus.alerts = 'operational';
        newFeatureStatus.vitals = 'operational';
        newFeatureStatus.medications = 'operational';
      } else if (systemInfo.dbStatus === 'checking') {
        // Features are in a degraded state while checking
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      } else if (systemInfo.dbStatus === 'error') {
        // Features are in a degraded state on error
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      } else if (!isSupabaseConfigured) {
        // When Supabase is not configured, we're using mock data
        newFeatureStatus.patientData = 'operational';
        newFeatureStatus.alerts = 'operational';
        newFeatureStatus.vitals = 'operational';
        newFeatureStatus.medications = 'operational';
      } else {
        // Only mark as down when database is disconnected and Supabase is configured
        newFeatureStatus.patientData = 'degraded';
        newFeatureStatus.alerts = 'degraded';
        newFeatureStatus.vitals = 'degraded';
        newFeatureStatus.medications = 'degraded';
      }

      // Check network-dependent features
      if (!systemInfo.networkStatus) {
        newFeatureStatus.alerts = 'down';
      }

      setFeatureStatus(newFeatureStatus);
    } catch (error) {
      console.error('Error checking feature status:', error);
    }
  };

  /**
   * Get memory usage estimate
   */
  const getMemoryUsage = (): number | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize && memory.totalJSHeapSize) {
        return Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
      }
    }
    return null;
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
        memoryUsage: getMemoryUsage(),
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
   * Handle theme selection
   */
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemDark);
      localStorage.setItem('haccare-theme', 'system');
    } else if (['light', 'dark', 'terminal', 'retro'].includes(newTheme)) {
      setTheme(newTheme as 'light' | 'dark' | 'terminal' | 'retro');
    } else {
      const isDark = newTheme === 'dark';
      setDarkMode(isDark);
      localStorage.setItem('haccare-theme', newTheme);
    }
  };

  /**
   * Get current theme setting
   */
  const getCurrentTheme = () => {
    const savedTheme = localStorage.getItem('haccare-theme');
    return savedTheme || theme;
  };

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

  /**
   * Render tab content based on active tab
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'security':
        return <SecuritySettings />;
      case 'connection':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connection Settings</h1>
            </div>
            
            <ConnectionDiagnostics />
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">Troubleshooting Steps</h3>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                <p>If you're experiencing connection issues, try the following:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Check your internet connection</li>
                  <li>Verify your Supabase project is active</li>
                  <li>Ensure your API keys are correct in the .env file</li>
                  <li>Try refreshing the page</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Contact support if issues persist</li>
                </ol>
              </div>
            </div>
          </div>
        );
      default: // 'general'
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">General Settings</h1>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Appearance Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Moon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Theme Preference
                    </label>
                    
                    <div className="grid grid-cols-4 gap-3">
                      {/* Light Mode */}
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          getCurrentTheme() === 'light'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <Sun className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Light</div>
                      </button>

                      {/* Dark Mode */}
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          getCurrentTheme() === 'dark'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <Moon className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Dark</div>
                      </button>

                      {/* Terminal Mode */}
                      <button
                        onClick={() => handleThemeChange('terminal')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          getCurrentTheme() === 'terminal'
                            ? 'border-green-500 bg-black text-green-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <Terminal className="h-6 w-6 mx-auto mb-2 text-green-500" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Terminal</div>
                      </button>

                      {/* Retro Mode 🎮 */}
                      <button
                        onClick={() => handleThemeChange('retro')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          getCurrentTheme() === 'retro'
                            ? 'border-pink-500 bg-purple-900 text-pink-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        style={getCurrentTheme() === 'retro' ? {
                          background: 'linear-gradient(135deg, #1a0033 0%, #0d001a 100%)',
                          boxShadow: '0 0 15px rgba(255, 0, 255, 0.5)'
                        } : {}}
                      >
                        <Terminal className="h-6 w-6 mx-auto mb-2 text-pink-500" style={getCurrentTheme() === 'retro' ? { textShadow: '0 0 10px #ff00ff' } : {}} />
                        <div className="text-sm font-medium text-gray-900 dark:text-white" style={getCurrentTheme() === 'retro' ? { color: '#00ffff', textShadow: '0 0 5px #00ffff' } : {}}>
                          Retro 80's 🎮
                        </div>
                      </button>

                      {/* System Mode */}
                      <button
                        onClick={() => handleThemeChange('system')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          getCurrentTheme() === 'system'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <Monitor className="h-6 w-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">System</div>
                      </button>
                    </div>
                  </div>

                  {/* Quick Toggle */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Quick Toggle</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark mode</div>
                      </div>
                      <button
                        onClick={toggleDarkMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isDarkMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {profile?.first_name} {profile?.last_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {profile?.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {profile?.role === 'super_admin' ? 'Super Admin' : 
                      profile?.role === 'admin' ? 'Admin' : 'Nurse'}
                    </div>
                  </div>

                  {profile?.department && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        {profile.department}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Medication Alerts</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Get notified when medications are due</div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Vital Signs Alerts</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Get notified for abnormal vital signs</div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Emergency Alerts</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Get notified for emergency situations</div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Sound Notifications</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Play sound for important alerts</div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* System Status */}
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

                  {/* Memory Usage */}
                  {systemInfo.memoryUsage !== null && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MemoryStick className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Memory Usage</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            JavaScript heap
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              systemInfo.memoryUsage > 80 ? 'bg-red-500' :
                              systemInfo.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${systemInfo.memoryUsage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {systemInfo.memoryUsage}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Last Refresh */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Last updated: {systemInfo.lastRefresh.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>General</span>
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </button>
          
          <button
            onClick={() => setActiveTab('connection')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'connection'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Connection</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Security Notice - Always visible */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-800 dark:text-blue-300 font-medium text-sm">Security & Privacy</p>
        </div>
        <div className="text-blue-700 dark:text-blue-400 text-sm space-y-1">
          <p>• All patient data is encrypted and stored securely in compliance with HIPAA regulations</p>
          <p>• Your session is automatically secured with industry-standard encryption</p>
          <p>• Theme preferences are stored locally on your device only</p>
          <p>• No personal data is shared with third parties</p>
          <p>• System monitoring data is used only for performance optimization</p>
        </div>
      </div>
    </div>
  );
};

// Add default export for lazy loading
export default Settings;