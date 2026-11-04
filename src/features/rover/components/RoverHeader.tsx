import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Monitor, ScanLine } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import { HacCareLogo } from '../../../components/Layout/HacCareLogo';
import { isRoverHost, setRoverPreferred } from '../roverMode';

/** Slim top bar: who is signed in, which simulation, and a large "Switch user" for shared devices. */
export const RoverHeader: React.FC = () => {
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

  const handleExitRover = () => {
    setRoverPreferred(false);
    window.location.assign('/app');
  };

  const userName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '';

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <HacCareLogo size="22px" withBar />
          <span className="inline-flex items-center gap-1 rounded-full bg-haccare-teal/10 px-2.5 py-1 text-xs font-semibold text-haccare-teal">
            <ScanLine className="h-3.5 w-3.5" />
            Rover
          </span>
          {inSimulation && (
            <span className="truncate rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              {currentTenant?.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 truncate max-w-[12rem]">
              {userName}
            </span>
          )}
          {!isRoverHost() && (
            <button
              onClick={handleExitRover}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Return to the full desktop view"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden md:inline">Full view</span>
            </button>
          )}
          <button
            onClick={handleSwitchUser}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <LogOut className="h-4 w-4" />
            Switch user
          </button>
        </div>
      </div>
    </header>
  );
};
