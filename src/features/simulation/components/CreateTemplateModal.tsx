/**
 * ===========================================================================
 * CREATE TEMPLATE MODAL
 * ===========================================================================
 * Form to create a new simulation template with tenant
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Tag } from 'lucide-react';
import { createSimulationTemplate } from '../../../services/simulation/simulationService';
import { getPrograms, type Program } from '../../../services/admin/programService';
import { useTenant } from '../../../contexts/TenantContext';
import { useUserProgramAccess } from '../../../hooks/useUserProgramAccess';

interface CreateTemplateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({ onClose, onSuccess }) => {
  const { currentTenant } = useTenant();
  const { programCodes, canSeeAllPrograms, isInstructor, isCoordinator } = useUserProgramAccess();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_duration_minutes: 120,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load programs on mount
  useEffect(() => {
    loadPrograms();
  }, [currentTenant]);

  const loadPrograms = async () => {
    if (!currentTenant?.id) return;
    
    const { data, error } = await getPrograms(currentTenant.id);
    if (!error && data) {
      setPrograms(data);
      
      // For instructors, pre-select their assigned programs
      if (isInstructor && programCodes && programCodes.length > 0) {
        const userProgramIds = data
          .filter(p => programCodes.includes(p.code))
          .map(p => p.id);
        setSelectedProgramIds(userProgramIds);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get selected program codes
      const selectedPrograms = programs
        .filter(p => selectedProgramIds.includes(p.id))
        .map(p => p.code);

      const result = await createSimulationTemplate({
        ...formData,
        primary_categories: selectedPrograms.length > 0 ? selectedPrograms : undefined
      });
      
      if (result.success) {
        alert(`Template created successfully!\n\nTemplate ID: ${result.template_id}\nTenant ID: ${result.tenant_id}\n\nYou can now build your scenario in this template tenant, then save a snapshot.`);
        onSuccess();
      } else {
        setError(result.message || 'Failed to create template');
      }
    } catch (err: any) {
      console.error('Error creating template:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Create Simulation Template
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Creating a template will:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Create a new simulation tenant</li>
                  <li>Allow you to build your scenario (add patients, medications, vitals)</li>
                  <li>Save a snapshot when ready to launch simulations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Template Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              placeholder="e.g., Cardiac Emergency Response"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white resize-none"
              placeholder="Brief description of the simulation scenario..."
            />
          </div>

          {/* Default Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Default Duration (minutes)
            </label>
            <input
              type="number"
              id="duration"
              min="15"
              max="480"
              step="15"
              value={formData.default_duration_minutes}
              onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This is a default value. You can change it when launching each simulation.
            </p>
          </div>

          {/* Program Categories */}
          {programs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Program Categories
              </label>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg p-4 space-y-2">
                {programs.map((program) => {
                  const isUserProgram = programCodes?.includes(program.code);
                  const isDisabled = isInstructor && !isUserProgram;
                  
                  return (
                    <label
                      key={program.id}
                      className={`flex items-center gap-2 ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProgramIds.includes(program.id)}
                        disabled={isDisabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProgramIds([...selectedProgramIds, program.id]);
                          } else {
                            setSelectedProgramIds(selectedProgramIds.filter(id => id !== program.id));
                          }
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium text-purple-600 dark:text-purple-400">{program.code}</span>
                        {' - '}
                        {program.name}
                        {isUserProgram && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Your Program)</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isInstructor
                  ? 'Templates will only be visible to instructors in the selected programs'
                  : canSeeAllPrograms
                  ? 'Select which programs should have access to this template'
                  : 'Instructors will only see templates for their assigned programs'}
              </p>
              {selectedProgramIds.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ No programs selected - template will be visible to ALL instructors
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTemplateModal;
