/**
 * Template Editing Banner
 * Shows when instructor is editing a simulation template
 * Provides context and "Save & Exit" button to return to template list
 */

import React, { useState, useEffect } from 'react';
import { Edit, Save, BookOpen, Loader2, FlaskConical, UserPlus, ChevronDown, Layers, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';
import { useAuth } from '../../../contexts/auth/useAuth';
import { saveTemplateSnapshot, saveTemplateState } from '../../../services/simulation/simulationService';
import { savePatientTemplateSnapshot } from '../../../services/simulation/patientTemplateService';
import { seedTestDataForTenant, type SeedPatientResult } from '../utils/seedTestData';
import { SeedTestDataResultsPanel } from './SeedTestDataResultsPanel';
import { AddPatientFromLibraryModal } from './AddPatientFromLibraryModal';
import { secureLogger } from '../../../lib/security/secureLogger';

interface TemplateEditingInfo {
  template_id: string;
  template_name: string;
  tenant_id: string;
  /** 'simulation' (default, backward compatible) or 'patient' for the Patient Library */
  kind?: 'simulation' | 'patient';
}

export const TemplateEditingBanner: React.FC = () => {
  const [editingInfo, setEditingInfo] = useState<TemplateEditingInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResults, setSeedResults] = useState<SeedPatientResult[] | null>(null);
  const [showAddFromLibrary, setShowAddFromLibrary] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showSaveAsStateModal, setShowSaveAsStateModal] = useState(false);
  const [stateLabel, setStateLabel] = useState('');
  const [stateChangelogNote, setStateChangelogNote] = useState('');
  const [savingState, setSavingState] = useState(false);
  const navigate = useNavigate();
  const { currentTenant, enterTemplateTenant, exitTemplateTenant } = useTenant();
  const { profile } = useAuth();
  const isPatientTemplate = editingInfo?.kind === 'patient';

  useEffect(() => {
    // Check if we're editing a template on mount
    const checkEditingState = async () => {
      const stored = sessionStorage.getItem('editing_template');
      secureLogger.debug('🔍 Banner: Checking editing state:', stored);
      if (stored) {
        const info: TemplateEditingInfo = JSON.parse(stored);
        setEditingInfo(info);
        
        // Switch to the template's tenant and grant instructor access
        if (info.tenant_id && info.tenant_id !== currentTenant?.id) {
          secureLogger.debug('🔄 Banner: Switching to template tenant:', info.tenant_id);
          try {
            await enterTemplateTenant(info.tenant_id);
            secureLogger.debug('✅ Banner: Successfully switched to template tenant');
          } catch (error) {
            secureLogger.error('❌ Banner: Failed to switch to template tenant:', error);
          }
        } else {
          secureLogger.debug('ℹ️ Banner: Already in template tenant');
        }
      } else {
        setEditingInfo(null);
        secureLogger.debug('ℹ️ Banner: No editing_template found in sessionStorage');
      }
    };

    // Check on mount
    checkEditingState();

    // Listen for custom event when editing starts
    const handleEditStart = async (e: Event) => {
      const customEvent = e as CustomEvent;
      secureLogger.debug('📢 Banner: Received template-edit-start event:', customEvent.detail);
      const info = customEvent.detail as TemplateEditingInfo;
      setEditingInfo(info);
      
      // Switch to template's tenant
      if (info.tenant_id && info.tenant_id !== currentTenant?.id) {
        try {
          await enterTemplateTenant(info.tenant_id);
          secureLogger.debug('✅ Banner: Successfully switched to template tenant (from event)');
        } catch (error) {
          secureLogger.error('❌ Banner: Failed to switch to template tenant (from event):', error);
        }
      }
    };

    window.addEventListener('template-edit-start', handleEditStart);

    return () => {
      window.removeEventListener('template-edit-start', handleEditStart);
    };
  }, [currentTenant, enterTemplateTenant]);

  const handleExitTemplate = async () => {
    if (!editingInfo) return;

    secureLogger.debug('🚪 Banner: Exiting template editing mode');
    
    setSaving(true);
    
    try {
      // Step 1: Save the snapshot (right RPC depending on what's being edited)
      secureLogger.debug('💾 Banner: Saving template snapshot...');
      const result = isPatientTemplate
        ? await savePatientTemplateSnapshot(editingInfo.template_id)
        : await saveTemplateSnapshot(editingInfo.template_id);
      
      if (result.success) {
        secureLogger.debug('✅ Banner: Snapshot saved successfully');
        
        // Show success message with details
        const recordCount = result.records_captured || 0;
        const tableCount = result.tables_captured || 0;
        alert(`✅ Template saved successfully!\n\n${recordCount} records captured from ${tableCount} tables.\n\nReturning to templates...`);
      } else {
        secureLogger.error('❌ Banner: Failed to save snapshot:', result.message);
        alert(`❌ Failed to save template:\n\n${result.message}`);
        setSaving(false);
        return; // Don't exit if save failed
      }
      
      // Step 2: Clear the editing state
      sessionStorage.removeItem('editing_template');
      setEditingInfo(null);

      // Step 3: Exit template tenant (returns to home tenant)
      secureLogger.debug('🔙 Banner: Exiting template tenant');
      await exitTemplateTenant();
      secureLogger.debug('✅ Banner: Successfully exited template tenant');
      
      // Step 4: Navigate back to the right list screen
      navigate(isPatientTemplate ? '/app?tab=patient-library' : '/app?tab=simulations');
      
    } catch (error) {
      secureLogger.error('❌ Banner: Error during save/exit:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save template'}`);
    } finally {
      setSaving(false);
    }
  };

  /** Saves the template tenant's current data as a new named state (e.g. "Week 2") instead of overwriting the default snapshot, then exits editing. */
  const handleSaveAsNewState = async () => {
    if (!editingInfo || !stateLabel.trim()) return;

    setSavingState(true);
    try {
      const result = await saveTemplateState(editingInfo.template_id, stateLabel.trim(), stateChangelogNote.trim() || undefined);

      if (!result.success) {
        alert(`❌ Failed to save state:\n\n${result.message}`);
        return;
      }

      alert(`✅ State "${stateLabel.trim()}" saved!\n\n${result.records_captured || 0} records captured from ${result.tables_captured || 0} tables.\n\nReturning to templates...`);

      setShowSaveAsStateModal(false);
      setStateLabel('');
      setStateChangelogNote('');
      sessionStorage.removeItem('editing_template');
      setEditingInfo(null);
      await exitTemplateTenant();
      navigate('/app?tab=simulations');
    } catch (error) {
      secureLogger.error('❌ Banner: Error saving template state:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save state'}`);
    } finally {
      setSavingState(false);
    }
  };

  const handleSeedTestData = async () => {
    if (!editingInfo || !profile) return;

    const confirmed = window.confirm(
      'This will insert one QA_VALIDATION-tagged test row into every clinical table ' +
      'for each patient in this template, using the real save functions (vitals, meds, ' +
      'labs, wounds/devices, admission/directives, BBIT/neuro/newborn, all 15 flowsheet ' +
      'assessments, and the 6 TR module tables).\n\nContinue?'
    );
    if (!confirmed) return;

    setSeeding(true);
    setSeedResults(null);
    try {
      const results = await seedTestDataForTenant(editingInfo.tenant_id, {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
      });
      setSeedResults(results);
    } catch (error) {
      secureLogger.error('❌ Banner: Error seeding test data:', error);
      alert(`Error seeding test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  if (!editingInfo) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-[#3fbf9a] to-[#2f9e80] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 xl:px-12 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Template Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Edit className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wide">
                {isPatientTemplate ? 'Editing Patient Template' : 'Editing Template'}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">{editingInfo.template_name}</span>
            </div>
          </div>

          {/* Right: Add Patient from Library (simulation templates only) + Seed Test Data (super_admin only) + Save Button */}
          <div className="flex items-center gap-2">
            {!isPatientTemplate && (
              <button
                onClick={() => setShowAddFromLibrary(true)}
                title="Add a patient from the Patient Library into this simulation template"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium text-sm shadow-md hover:shadow-lg"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden lg:inline">Add Patient from Library</span>
              </button>
            )}
            {profile?.role === 'super_admin' && (
              <button
                onClick={handleSeedTestData}
                disabled={seeding || saving}
                title="Seed one QA_VALIDATION test row into every clinical table (dev validation tool)"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium text-sm shadow-md hover:shadow-lg"
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                <span className="hidden lg:inline">{seeding ? 'Seeding...' : 'Seed Test Data'}</span>
              </button>
            )}
            <div className="relative flex items-center">
              <button
                onClick={handleExitTemplate}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-md hover:shadow-lg ${
                  isPatientTemplate ? 'rounded-lg' : 'rounded-l-lg'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">Save & Exit</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </button>
              {!isPatientTemplate && (
                <button
                  onClick={() => setShowSaveMenu(v => !v)}
                  disabled={saving}
                  title="More save options"
                  className="flex items-center px-2 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-r-lg border-l border-white/20 transition-colors shadow-md hover:shadow-lg"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
              {showSaveMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 text-gray-800">
                  <button
                    onClick={() => { setShowSaveMenu(false); handleExitTemplate(); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Save className="h-3.5 w-3.5 text-blue-600" />
                    Update Template
                  </button>
                  <button
                    onClick={() => { setShowSaveMenu(false); setShowSaveAsStateModal(true); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Layers className="h-3.5 w-3.5 text-purple-600" />
                    Save as New State…
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seed results panel */}
      {seedResults && (
        <SeedTestDataResultsPanel results={seedResults} onClose={() => setSeedResults(null)} />
      )}

      {/* Save as New State modal */}
      {showSaveAsStateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Save as New State
              </h3>
              <button onClick={() => setShowSaveAsStateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">
                Captures this template's current data as a new named state (e.g. "Week 2"). The template's
                default snapshot is left untouched. Instructors can pick this state when resetting an active
                simulation.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                <input
                  autoFocus
                  type="text"
                  value={stateLabel}
                  onChange={(e) => setStateLabel(e.target.value)}
                  placeholder="e.g. Week 2 - Deterioration"
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Changelog note (optional)</label>
                <textarea
                  value={stateChangelogNote}
                  onChange={(e) => setStateChangelogNote(e.target.value)}
                  placeholder="What changed for this state?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowSaveAsStateModal(false)}
                  disabled={savingState}
                  className="flex-1 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsNewState}
                  disabled={savingState || !stateLabel.trim()}
                  className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  Save & Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient from Library modal */}
      {showAddFromLibrary && (
        <AddPatientFromLibraryModal
          simulationTemplateId={editingInfo.template_id}
          onClose={() => setShowAddFromLibrary(false)}
        />
      )}
    </div>
  );
};
