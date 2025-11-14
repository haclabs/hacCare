/**
 * ===========================================================================
 * LAUNCH SIMULATION MODAL
 * ===========================================================================
 * Select duration and participants when launching a simulation from template
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, Play, Users, Clock, AlertCircle } from 'lucide-react';
import { launchSimulation } from '../../../services/simulation/simulationService';
import { supabase } from '../../../lib/api/supabase';
import type { SimulationTemplateWithDetails } from '../types/simulation';

interface LaunchSimulationModalProps {
  template: SimulationTemplateWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const LaunchSimulationModal: React.FC<LaunchSimulationModalProps> = ({
  template,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',  // Start with empty field so user can customize
    duration_minutes: template.default_duration_minutes,
    participant_user_ids: [] as string[],
    participant_roles: [] as ('instructor' | 'student')[],
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Get all users from the current tenant
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, role')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserToggle = (userId: string, role: 'instructor' | 'student') => {
    const index = formData.participant_user_ids.indexOf(userId);
    
    if (index >= 0) {
      // Remove user
      const newIds = [...formData.participant_user_ids];
      const newRoles = [...formData.participant_roles];
      newIds.splice(index, 1);
      newRoles.splice(index, 1);
      setFormData({
        ...formData,
        participant_user_ids: newIds,
        participant_roles: newRoles,
      });
    } else {
      // Add user
      setFormData({
        ...formData,
        participant_user_ids: [...formData.participant_user_ids, userId],
        participant_roles: [...formData.participant_roles, role],
      });
    }
  };

  const getUserRole = (userId: string): 'instructor' | 'student' | null => {
    const index = formData.participant_user_ids.indexOf(userId);
    return index >= 0 ? formData.participant_roles[index] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.participant_user_ids.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await launchSimulation({
        template_id: template.id,
        name: formData.name,
        duration_minutes: formData.duration_minutes,
        participant_user_ids: formData.participant_user_ids,
        participant_roles: formData.participant_roles,
      });

      // RPC returns array with single row
      const launchResult = Array.isArray(result) ? result[0] : result;
      
      if (launchResult && launchResult.simulation_id) {
        alert(`Simulation launched successfully!\n\nSimulation ID: ${launchResult.simulation_id}\nTenant ID: ${launchResult.tenant_id}\n\nParticipants can now log in and access this simulation.`);
        onSuccess();
      } else {
        setError(launchResult?.message || 'Failed to launch simulation');
      }
    } catch (err: any) {
      console.error('Error launching simulation:', err);
      
      // Provide user-friendly error messages
      if (err.message?.includes('Template not found or not ready')) {
        setError('This template is not ready to launch. Please save a snapshot first by:\n1. Building your scenario (add patients, medications, etc.)\n2. Click the "Save Snapshot" button on the template\n3. Then try launching again');
      } else if (err.message?.includes('Template has no snapshot data')) {
        setError('This template has no saved snapshot. Please save a snapshot before launching.');
      } else {
        setError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Play className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Launch Simulation
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                From template: {template.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Warning if no snapshot */}
          {!template.snapshot_data && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900 dark:text-yellow-100">
                  <strong>Template Not Ready!</strong>
                  <p className="mt-1">This template has no saved snapshot. You must:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1 ml-2">
                    <li>Build your scenario (add patients, medications, etc.)</li>
                    <li>Click "Save Snapshot" button on the template</li>
                    <li>Then return here to launch</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {template.snapshot_data && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900 dark:text-green-100">
                  <strong>Launching will:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Create a new simulation tenant with template snapshot data</li>
                    <li>Grant selected participants access to the simulation</li>
                    <li>Start the simulation timer based on duration selected</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Simulation Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`e.g., Room 201 - ${template.name}, Class A Morning Session, ${new Date().toLocaleDateString()}`}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Give this simulation a unique name (e.g., room number, class section, or date)
            </p>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="duration"
              min="15"
              max="480"
              step="15"
              required
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Simulation will auto-complete after this time expires
            </p>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Select Participants <span className="text-red-500">*</span>
            </label>
            
            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : (
              <div className="border border-slate-300 dark:border-slate-600 rounded-lg max-h-64 overflow-y-auto">
                {users.map((user) => {
                  const selectedRole = getUserRole(user.id);
                  
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {user.email} • {user.role}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUserToggle(user.id, 'instructor')}
                          className={`
                            px-3 py-1 rounded text-sm font-medium transition-all
                            ${
                              selectedRole === 'instructor'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-purple-100 dark:bg-slate-600 dark:text-slate-300'
                            }
                          `}
                        >
                          Instructor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserToggle(user.id, 'student')}
                          className={`
                            px-3 py-1 rounded text-sm font-medium transition-all
                            ${
                              selectedRole === 'student'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-blue-100 dark:bg-slate-600 dark:text-slate-300'
                            }
                          `}
                        >
                          Student
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {formData.participant_user_ids.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {formData.participant_user_ids.length} participant(s) selected
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </form>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || formData.participant_user_ids.length === 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? 'Launching...' : 'Launch Simulation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LaunchSimulationModal;
