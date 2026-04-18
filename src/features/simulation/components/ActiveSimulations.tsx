import React from 'react';
import { Play, AlertTriangle, X, Filter } from 'lucide-react';
import { PRIMARY_CATEGORIES, SUB_CATEGORIES } from '../types/simulation';
import { SimulationLabelPrintModal } from './SimulationLabelPrintModal';
import { InstructorNameModal } from './InstructorNameModal';
import VersionComparisonModal from './VersionComparisonModal';
import { SimulationCard } from './SimulationCard';
import { SimulationInstructorGuide } from './SimulationInstructorGuide';
import { EditCategoriesModal } from './EditCategoriesModal';
import { useActiveSimulations } from '../hooks/useActiveSimulations';

const ActiveSimulations: React.FC = () => {
  const {
    simulations,
    filteredSimulations,
    loading,
    actionLoading,
    printLabelsSimulation, setPrintLabelsSimulation,
    resetModalOpen, setResetModalOpen,
    selectedPrimaryCategories, setSelectedPrimaryCategories,
    selectedSubCategories, setSelectedSubCategories,
    editCategoriesModal, setEditCategoriesModal,
    completingSimulation, setCompletingSimulation,
    versionComparisonModal, setVersionComparisonModal,
    handlePause,
    handleResume,
    handleReset,
    confirmReset,
    handleViewTemplateChanges,
    handleSyncWithTemplateUpdates,
    handleRelaunchRequired,
    handleComplete,
    handleCompleteWithInstructor,
    handleDelete,
    handleEditCategories,
    handleSaveCategories,
  } = useActiveSimulations();

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
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Active Simulations</h3>
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
              onClick={() => { setSelectedPrimaryCategories([]); setSelectedSubCategories([]); }}
              className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-3">
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
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedPrimaryCategories.includes(category.value)
                      ? category.color + ' ring-2 ring-blue-500'
                      : category.color + ' opacity-50 hover:opacity-100'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
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

        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Showing {filteredSimulations.length} of {simulations.length} simulations
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Active Simulations */}
        <div className="lg:col-span-2 space-y-4">
          {filteredSimulations.map((sim) => (
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
            />
          ))}
        </div>

        {/* Right Column - Instructor Guide */}
        <SimulationInstructorGuide />
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
        <EditCategoriesModal
          editCategoriesModal={editCategoriesModal}
          setEditCategoriesModal={setEditCategoriesModal}
          actionLoading={actionLoading}
          onSave={handleSaveCategories}
        />
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border-4 border-yellow-400 dark:border-yellow-500">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-4 border-b border-yellow-200 dark:border-yellow-700 flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100">Reset Simulation Warning</h3>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-base text-slate-700 dark:text-slate-300 font-medium mb-3">
                  ⚠️ Ensure you have <span className="text-red-600 dark:text-red-400 font-bold">completed the simulation</span> before resetting!
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>All student work will be permanently lost</strong> if you reset without completing first.
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Reminder:</strong> Click "Complete Simulation" first to save student activities to debrief report before resetting.
                </p>
              </div>
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
          programCodes={completingSimulation.primary_categories || []}
          onConfirm={handleCompleteWithInstructor}
          onCancel={() => setCompletingSimulation(null)}
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
