import React, { useState, useEffect, useCallback } from 'react';
import { X, Printer, Users, Pill, AlertTriangle } from 'lucide-react';
import { fetchAllLabelsForPrinting, BulkLabelData } from '../../../services/operations/bulkLabelService';
import { secureLogger } from '../../../lib/security/secureLogger';
import type { SimulationParticipant } from './labelPrintingUtils';
import { PatientBraceletsModal } from './PatientBraceletsModal';
import { MedicationLabelsModal } from './MedicationLabelsModal';
import { AllLabelsModal } from './AllLabelsModal';
interface SimulationLabelPrintModalProps {
  simulationName: string;
  tenantId: string;
  participants?: Array<{ user_profiles?: { first_name?: string; last_name?: string; } | null; role?: string; }>;
  onClose: () => void;
}

/**
 * Main Modal Component - Fetches and displays labels for a specific simulation
 */
export const SimulationLabelPrintModal: React.FC<SimulationLabelPrintModalProps> = ({
  simulationName,
  tenantId,
  participants = [],
  onClose
}) => {
  const [labels, setLabels] = useState<BulkLabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPatientBracelets, setShowPatientBracelets] = useState(false);
  const [showMedicationLabels, setShowMedicationLabels] = useState(false);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [patientQuantity, setPatientQuantity] = useState(1);
  const [startRow, setStartRow] = useState(1);
  const [medicationQuantity, setMedicationQuantity] = useState(1);

  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      secureLogger.debug('🏷️ Fetching labels for simulation:', simulationName);
      secureLogger.debug('🆔 Using Tenant ID:', tenantId);
      
      const labelsData = await fetchAllLabelsForPrinting(tenantId);
      
      secureLogger.debug('✅ Successfully loaded labels:', {
        patients: labelsData.patients.length,
        medications: labelsData.medications.length,
        simulation: simulationName
      });
      
      setLabels(labelsData);
    } catch (err) {
      secureLogger.error('❌ Error fetching labels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch label data');
    } finally {
      setLoading(false);
    }
  }, [tenantId, simulationName]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Print Labels</h2>
              <p className="text-sm text-gray-600 mt-1">{simulationName}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center text-sm text-gray-700">
                <span className="mr-2 font-medium">Start at row:</span>
                <select
                  value={startRow}
                  onChange={(e) => setStartRow(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(row => (
                    <option key={row} value={row}>Row {row}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900">Error</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {labels && !loading && (
                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-blue-900">Patient Bracelets</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mb-1">
                      {labels.patients.length}
                    </p>
                    <p className="text-sm text-blue-700 mb-4">
                      Patient identification labels
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-sm font-medium text-blue-900">Qty per patient:</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={patientQuantity}
                        onChange={(e) => setPatientQuantity(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="w-16 px-2 py-1 border border-blue-300 rounded text-center font-medium"
                      />
                      <span className="text-sm text-blue-700 font-medium">
                        = {labels.patients.length * patientQuantity} labels
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPatientBracelets(true)}
                      disabled={labels.patients.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <Pill className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-green-900">Medication Labels</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mb-1">
                      {labels.medications.length}
                    </p>
                    <p className="text-sm text-green-700 mb-4">
                      MAR medication labels
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-sm font-medium text-green-900">Qty per medication:</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={medicationQuantity}
                        onChange={(e) => setMedicationQuantity(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="w-16 px-2 py-1 border border-green-300 rounded text-center font-medium"
                      />
                      <span className="text-sm text-green-700 font-medium">
                        = {labels.medications.length * medicationQuantity} labels
                      </span>
                    </div>
                    <button
                      onClick={() => setShowMedicationLabels(true)}
                      disabled={labels.medications.length === 0}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                </div>

                {/* Print All Labels Button */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowAllLabels(true)}
                    disabled={labels.patients.length === 0 && labels.medications.length === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-medium text-base"
                  >
                    <Printer className="h-5 w-5" />
                    Print All Labels (1 header + {labels.patients.length * patientQuantity} bracelets + {labels.medications.length * medicationQuantity} medications = {1 + labels.patients.length * patientQuantity + labels.medications.length * medicationQuantity} labels)
                  </button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Printing Instructions</h4>
                      <ul className="text-yellow-800 text-sm mt-1 space-y-1">
                        <li>• Use Avery 5160 label sheets (30 labels per sheet)</li>
                        <li>• Select high-quality print setting for barcode clarity</li>
                        <li>• Test print one sheet before bulk printing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Bracelets Modal */}
      {showPatientBracelets && labels && labels.patients.length > 0 && (
        <PatientBraceletsModal
          patients={labels.patients}
          simulationName={simulationName}
          participants={participants}
          onClose={() => setShowPatientBracelets(false)}
          quantity={patientQuantity}
          startRow={startRow}
        />
      )}

      {/* Medication Labels Modal */}
      {showMedicationLabels && labels && labels.medications.length > 0 && (
        <MedicationLabelsModal
          medications={labels.medications}
          simulationName={simulationName}
          participants={participants}
          onClose={() => setShowMedicationLabels(false)}
          quantity={medicationQuantity}
          startRow={startRow}
        />
      )}

      {/* All Labels Modal */}
      {showAllLabels && labels && (
        <AllLabelsModal
          patients={labels.patients}
          medications={labels.medications}
          simulationName={simulationName}
          participants={participants}
          onClose={() => setShowAllLabels(false)}
          patientQuantity={patientQuantity}
          medicationQuantity={medicationQuantity}
          startRow={startRow}
        />
      )}
    </>
  );
};
