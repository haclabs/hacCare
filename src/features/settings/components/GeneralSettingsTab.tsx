import React from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { PasswordSecurityCard } from './PasswordSecurityCard';

interface ProfileInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  department?: string;
}

interface GeneralSettingsTabProps {
  profile: ProfileInfo | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  handleThemeChange: (theme: string) => void;
  getCurrentTheme: () => string;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  profile,
  isDarkMode,
  toggleDarkMode,
  handleThemeChange,
  getCurrentTheme,
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

        <PasswordSecurityCard />
      </div>
    </div>
  );
};
