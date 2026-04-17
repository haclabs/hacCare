import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Database } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { ConnectionDiagnostics } from './ConnectionDiagnostics';
import { SecuritySettings } from './SecuritySettings';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { useSettingsMonitor } from '../hooks/useSettingsMonitor';

type Tab = 'general' | 'security' | 'connection';

export const Settings: React.FC = () => {
  const { theme, isDarkMode, setTheme, toggleDarkMode, setDarkMode } = useTheme();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { systemInfo, isRefreshing, updateSystemInfo, getStatusIcon, formatUptime } = useSettingsMonitor();

  const handleThemeChange = (newTheme: string) => {
    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemDark);
      localStorage.setItem('haccare-theme', 'system');
    } else if (['light', 'dark'].includes(newTheme)) {
      setTheme(newTheme as 'light' | 'dark');
    } else {
      setDarkMode(newTheme === 'dark');
      localStorage.setItem('haccare-theme', newTheme);
    }
  };

  const getCurrentTheme = () => localStorage.getItem('haccare-theme') || theme;

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
      default:
        return (
          <GeneralSettingsTab
            profile={profile}
            systemInfo={systemInfo}
            isRefreshing={isRefreshing}
            updateSystemInfo={updateSystemInfo}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            handleThemeChange={handleThemeChange}
            getCurrentTheme={getCurrentTheme}
            getStatusIcon={getStatusIcon}
            formatUptime={formatUptime}
          />
        );
    }
  };

  const tabClass = (tab: Tab) =>
    `py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
    }`;

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('general')} className={tabClass('general')}>
            <SettingsIcon className="h-4 w-4" />
            <span>General</span>
          </button>
          <button onClick={() => setActiveTab('security')} className={tabClass('security')}>
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </button>
          <button onClick={() => setActiveTab('connection')} className={tabClass('connection')}>
            <Database className="h-4 w-4" />
            <span>Connection</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Security Notice */}
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
