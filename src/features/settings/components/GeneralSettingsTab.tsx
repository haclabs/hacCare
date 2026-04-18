import React from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  User,
  Bell,
  Database,
  Wifi,
  WifiOff,
  Clock,
  Activity,
  RefreshCw,
  MemoryStick,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SystemInfo } from '../hooks/useSettingsMonitor';

interface ProfileInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  department?: string;
}

interface GeneralSettingsTabProps {
  profile: ProfileInfo | null;
  systemInfo: SystemInfo;
  isRefreshing: boolean;
  updateSystemInfo: () => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  handleThemeChange: (theme: string) => void;
  getCurrentTheme: () => string;
  getStatusIcon: (status: string) => { icon: LucideIcon; color: string };
  formatUptime: () => string;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  profile,
  systemInfo,
  isRefreshing,
  updateSystemInfo,
  isDarkMode,
  toggleDarkMode,
  handleThemeChange,
  getCurrentTheme,
  getStatusIcon,
  formatUptime,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">General Settings</h1>
      </div>

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
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {profile?.first_name} {profile?.last_name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {profile?.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {profile?.role === 'super_admin'
                  ? 'Super Admin'
                  : profile?.role === 'admin'
                  ? 'Admin'
                  : 'Nurse'}
              </div>
            </div>
            {profile?.department && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
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
            {[
              { label: 'Medication Alerts', description: 'Get notified when medications are due' },
              { label: 'Vital Signs Alerts', description: 'Get notified for abnormal vital signs' },
              { label: 'Emergency Alerts', description: 'Get notified for emergency situations' },
              { label: 'Sound Notifications', description: 'Play sound for important alerts' },
            ].map(({ label, description }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            ))}
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Internet connectivity</div>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Since page load</div>
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{formatUptime()}</span>
            </div>

            {/* Memory Usage */}
            {systemInfo.memoryUsage !== null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MemoryStick className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Memory Usage</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">JavaScript heap</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        systemInfo.memoryUsage > 80
                          ? 'bg-red-500'
                          : systemInfo.memoryUsage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${systemInfo.memoryUsage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{systemInfo.memoryUsage}%</span>
                </div>
              </div>
            )}

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
};
