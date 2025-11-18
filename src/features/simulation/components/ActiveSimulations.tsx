/**
 * ===========================================================================
 * ACTIVE SIMULATIONS TAB
 * ===========================================================================
 * Displays running simulations with controls for Start/Stop/Reset/Delete
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Trash2, Users, Clock, AlertTriangle, CheckCircle, Printer, FileText } from 'lucide-react';
import { getActiveSimulations, updateSimulationStatus, resetSimulationForNextSession, completeSimulation, deleteSimulation } from '../../../services/simulation/simulationService';
import type { SimulationActiveWithDetails } from '../types/simulation';
import { formatDistanceToNow } from 'date-fns';
import { SimulationLabelPrintModal } from './SimulationLabelPrintModal';

const ActiveSimulations: React.FC = () => {
  const [simulations, setSimulations] = useState<SimulationActiveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [printLabelsSimulation, setPrintLabelsSimulation] = useState<SimulationActiveWithDetails | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState<string | null>(null);

  useEffect(() => {
    loadSimulations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSimulations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSimulations = async () => {
    try {
      // Show running, paused, and completed simulations - completed ones can be restarted
      const data = await getActiveSimulations({
        status: ['running', 'paused', 'completed']
      });
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

  const handleResume = async (id: string, isCompleted: boolean = false) => {
    console.log('🎯 handleResume called:', { id, isCompleted });
    setActionLoading(id);
    try {
      if (isCompleted) {
        // If simulation is completed, reset it with a fresh timer
        console.log('🔄 Resetting completed simulation...');
        const result = await resetSimulationForNextSession(id);
        console.log('✅ Simulation reset and restarted:', result);
        
        alert('Simulation restarted with fresh timer! Reloading data...');
        
        // Reload data instead of hard refresh
        await loadSimulations();
      } else {
        // If just paused, simply resume
        console.log('▶️ Resuming paused simulation...');
        await updateSimulationStatus(id, 'running');
        await loadSimulations();
      }
    } catch (error) {
      console.error('❌ Error resuming simulation:', error);
      alert('Failed to resume simulation: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (id: string) => {
    setResetModalOpen(id);
  };

  const confirmReset = async () => {
    if (!resetModalOpen) return;
    
    const id = resetModalOpen;
    setResetModalOpen(null);
    setActionLoading(id);
    
    try {
      const result = await resetSimulationForNextSession(id);
      console.log('✅ Simulation reset successfully:', result);
      alert('Simulation reset successfully! Patient and medication IDs have been preserved. Page will refresh to show updated data.');
      await loadSimulations();
      
      // Hard reload with cache bypass - add timestamp to force fresh data
      window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
    } catch (error) {
      console.error('Error resetting simulation:', error);
      alert('Failed to reset simulation');
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Complete this simulation? Student activity report will be generated and saved to History.')) {
      return;
    }
    console.log('🎯 handleComplete called for:', id);
    setActionLoading(id);
    try {
      // First, get student activities BEFORE completing
      console.log('📊 Generating student activity report...');
      const { getStudentActivitiesBySimulation } = await import('../../../services/simulation/studentActivityService');
      const activities = await getStudentActivitiesBySimulation(id);
      console.log('✅ Student activities captured:', activities.length, 'students');
      
      // Now complete the simulation WITH the activities snapshot
      const result = await completeSimulation(id, activities);
      console.log('✅ Complete simulation result:', result);
      
      // Show success message
      const totalEntries = activities.reduce((sum, s) => sum + s.totalEntries, 0);
      alert(`Simulation completed!\nStudent activities: ${activities.length} students, ${totalEntries} total entries`);
      
      await loadSimulations();
    } catch (error) {
      console.error('❌ Error completing simulation:', error);
      alert('Failed to complete simulation: ' + (error instanceof Error ? error.message : String(error)));
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Active Simulations */}
      <div className="lg:col-span-2 space-y-4">
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
              <button
                onClick={() => setPrintLabelsSimulation(sim)}
                className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                title="Print patient and medication labels"
              >
                <Printer className="h-4 w-4" />
              </button>
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
                  onClick={() => handleResume(sim.id, sim.status === 'completed')}
                  disabled={actionLoading === sim.id}
                  className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50"
                  title={sim.status === 'completed' ? 'Restart simulation with fresh timer' : 'Resume simulation'}
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
                className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 disabled:opacity-50"
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

      {/* Right Column - Instructor Guide */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 p-6 sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-emerald-900 dark:text-emerald-100">
              Instructor Quick Guide
            </h3>
          </div>

          <div className="space-y-6 text-sm">
            {/* Start/Pause */}
            <div>
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start / Pause
              </h4>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Control simulation flow during the session:
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                <li className="flex items-start gap-2">
                  <Play className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                  <span><strong>Start:</strong> Begins timer countdown and enables student access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Pause className="h-3 w-3 text-yellow-600 mt-1 flex-shrink-0" />
                  <span><strong>Pause:</strong> Freezes timer, students can still document</span>
                </li>
              </ul>
            </div>

            {/* Complete */}
            <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete Simulation
              </h4>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Click when students finish their work. This will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                <li>Save all student activities</li>
                <li>Generate debrief report</li>
                <li>Move to Debrief Reports tab</li>
                <li>Preserve data for review</li>
              </ul>
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                💡 Complete first before resetting for next group
              </div>
            </div>

            {/* Reset */}
            <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset for Next Group
              </h4>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Prepares simulation for new students:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                <li>Restores baseline data</li>
                <li>Clears student work</li>
                <li>Resets timer</li>
                <li>Preserves patient barcodes</li>
              </ul>
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-800 dark:text-red-200">
                ⚠️ <strong>Warning:</strong> Previous work is permanently deleted
              </div>
            </div>

            {/* Delete */}
            <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Simulation
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Permanently removes the entire simulation session. Use only if simulation won't be needed again.
              </p>
            </div>

            {/* Timer Status */}
            <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                ⏱️ Timer Colors
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">Plenty of time</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">&lt; 15 minutes left</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">&lt; 5 minutes left</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Label Printing Modal */}
      {printLabelsSimulation && (
        <SimulationLabelPrintModal
          simulationName={printLabelsSimulation.name}
          tenantId={printLabelsSimulation.tenant_id}
          onClose={() => setPrintLabelsSimulation(null)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border-4 border-yellow-400 dark:border-yellow-500">
            {/* Header with Warning Icon */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-4 border-b border-yellow-200 dark:border-yellow-700 flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                Reset Simulation Warning
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-base text-slate-700 dark:text-slate-300 font-medium mb-3">
                  ⚠️ Ensure you have <span className="text-red-600 dark:text-red-400 font-bold">completed the simulation</span> before resetting!
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>All student work will be permanently lost</strong> if you reset without completing the simulation first.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Reminder:</strong> Click "Complete Simulation" first to save student activities to debrief report before resetting.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setResetModalOpen(null)}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  Reset Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveSimulations;
