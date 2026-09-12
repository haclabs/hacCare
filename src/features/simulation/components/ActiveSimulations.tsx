import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Trash2, Tag, Printer, ClipboardList, KeyRound, AlertTriangle, X, Filter, Info } from 'lucide-react';
import { SUB_CATEGORIES } from '../types/simulation';
import type { SimulationActiveWithDetails } from '../types/simulation';
import { useTenant } from '../../../contexts/TenantContext';
import { getPrograms, type Program } from '../../../services/admin/programService';
import { SimulationLabelPrintModal } from './SimulationLabelPrintModal';
import { InstructorNameModal } from './InstructorNameModal';
import { UnnamedStudentModal } from './UnnamedStudentModal';
import { CompletionSummaryModal } from './CompletionSummaryModal';
import VersionComparisonModal from './VersionComparisonModal';
import { SimulationCard } from './SimulationCard';
import { SimulationInstructorGuide } from './SimulationInstructorGuide';
import { SimulationStatusSummary, type StatusQuickFilter } from './SimulationStatusSummary';
import { EditCategoriesModal } from './EditCategoriesModal';
import { SimulationAutoStudentsModal } from './SimulationAutoStudentsModal';
import { SeedTestDataResultsPanel } from './SeedTestDataResultsPanel';
import { seedTestDataForTenant, type SeedPatientResult } from '../utils/seedTestData';
import { useAuth } from '../../../contexts/auth/useAuth';
import { secureLogger } from '../../../lib/security/secureLogger';
import { useActiveSimulations } from '../hooks/useActiveSimulations';
import { printMedicationChecklist } from '../../../utils/medicationChecklistPrinter';

/** Deterministic pill color, cycling through a fixed palette by index — DB programs have no stored color */
const CATEGORY_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-amber-100 text-amber-800',
];

