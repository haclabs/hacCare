/**
 * ===========================================================================
 * ACTIVE SIMULATIONS TAB
 * ===========================================================================
 * Displays running simulations with controls for Start/Stop/Reset/Delete
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Trash2, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { getActiveSimulations, updateSimulationStatus, resetSimulation, completeSimulation, deleteSimulation } from '../../../services/simulation/simulationService';
import type { SimulationActiveWithDetails } from '../../../types/simulation';
import { formatDistanceToNow } from 'date-fns';

const ActiveSimulations: React.FC = () => {
  const [simulations, setSimulations] = useState<SimulationActiveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSimulations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSimulations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSimulations = async () => {
    try {
      const data = await getActiveSimulations();
      setSimulations(data);
    } catch (error) {
      console.error('Error loading active simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (id: string) => {
    setActionLoading(id);
    try {
      await updateSimulationStatus(id, 'paused');
      await loadSimulations();
    } catch (error) {
      console.error('Error pausing simulation:', error);
      alert('Failed to pause simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    setActionLoading(id);
    try {
      await updateSimulationStatus(id, 'running');
      await loadSimulations();
    } catch (error) {
      console.error('Error resuming simulation:', error);
      alert('Failed to resume simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (id: string) => {
    if (!confirm('Are you sure you want to reset this simulation? All progress will be lost.')) {
      return;
    }
    setActionLoading(id);
    try {
      await resetSimulation(id);
      await loadSimulations();
    } catch (error) {
      console.error('Error resetting simulation:', error);
      alert('Failed to reset simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Complete this simulation? It will be moved to History.')) {
      return;
    }
    setActionLoading(id);
    try {
      await completeSimulation(id);
      await loadSimulations();
    } catch (error) {
      console.error('Error completing simulation:', error);
      alert('Failed to complete simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this simulation? This action cannot be undone.')) {
      return;
    }
    setActionLoading(id);
    try {
      await deleteSimulation(id, false);
      await loadSimulations();
    } catch (error) {
      console.error('Error deleting simulation:', error);
      alert('Failed to delete simulation');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-12">
        <Play className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No Active Simulations
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Launch a simulation from the Templates tab to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {simulations.map((sim) => (
        <div
          key={sim.id}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {sim.name}
                </h3>
                <span
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${
                      sim.status === 'running'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : sim.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                    }
                  `}
                >
                  {sim.status}
                </span>
                {sim.is_expired && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expired
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Template: {sim.template?.name}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{sim.participant_count} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {(sim.time_remaining_minutes ?? 0) > 0
                      ? `${sim.time_remaining_minutes} minutes left`
                      : 'Time expired'}
                  </span>
                </div>
                <div className="text-xs">
                  Started {formatDistanceToNow(new Date(sim.starts_at), { addSuffix: true })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {sim.status === 'running' ? (
                <button
                  onClick={() => handlePause(sim.id)}
                  disabled={actionLoading === sim.id}
                  className="p-2 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                  title="Pause simulation"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleResume(sim.id)}
                  disabled={actionLoading === sim.id}
                  className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50"
                  title="Resume simulation"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleReset(sim.id)}
                disabled={actionLoading === sim.id}
                className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 disabled:opacity-50"
                title="Reset to template snapshot"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleComplete(sim.id)}
                disabled={actionLoading === sim.id}
                className="p-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 disabled:opacity-50"
                title="Complete simulation"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(sim.id)}
                disabled={actionLoading === sim.id}
                className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50"
                title="Delete simulation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Participants List */}
          {sim.participants && sim.participants.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Participants:
              </h4>
              <div className="flex flex-wrap gap-2">
                {sim.participants.map((participant: any) => (
                  <span
                    key={participant.id}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-300"
                  >
                    {participant.user_profiles ? `${participant.user_profiles.first_name} ${participant.user_profiles.last_name}` : participant.user_profiles?.email} ({participant.role})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ActiveSimulations;
