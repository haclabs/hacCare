import React from 'react';
import { Shield } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { GeneralSettingsTab } from './GeneralSettingsTab';

export const Settings: React.FC = () => {
  const { theme, isDarkMode, setTheme, toggleDarkMode, setDarkMode } = useTheme();
  const { profile } = useAuth();

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

  return (
    <div className="space-y-6">
      <GeneralSettingsTab
        profile={profile}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        handleThemeChange={handleThemeChange}
        getCurrentTheme={getCurrentTheme}
      />

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
        </div>
      </div>
    </div>
  );
};

// Add default export for lazy loading
export default Settings;
