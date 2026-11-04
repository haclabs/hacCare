import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, RefreshCw, Users } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { secureLogger } from '../../../lib/security/secureLogger';
import { ROVER_PATH } from '../roverMode';
import { useRoverAssignments, type RoverAssignment } from '../hooks/useRoverAssignments';

/** Rover home: large tap targets for each simulation the user can enter. */
export const RoverSimulationList: React.FC = () => {
  const { enterSimulationTenant } = useTenant();
  const { data: assignments = [], isLoading, error, refetch, isFetching } = useRoverAssignments();
  const [entering, setEntering] = useState<string | null>(null);
  const [enterError, setEnterError] = useState<string | null>(null);

  const handleEnter = async (assignment: RoverAssignment) => {
    setEntering(assignment.simulation.id);
    setEnterError(null);
    try {
      await enterSimulationTenant(assignment.simulation.tenant_id);
      // Full reload so every tenant-scoped context and cache starts clean in the simulation
      window.location.assign(ROVER_PATH);
    } catch (err) {
      secureLogger.error('Rover: failed to enter simulation', err);
      setEnterError('Could not enter that simulation. Please try again.');
      setEntering(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-600 dark:text-gray-300">
        <Loader2 className="h-10 w-10 animate-spin text-haccare-teal mb-3" />
        Loading simulations…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select a simulation</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {(error || enterError) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {enterError ?? 'Unable to load simulations. Check the connection and tap Refresh.'}
        </div>
      )}

      {assignments.length === 0 && !error ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 p-10 text-center shadow-md">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No active simulations</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Ask your instructor to launch a simulation or add you to one, then tap Refresh.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const busy = entering === assignment.simulation.id;
            return (
              <button
                key={assignment.id}
                onClick={() => handleEnter(assignment)}
                disabled={!!entering}
                className="group flex w-full items-center justify-between gap-4 rounded-xl border-2 border-transparent bg-white dark:bg-gray-800 p-6 text-left shadow-md transition hover:border-haccare-teal hover:shadow-lg disabled:opacity-60"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-white">
                      {assignment.simulation.name}
                    </h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        assignment.simulation.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {assignment.simulation.status}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm capitalize text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    {assignment.role}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2 rounded-lg bg-haccare-teal px-5 py-3 font-semibold text-white group-hover:bg-haccare-teal-dark">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  Enter
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