const ActiveSimulations: React.FC = () => {
  const { profile } = useAuth();
  const { currentTenant, exitSimulationTenant } = useTenant();
  const [seedingSimId, setSeedingSimId] = useState<string | null>(null);
  const [seedResults, setSeedResults] = useState<SeedPatientResult[] | null>(null);
  const [viewLoginsSimulation, setViewLoginsSimulation] = useState<SimulationActiveWithDetails | null>(null);
  const [checklistSimId, setChecklistSimId] = useState<string | null>(null);
  const [statusQuickFilter, setStatusQuickFilter] = useState<StatusQuickFilter>('all');
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      if (!currentTenant) return;
      // Resolve the owning institution (not the program sub-tenant) so the filter
      // never shows another institution's programs.
      const institutionTenantId = currentTenant.tenant_type === 'program' && currentTenant.parent_tenant_id
        ? currentTenant.parent_tenant_id
        : currentTenant.id;
      const { data } = await getPrograms(institutionTenantId);
      if (data) setPrograms(data);
    };
    loadPrograms();
  }, [currentTenant]);
  const {
    simulations,
    filteredSimulations,
    loading,
    actionLoading,
    printLabelsSimulation, setPrintLabelsSimulation,
    resetModalOpen, setResetModalOpen,
    resetTemplateStates,
    selectedResetStateId, setSelectedResetStateId,
    selectedPrimaryCategories, setSelectedPrimaryCategories,
    selectedSubCategories, setSelectedSubCategories,
    editCategoriesModal, setEditCategoriesModal,
    completingSimulation, setCompletingSimulation,
    pendingCompletion, setPendingCompletion,
    versionComparisonModal, setVersionComparisonModal,
    completionSummary, setCompletionSummary,
    handlePause,
    handleResume,
    handleReset,
    confirmReset,
    handleViewTemplateChanges,
    handleSyncWithTemplateUpdates,
    handleRelaunchRequired,
    handleComplete,
    handleCompleteWithInstructor,
    handleCompleteWithStudentName,
    handleCompleteSkipStudent,
    handleDelete,
    handleEditCategories,
    handleSaveCategories,
  } = useActiveSimulations();

  const handleSeedTestData = async (sim: SimulationActiveWithDetails) => {
    if (!profile) return;

    const confirmed = window.confirm(
      `This will insert one QA_VALIDATION-tagged test row into every clinical table \n` +
      `for each patient in "${sim.name}" (the LIVE simulation tenant, not the template).\n\n` +
      `Use this to verify only student work is captured in the debrief, and that \n` +
      `resetting the simulation returns it to the template baseline.\n\nContinue?`
    );
    if (!confirmed) return;

    setSeedingSimId(sim.id);
    setSeedResults(null);
    try {
      const results = await seedTestDataForTenant(sim.tenant_id, {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
      });
      setSeedResults(results);
    } catch (error) {
      secureLogger.error('❌ Error seeding test data into active simulation:', error);
      alert(`Error seeding test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSeedingSimId(null);
    }
  };

  /** If the instructor is still physically inside the simulation they just completed, kick them back home. */
  const handleCloseCompletionSummary = async () => {
    const shouldExit = completionSummary?.completed && currentTenant?.id === completionSummary.tenantId;
    setCompletionSummary(null);
    if (shouldExit) {
      try {
        await exitSimulationTenant();
        window.location.href = profile?.simulation_only ? '/app/simulation-portal' : '/app';
      } catch (error) {
        secureLogger.error('Error exiting completed simulation tenant:', error);
      }
    }
  };

  const handlePrintChecklist = async (sim: SimulationActiveWithDetails) => {
    setChecklistSimId(sim.id);
    try {
      await printMedicationChecklist(sim);
    } finally {
      setChecklistSimId(null);
    }
  };

  const visibleSimulations = filteredSimulations.filter(sim => {
    switch (statusQuickFilter) {
      case 'running':
        return sim.status === 'running' && !sim.is_expired;
      case 'needs-completing':
        return (sim.status === 'running' || sim.status === 'paused') && !!sim.is_expired;
      case 'needs-reset':
        return sim.status === 'completed';
      case 'ready':
        return sim.status === 'pending';
      default:
        return true;
    }
  });

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
        <Play className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-sm font-semibold text-gray-700 mb-1">No Active Simulations</h3>
        <p className="text-xs text-gray-500">
          Launch a simulation from the Templates tab to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Category Filters */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-700">Filter by Category</h3>
          {(selectedPrimaryCategories.length > 0 || selectedSubCategories.length > 0) && (
            <button
              onClick={() => { setSelectedPrimaryCategories([]); setSelectedSubCategories([]); }}
              className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 mb-2">Primary (Program):</div>
            <div className="flex flex-wrap gap-2">
              {programs.map((program, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <button
                    key={program.id}
                    onClick={() => {
                      if (selectedPrimaryCategories.includes(program.code)) {
                        setSelectedPrimaryCategories(selectedPrimaryCategories.filter(c => c !== program.code));
                      } else {
                        setSelectedPrimaryCategories([...selectedPrimaryCategories, program.code]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedPrimaryCategories.includes(program.code)
                        ? color + ' ring-2 ring-blue-500'
                        : color + ' opacity-50 hover:opacity-100'
                    }`}
                  >
                    {program.code}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2">Sub-Category (Type):</div>
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
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedSubCategories.includes(category.value)
                      ? category.color + ' ring-2 ring-purple-500'
                      : category.color + ' opacity-50 hover:opacity-100'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 mt-3">
          Showing {visibleSimulations.length} of {simulations.length} simulations
          {statusQuickFilter !== 'all' && ' (status filter applied)'}
        </div>

        {/* Card Action Icon Legend */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3 w-3 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Card Icons</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { icon: Tag, color: 'text-purple-600', label: 'Edit Categories' },
              { icon: Printer, color: 'text-indigo-600', label: 'Print Labels' },
              { icon: ClipboardList, color: 'text-teal-700', label: 'Print Checklist' },
              { icon: KeyRound, color: 'text-teal-600', label: 'View Student Logins' },
              { icon: Play, color: 'text-green-600', label: 'Start / Resume' },
              { icon: Pause, color: 'text-yellow-600', label: 'Pause' },
              { icon: RotateCcw, color: 'text-blue-600', label: 'Reset' },
              { icon: CheckCircle, color: 'text-emerald-600', label: 'Complete' },
              { icon: Trash2, color: 'text-red-600', label: 'Delete' },
            ].map(({ icon: Icon, color, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Status Summary - clickable quick filters */}
      <SimulationStatusSummary
        simulations={filteredSimulations}
        activeFilter={statusQuickFilter}
        onFilterChange={setStatusQuickFilter}
      />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-100 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        {/* Left Column - Active Simulations */}
        <div className="lg:col-span-2 space-y-4">
          {visibleSimulations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No simulations match this status filter.</p>
              <button
                onClick={() => setStatusQuickFilter('all')}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Clear status filter
              </button>
            </div>
          ) : visibleSimulations.map((sim) => (
            <SimulationCard
              key={sim.id}
              sim={sim}
              actionLoading={actionLoading}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onEditCategories={handleEditCategories}
              onPrintLabels={setPrintLabelsSimulation}
              onViewTemplateChanges={handleViewTemplateChanges}
              onViewLogins={setViewLoginsSimulation}
              onPrintChecklist={handlePrintChecklist}
              checklistLoading={checklistSimId === sim.id}
              onSeedTestData={profile?.role === 'super_admin' ? handleSeedTestData : undefined}
              seeding={seedingSimId === sim.id}
            />
          ))}
        </div>

        {/* Right Column - Instructor Guide */}
        <SimulationInstructorGuide />
      </div>

      {/* Seed Test Data Results */}
      {seedResults && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SeedTestDataResultsPanel results={seedResults} onClose={() => setSeedResults(null)} />
        </div>
      )}

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
        <EditCategoriesModal
          editCategoriesModal={editCategoriesModal}
          setEditCategoriesModal={setEditCategoriesModal}
          actionLoading={actionLoading}
          onSave={handleSaveCategories}
          programs={programs}
        />
      )}

      {/* Auto-Generated Student Logins Modal */}
      {viewLoginsSimulation && (
        <SimulationAutoStudentsModal
          simulationId={viewLoginsSimulation.id}
          simulationName={viewLoginsSimulation.name}
          onClose={() => setViewLoginsSimulation(null)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-4 border-red-400">
            <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3 rounded-t-xl">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-red-900">Reset Simulation Warning</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Ensure you have <span className="font-semibold text-red-700">completed the simulation</span> before resetting.
              </p>
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
                <p className="text-sm font-semibold text-red-800">
                  All student work will be permanently lost if you reset without completing first.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Reminder:</strong> Click "Complete Simulation" first to save student activities to debrief report before resetting.
                </p>
              </div>
              {resetTemplateStates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Reset into state
                  </label>
                  <select
                    value={selectedResetStateId ?? ''}
                    onChange={(e) => setSelectedResetStateId(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Current / Default</option>
                    {resetTemplateStates.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                  {selectedResetStateId && (
                    <p className="text-xs text-slate-500 mt-1">
                      {resetTemplateStates.find(s => s.id === selectedResetStateId)?.changelog_note || 'No changelog note provided.'}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setResetModalOpen(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
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
          programCodes={completingSimulation.primary_categories || []}
          onConfirm={handleCompleteWithInstructor}
          onCancel={() => setCompletingSimulation(null)}
        />
      )}

      {/* Unnamed Student Modal — shown when clinical records exist but student_name is blank */}
      {pendingCompletion && (
        <UnnamedStudentModal
          simulationName={pendingCompletion.simulationName}
          unnamedCount={pendingCompletion.unnamedCount}
          onConfirm={handleCompleteWithStudentName}
          onSkip={handleCompleteSkipStudent}
          onCancel={() => setPendingCompletion(null)}
        />
      )}

      {/* Completion Summary Modal — replaces alert() after simulation is completed */}
      {completionSummary && (
        <CompletionSummaryModal
          simulationName={completionSummary.simulationName}
          instructorName={completionSummary.instructorName}
          activities={completionSummary.activities}
          warnings={completionSummary.warnings}
          completed={completionSummary.completed}
          onClose={handleCloseCompletionSummary}
        />
      )}

      {/* Version Comparison Modal */}
      {versionComparisonModal && (
        <VersionComparisonModal
          templateId={versionComparisonModal.simulation.template_id}
          versionOld={(versionComparisonModal.simulation as any).template_running_version || 1}
          versionNew={(versionComparisonModal.simulation as any).template_current_version || 1}
          simulationId={versionComparisonModal.simulation.id}
          patientComparison={versionComparisonModal.patientComparison}
          onClose={() => setVersionComparisonModal(null)}
          onSyncWithPreservation={handleSyncWithTemplateUpdates}
          onRelaunchRequired={handleRelaunchRequired}
        />
      )}
    </div>
  );
};

export default ActiveSimulations;
