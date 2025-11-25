/**
 * ===========================================================================
 * ACTIVE SIMULATIONS TAB
 * ===========================================================================
 * Displays running simulations with controls for Start/Stop/Reset/Delete
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Trash2, Users, Clock, AlertTriangle, CheckCircle, Printer, FileText, Filter, X, Tag } from 'lucide-react';
import { getActiveSimulations, updateSimulationStatus, resetSimulationForNextSession, completeSimulation, deleteSimulation } from '../../../services/simulation/simulationService';
import type { SimulationActiveWithDetails } from '../types/simulation';
import { PRIMARY_CATEGORIES, SUB_CATEGORIES } from '../types/simulation';
import { formatDistanceToNow } from 'date-fns';
import { SimulationLabelPrintModal } from './SimulationLabelPrintModal';
import { InstructorNameModal } from './InstructorNameModal';
import { supabase } from '../../../lib/api/supabase';

const ActiveSimulations: React.FC = () => {
  const [simulations, setSimulations] = useState<SimulationActiveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [printLabelsSimulation, setPrintLabelsSimulation] = useState<SimulationActiveWithDetails | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState<string | null>(null);
  const [selectedPrimaryCategories, setSelectedPrimaryCategories] = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [editCategoriesModal, setEditCategoriesModal] = useState<{ sim: SimulationActiveWithDetails; primary: string[]; sub: string[] } | null>(null);
  const [completingSimulation, setCompletingSimulation] = useState<SimulationActiveWithDetails | null>(null);

  useEffect(() => {
    loadSimulations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSimulations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSimulations = async () => {
    try {
      // Show pending, running, paused, and completed simulations
      const data = await getActiveSimulations({
        status: ['pending', 'running', 'paused', 'completed']
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
        // Get the simulation to check if it's pending (needs timer setup) or just paused
        const sim = simulations.find(s => s.id === id);
        
        if (sim?.status === 'pending') {
          // Starting a pending simulation - need to set timer
          console.log('▶️ Starting pending simulation with timer...');
          const now = new Date();
          const endsAt = new Date(now.getTime() + (sim.duration_minutes * 60000));
          
          const { error } = await supabase
            .from('simulation_active')
            .update({
              status: 'running',
              starts_at: now.toISOString(),
              ends_at: endsAt.toISOString()
            })
            .eq('id', id);
            
          if (error) throw error;
        } else {
          // If just paused, simply resume (timer already set)
          console.log('▶️ Resuming paused simulation...');
          await updateSimulationStatus(id, 'running');
        }
        
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
      
      // Log detailed restore information
      if (result.restore_details) {
        console.log('📊 Restore Details:', result.restore_details);
        const details = result.restore_details;
        if (details.restored_counts) {
          console.log('📈 Records Restored:', details.restored_counts);
        }
      }
      
      alert('Simulation reset successfully! Status set to "Ready to Start". Click Play when ready to begin. Patient and medication IDs have been preserved.');
      await loadSimulations();
    } catch (error) {
      console.error('Error resetting simulation:', error);
      alert('Failed to reset simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (sim: SimulationActiveWithDetails) => {
    // Show instructor name modal
    setCompletingSimulation(sim);
  };

  const handleCompleteWithInstructor = async (instructorName: string) => {
    if (!completingSimulation) return;
    
    const id = completingSimulation.id;
    console.log('🎯 handleComplete called for:', id, 'Instructor:', instructorName);
    setActionLoading(id);
    setCompletingSimulation(null);
    
    try {
      // First, get student activities BEFORE completing
      console.log('📊 Generating student activity report...');
      const { getStudentActivitiesBySimulation } = await import('../../../services/simulation/studentActivityService');
      const activities = await getStudentActivitiesBySimulation(id);
      console.log('✅ Student activities captured:', activities.length, 'students');
      
      // Now complete the simulation WITH the activities snapshot and instructor name
      const result = await completeSimulation(id, activities, instructorName);
      console.log('✅ Complete simulation result:', result);
      
      // Show success message
      const totalEntries = activities.reduce((sum, s) => sum + s.totalEntries, 0);
      alert(`Simulation completed by ${instructorName}!\nStudent activities: ${activities.length} students, ${totalEntries} total entries`);
      
      await loadSimulations();
    } catch (error) {
      console.error('❌ Error completing simulation:', error);
      alert('Failed to complete simulation: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this simulation? This action cannot be undone.')) {
      return;
    }
    setActionLoading(id);
    try {
      await deleteSimulation(id);
      await loadSimulations();
    } catch (error) {
      console.error('Error deleting simulation:', error);
      alert('Failed to delete simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditCategories = (sim: SimulationActiveWithDetails) => {
    setEditCategoriesModal({
      sim,
      primary: sim.primary_categories || [],
      sub: sim.sub_categories || []
    });
  };

  const handleSaveCategories = async () => {
    if (!editCategoriesModal) return;

    setActionLoading(editCategoriesModal.sim.id);
    try {
      const { error } = await supabase
        .from('simulation_active')
        .update({
          primary_categories: editCategoriesModal.primary,
          sub_categories: editCategoriesModal.sub,
          updated_at: new Date().toISOString()
        })
        .eq('id', editCategoriesModal.sim.id);

      if (error) throw error;

      setEditCategoriesModal(null);
      await loadSimulations();
      alert('Categories updated successfully!');
    } catch (error) {
      console.error('Error updating categories:', error);
      alert('Failed to update categories');
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

  // Filter simulations based on selected categories
  const filteredSimulations = simulations.filter(sim => {
    const matchesPrimary = selectedPrimaryCategories.length === 0 || 
      (sim.primary_categories && sim.primary_categories.some(cat => selectedPrimaryCategories.includes(cat)));
    const matchesSub = selectedSubCategories.length === 0 || 
      (sim.sub_categories && sim.sub_categories.some(cat => selectedSubCategories.includes(cat)));
    return matchesPrimary && matchesSub;
  });

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
      {/* Category Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Filter by Category</h3>
          {(selectedPrimaryCategories.length > 0 || selectedSubCategories.length > 0) && (
            <button
              onClick={() => {
                setSelectedPrimaryCategories([]);
                setSelectedSubCategories([]);
              }}
              className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Primary Category Filters */}
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Primary (Program):</div>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    if (selectedPrimaryCategories.includes(category.value)) {
                      setSelectedPrimaryCategories(selectedPrimaryCategories.filter(c => c !== category.value));
                    } else {
                      setSelectedPrimaryCategories([...selectedPrimaryCategories, category.value]);
                    }
                  }}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${selectedPrimaryCategories.includes(category.value)
                      ? category.color + ' ring-2 ring-blue-500'
                      : category.color + ' opacity-50 hover:opacity-100'
                    }
                  `}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sub Category Filters */}
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Sub-Category (Type):</div>
            <div className="flex flex-wrap gap-2">
              {SUB_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    if (selectedSubCategories.includes(category.value)) {
                      setSelectedSubCategories(selectedSubCategories.filter(c => c !== category.value));
                    } else {
                      setSelectedSubCategories([...selectedSubCategories, category.value]);
                    }
                  }}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${selectedSubCategories.includes(category.value)
                      ? category.color + ' ring-2 ring-purple-500'
                      : category.color + ' opacity-50 hover:opacity-100'
                    }
                  `}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Showing {filteredSimulations.length} of {simulations.length} simulations
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Active Simulations */}
        <div className="lg:col-span-2 space-y-4">
          {filteredSimulations.map((sim) => (
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
                        : sim.status === 'pending'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : sim.status === 'completed'
                        ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                    }
                  `}
                >
                  {sim.status}
                </span>
                {sim.status === 'completed' && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Needs Reset
                  </span>
                )}
                {sim.status === 'pending' && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Ready to Start
                  </span>
                )}
                {sim.is_expired && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expired
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Template: {sim.template?.name}
              </p>
              
              {/* Category Badges */}
              {((sim.primary_categories && sim.primary_categories.length > 0) || (sim.sub_categories && sim.sub_categories.length > 0)) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {sim.primary_categories?.map((cat) => {
                    const categoryConfig = PRIMARY_CATEGORIES.find(c => c.value === cat);
                    return categoryConfig ? (
                      <span key={cat} className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig.color}`}>
                        {categoryConfig.label}
                      </span>
                    ) : null;
                  })}
                  {sim.sub_categories?.map((cat) => {
                    const categoryConfig = SUB_CATEGORIES.find(c => c.value === cat);
                    return categoryConfig ? (
                      <span key={cat} className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig.color}`}>
                        {categoryConfig.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              
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
                onClick={() => handleEditCategories(sim)}
                className="p-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
                title="Edit category tags"
              >
                <Tag className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPrintLabelsSimulation(sim)}
                className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                title="Print patient and medication labels"
              >
                <Printer className="h-4 w-4" />
              </button>
              {/* Play/Pause Button - Show based on status */}
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
                  onClick={() => handleResume(sim.id, false)}
                  disabled={actionLoading === sim.id}
                  className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50"
                  title={sim.status === 'pending' ? 'Start simulation' : sim.status === 'paused' ? 'Resume simulation' : 'Start simulation'}
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              {/* Reset Button - Only show if simulation has been used */}
              {(sim.status === 'running' || sim.status === 'paused' || sim.status === 'completed') && (
                <button
                  onClick={() => handleReset(sim.id)}
                  disabled={actionLoading === sim.id}
                  className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 disabled:opacity-50"
                  title="Reset simulation data and set to ready state"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              {/* Complete Button - Only show if simulation is running or paused */}
              {(sim.status === 'running' || sim.status === 'paused') && (
                <button
                  onClick={() => handleComplete(sim)}
                  disabled={actionLoading === sim.id}
                  className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 disabled:opacity-50"
                  title="Complete simulation and create debrief"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
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

          <div className="space-y-4 text-sm">
            {/* Print Labels */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2 flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Labels
              </h4>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Print patient and medication barcode labels for BCMA scanning.
              </p>
              <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded text-xs">
                <p className="font-medium text-indigo-800 dark:text-indigo-300 mb-1">Printing Instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                  <li>Use Avery 5160 label sheets (30 labels per sheet)</li>
                  <li>Select high-quality print setting for barcode clarity</li>
                  <li>Test print one sheet before bulk printing</li>
                </ul>
              </div>
            </div>

            {/* Start/Pause */}
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 dark:from-green-900/20 dark:to-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                <Pause className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
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
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete Simulation
              </h4>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Click when students finish their work. This will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                <li>Prompt for instructor name</li>
                <li>Save all student activities</li>
                <li>Generate debrief report</li>
                <li>Set status to "Needs Reset"</li>
              </ul>
              <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs text-emerald-800 dark:text-emerald-200">
                💡 Complete first, then Reset for next group
              </div>
            </div>

            {/* Reset */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset for Next Group
              </h4>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                Prepares simulation for new students:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                <li>Restores baseline data</li>
                <li>Clears student work</li>
                <li>Sets status to "Ready to Start"</li>
                <li>Preserves patient barcodes</li>
              </ul>
              <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-200">
                ✅ After reset, click <strong>Play</strong> to start when ready
              </div>
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-800 dark:text-red-200">
                ⚠️ <strong>Warning:</strong> Previous work is permanently deleted
              </div>
            </div>

            {/* Delete */}
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
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
          participants={printLabelsSimulation.participants}
          onClose={() => setPrintLabelsSimulation(null)}
        />
      )}

      {/* Edit Categories Modal */}
      {editCategoriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Edit Category Tags
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {editCategoriesModal.sim.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditCategoriesModal(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Primary Categories */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Primary Category (Program)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PRIMARY_CATEGORIES.map((category) => {
                    const isSelected = editCategoriesModal.primary.includes(category.value);
                    return (
                      <label
                        key={category.value}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditCategoriesModal({
                                ...editCategoriesModal,
                                primary: [...editCategoriesModal.primary, category.value]
                              });
                            } else {
                              setEditCategoriesModal({
                                ...editCategoriesModal,
                                primary: editCategoriesModal.primary.filter(c => c !== category.value)
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${category.color}`}>
                          {category.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sub Categories */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Sub-Category (Type)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SUB_CATEGORIES.map((category) => {
                    const isSelected = editCategoriesModal.sub.includes(category.value);
                    return (
                      <label
                        key={category.value}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditCategoriesModal({
                                ...editCategoriesModal,
                                sub: [...editCategoriesModal.sub, category.value]
                              });
                            } else {
                              setEditCategoriesModal({
                                ...editCategoriesModal,
                                sub: editCategoriesModal.sub.filter(c => c !== category.value)
                              });
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${category.color}`}>
                          {category.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 You can update categories on active simulations without disrupting them. Changes take effect immediately.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditCategoriesModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategories}
                disabled={actionLoading === editCategoriesModal.sim.id}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {actionLoading === editCategoriesModal.sim.id ? 'Saving...' : 'Save Categories'}
              </button>
            </div>
          </div>
        </div>
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

      {/* Instructor Name Modal */}
      {completingSimulation && (
        <InstructorNameModal
          simulationName={completingSimulation.name}
          onConfirm={handleCompleteWithInstructor}
          onCancel={() => setCompletingSimulation(null)}
        />
      )}
      </div>
    </div>
  );
};

export default ActiveSimulations;
