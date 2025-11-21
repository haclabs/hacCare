/**
 * ===========================================================================
 * SIMULATION TEMPLATES TAB
 * ===========================================================================
 * Template management with Create/Edit/Snapshot/Launch functionality
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Play, Save, Trash2, Camera, Upload } from 'lucide-react';
import { getSimulationTemplates, saveTemplateSnapshot, deleteSimulationTemplate } from '../../../services/simulation/simulationService';
import type { SimulationTemplateWithDetails } from '../types/simulation';
import CreateTemplateModal from './CreateTemplateModal';
import LaunchSimulationModal from './LaunchSimulationModal';
import TemplateExportButton from './TemplateExportButton';
import TemplateImportModal from './TemplateImportModal';
import { formatDistanceToNow } from 'date-fns';

const SimulationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<SimulationTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SimulationTemplateWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getSimulationTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = async (templateId: string) => {
    setActionLoading(templateId);
    try {
      const result = await saveTemplateSnapshot(templateId);
      if (result.success) {
        alert('Snapshot saved successfully!');
        await loadTemplates();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving snapshot:', error);
      alert('Failed to save snapshot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template? This will NOT delete active simulations using this template.')) {
      return;
    }
    setActionLoading(templateId);
    try {
      await deleteSimulationTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLaunch = (template: SimulationTemplateWithDetails) => {
    setSelectedTemplate(template);
    setShowLaunchModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with Create and Import Buttons */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Simulation Templates
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create and manage simulation scenarios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import Template
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No Templates Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create your first simulation template to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <span
                      className={`
                        inline-block px-2 py-1 rounded text-xs font-medium
                        ${
                          template.status === 'ready'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : template.status === 'draft'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                        }
                      `}
                    >
                      {template.status}
                    </span>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-500 mb-4 space-y-1">
                  <div>Default duration: {template.default_duration_minutes} minutes</div>
                  <div>Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</div>
                  {template.snapshot_data && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Camera className="h-3 w-3" />
                      Snapshot saved
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLaunch(template)}
                    disabled={!template.snapshot_data || actionLoading === template.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title={!template.snapshot_data ? 'Save snapshot first' : 'Launch simulation'}
                  >
                    <Play className="h-4 w-4" />
                    Launch
                  </button>
                  <button
                    onClick={() => handleSaveSnapshot(template.id)}
                    disabled={actionLoading === template.id}
                    className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg disabled:opacity-50"
                    title="Save current state as snapshot"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <TemplateExportButton
                    templateId={template.id}
                    templateName={template.name}
                    disabled={!template.snapshot_data || actionLoading === template.id}
                  />
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={actionLoading === template.id}
                    className="p-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg disabled:opacity-50"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How To Guide */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                How to Use Simulation Templates
              </h3>
              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">1</span>
                    Create a Template
                  </h4>
                  <p className="ml-8">
                    Click "Create Template" above. Give it a name, description, and set the default duration. 
                    A new template tenant will be created with <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-mono text-xs">draft</span> status.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">2</span>
                    Build Your Scenario
                  </h4>
                  <p className="ml-8">
                    Switch to the template's tenant and build your simulation scenario:
                  </p>
                  <ul className="ml-8 mt-2 space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                    <li>Add patients with medical histories</li>
                    <li>Set up medications and treatments</li>
                    <li>Configure vitals and assessments</li>
                    <li>Add any other data you want in the simulation</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">3</span>
                    Save Snapshot
                  </h4>
                  <p className="ml-8">
                    Once your scenario is ready, click the <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 text-xs font-medium">
                      <Save className="h-3 w-3 inline" /> Save Snapshot
                    </span> button. This captures all data and changes status to <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300 font-mono text-xs">ready</span>.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs">4</span>
                    Launch Simulation
                  </h4>
                  <p className="ml-8">
                    Click <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300 text-xs font-medium">
                      <Play className="h-3 w-3 inline" /> Launch
                    </span> to create a new simulation instance. Select participants (instructors and students) and set the duration. 
                    A new isolated tenant will be created with the snapshot data for participants to use.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-900 dark:text-yellow-100">
                  <strong>💡 Tip:</strong> You can launch the same template multiple times to run parallel simulations with different groups. 
                  Each launch creates a separate, isolated environment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTemplates();
          }}
        />
      )}

      {showImportModal && (
        <TemplateImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadTemplates();
          }}
        />
      )}

      {showLaunchModal && selectedTemplate && (
        <LaunchSimulationModal
          template={selectedTemplate}
          onClose={() => {
            setShowLaunchModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowLaunchModal(false);
            setSelectedTemplate(null);
            // Optionally switch to Active tab
          }}
        />
      )}
    </>
  );
};

export default SimulationTemplates;
