/**
 * ===========================================================================
 * VERSION COMPARISON MODAL
 * ===========================================================================
 * Shows differences between two template versions
 * Helps instructors decide whether to sync simulations
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Plus, Minus } from 'lucide-react';
import { compareTemplateVersions, compareSimulationVsTemplate } from '../../../services/simulation/simulationService';
import type {  SimulationTemplateVersion, PatientListComparison } from '../types/simulation';

interface Props {
  templateId: string;
  versionOld: number;
  versionNew: number;
  simulationId?: string; // If comparing for simulation sync
  patientComparison?: PatientListComparison;
  onClose: () => void;
  onSyncWithPreservation?: () => void;
  onRelaunchRequired?: () => void;
}

interface VersionDiff {
  template_id: string;
  version_old: number;
  version_new: number;
  patient_count_old: number;
  patient_count_new: number;
  medication_count_old: number;
  medication_count_new: number;
  order_count_old: number;
  order_count_new: number;
  wound_count_old: number;
  wound_count_new: number;
  device_count_old: number;
  device_count_new: number;
  snapshot_old: any;
  snapshot_new: any;
}

export default function VersionComparisonModal({
  templateId,
  versionOld,
  versionNew,
  simulationId,
  patientComparison,
  onClose,
  onSyncWithPreservation,
  onRelaunchRequired,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [templateId, versionOld, versionNew, simulationId]);

  async function loadComparison() {
    try {
      setLoading(true);
      // If comparing for simulation sync, use actual simulation data
      const data = simulationId 
        ? await compareSimulationVsTemplate(simulationId)
        : await compareTemplateVersions(templateId, versionOld, versionNew);
      setDiff(data);
    } catch (err: any) {
      console.error('Error loading version comparison:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderCountChange(label: string, oldCount: number, newCount: number) {
    const change = newCount - oldCount;
    if (change === 0) {
      return (
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-600">{newCount} (unchanged)</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{oldCount} → {newCount}</span>
          {change > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
              <Plus className="h-3 w-3" />
              {change} added
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
              <Minus className="h-3 w-3" />
              {Math.abs(change)} removed
            </span>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700">Comparing versions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Error Loading Comparison</h3>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!diff) return null;

  const patientsChanged = diff.patient_count_new !== diff.patient_count_old;
  const canPreserveBarcodes = patientComparison ? patientComparison.barcodes_can_preserve : !patientsChanged;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Template Changes: v{versionOld} → v{versionNew}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {simulationId ? 'Review changes before syncing simulation' : 'Version comparison'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient List Warning */}
          {patientsChanged && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900 mb-1">
                    Patient List Changed
                  </h4>
                  <p className="text-sm text-amber-800 mb-2">
                    Template patient count changed from {diff.patient_count_old} to {diff.patient_count_new}.
                  </p>
                  {patientComparison && (
                    <div className="space-y-1 text-xs text-amber-700">
                      {patientComparison.patients_added.length > 0 && (
                        <p>➕ Added: {patientComparison.patients_added.map(p => `${p.first_name} ${p.last_name}`).join(', ')}</p>
                      )}
                      {patientComparison.patients_removed.length > 0 && (
                        <p>➖ Removed: {patientComparison.patients_removed.map(p => `${p.first_name} ${p.last_name}`).join(', ')}</p>
                      )}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-amber-900 mt-2">
                    ⚠️ All patients will get NEW barcodes. You must print new labels!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Indicator */}
          {canPreserveBarcodes && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    Barcodes Can Be Preserved
                  </h4>
                  <p className="text-sm text-green-800">
                    Patient list unchanged - existing barcode labels will continue to work.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Changes Summary */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">What Changed</h4>
            <div className="space-y-2">
              {renderCountChange('Patients', diff.patient_count_old, diff.patient_count_new)}
              {renderCountChange('Medications', diff.medication_count_old, diff.medication_count_new)}
              {renderCountChange('Orders', diff.order_count_old, diff.order_count_new)}
              {renderCountChange('Wounds', diff.wound_count_old, diff.wound_count_new)}
              {renderCountChange('Devices', diff.device_count_old, diff.device_count_new)}
            </div>
          </div>

          {/* Medication Details (if changed) */}
          {diff.medication_count_new > diff.medication_count_old && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-blue-900 mb-2">
                New Medications Added
              </h5>
              <p className="text-sm text-blue-800">
                {diff.medication_count_new - diff.medication_count_old} new medications will need barcode labels printed.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex gap-3">
            {simulationId && canPreserveBarcodes && onSyncWithPreservation && (
              <button
                onClick={onSyncWithPreservation}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Sync to v{versionNew} - Keep Barcodes
              </button>
            )}
            
            {simulationId && !canPreserveBarcodes && onRelaunchRequired && (
              <button
                onClick={onRelaunchRequired}
                className="flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 font-medium transition-colors"
              >
                Delete & Relaunch - New Barcodes Required
              </button>
            )}
            
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              {simulationId ? `Stay on v${versionOld}` : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
