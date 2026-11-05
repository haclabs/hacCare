import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Monitor, ScanLine } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import { HacCareLogo } from '../../../components/Layout/HacCareLogo';
import { isEchoHost, setEchoPreferred } from '../echoMode';

/** Slim top bar: who is signed in, which simulation, and a large "Switch user" for shared devices. */
export const EchoHeader: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const inSimulation = currentTenant?.tenant_type === 'simulation_active';

  const handleSwitchUser = async () => {
    // Shared device: drop the last user's simulation and cached patient data before the next login
    localStorage.removeItem('current_simulation_tenant');
    queryClient.clear();
    await signOut();
    window.location.assign('/login');
  };

  const handleExitEcho = () => {
    setEchoPreferred(false);
    window.location.assign('/app');
  };

  const userName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '';

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <HacCareLogo size="22px" withBar />
          <span className="inline-flex items-center gap-1 rounded-full bg-haccare-teal/10 px-2.5 py-1 text-xs font-semibold text-haccare-teal">
            <ScanLine className="h-3.5 w-3.5" />
            Echo
          </span>
          {inSimulation && (
            <span className="hidden sm:inline truncate rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              {currentTenant?.name}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {userName && (
            <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 truncate max-w-[12rem]">
              {userName}
            </span>
          )}
          {!isEchoHost() && (
            <button
              onClick={handleExitEcho}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Return to the full desktop view"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden md:inline">Full view</span>
            </button>
          )}
          <button
            onClick={handleSwitchUser}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 sm:px-4"
          >
            <LogOut className="h-4 w-4" />
            Switch user
          </button>
        </div>
      </div>
      {inSimulation && (
        <p className="truncate border-t border-gray-100 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-sm font-medium text-green-800 dark:text-green-300 sm:hidden">
          {currentTenant?.name}
        </p>
      )}
    </header>
  );
};
