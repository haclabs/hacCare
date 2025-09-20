import React, { useState } from 'react';
import { Printer, Download, Users, Pill, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { fetchAllLabelsForPrinting, BulkLabelData, MedicationLabelData } from '../../lib/bulkLabelService';
import { BarcodeGenerator } from '../bcma/BarcodeGenerator';
import { PatientBracelet } from '../Patients/visuals/PatientBracelet';
import { Tenant } from '../../types';

interface MedicationLabelsModalProps {
  medications: MedicationLabelData[];
  onClose: () => void;
}

const MedicationLabelsModal: React.FC<MedicationLabelsModalProps> = ({ medications, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Medication Labels</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-3 gap-4 print:gap-2">
            {medications.map((medication) => (
              <div key={medication.id} className="border border-gray-300 p-2 bg-white">
                <div className="text-xs font-bold text-center border-b border-gray-200 pb-1 mb-2">
                  MEDICATION LABEL
                </div>
                <div className="text-sm font-bold mb-1">{medication.medication_name}</div>
                <div className="text-xs space-y-1">
                  <div>Patient: {medication.patient_name}</div>
                  <div>Dosage: {medication.dosage}</div>
                  <div>Frequency: {medication.frequency}</div>
                  <div>Route: {medication.route}</div>
                  <div>Prescriber: {medication.prescriber}</div>
                </div>
                <div className="mt-2 flex justify-center">
                  <BarcodeGenerator
                    data={`MED${medication.id.slice(-6).toUpperCase()}`}
                    type="medication"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .fixed { position: relative !important; }
              .bg-black { background: white !important; }
              .shadow-xl { box-shadow: none !important; }
              .rounded-lg { border-radius: 0 !important; }
              .border-b { display: none !important; }
              .overflow-hidden { overflow: visible !important; }
              .p-6 { padding: 0 !important; }
              .max-h-\\[90vh\\] { max-height: none !important; }
              .overflow-y-auto { overflow: visible !important; }
              .max-h-\\[70vh\\] { max-height: none !important; }
            }
          `
        }} />
      </div>
    </div>
  );
};

interface BulkLabelPrintProps {
  selectedTenant?: Tenant | null;
}

export const BulkLabelPrint: React.FC<BulkLabelPrintProps> = ({ selectedTenant }) => {
  const { profile, hasRole } = useAuth();
  const [labels, setLabels] = useState<BulkLabelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMedicationLabels, setShowMedicationLabels] = useState(false);
  const [showPatientBracelets, setShowPatientBracelets] = useState(false);

  const fetchLabels = async () => {
    if (!profile || !hasRole(['admin', 'super_admin'])) {
      setError('Insufficient permissions for bulk label printing');
      return;
    }

    if (!selectedTenant) {
      setError('Please select a tenant first to generate labels');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching bulk labels for tenant:', selectedTenant.id, selectedTenant.name);
      
      const labelsData = await fetchAllLabelsForPrinting(selectedTenant.id);
      setLabels(labelsData);
      
      console.log('✅ Successfully loaded bulk labels:', {
        patients: labelsData.patients.length,
        medications: labelsData.medications.length,
        tenant: selectedTenant.name
      });
    } catch (err) {
      console.error('Error fetching bulk labels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch label data');
    } finally {
      setLoading(false);
    }
  };

  // Check if tenant is selected
  if (!selectedTenant) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <Printer className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Bulk Label Printing</h2>
        <p className="text-gray-600 mb-4">Please select a tenant first to generate bulk labels.</p>
        <p className="text-sm text-gray-500">Navigate to the tenant overview tab and select a tenant to continue.</p>
      </div>
    );
  }

  // Check admin access
  if (!profile || !hasRole(['admin', 'super_admin'])) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You need admin privileges to access bulk label printing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Label Printing</h2>
            <p className="text-gray-600 mt-1">
              Generate all patient and medication labels for: <span className="font-medium text-blue-600">{selectedTenant.name}</span>
            </p>
          </div>
          
          <button
            onClick={fetchLabels}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Fetching...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Fetch All Labels
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
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

      {/* Labels Summary */}
      {labels && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bulk Label Preview</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPatientBracelets(true)}
                disabled={labels.patients.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users className="w-4 h-4" />
                Patient Bracelets ({labels.patients.length})
              </button>
              <button
                onClick={() => setShowMedicationLabels(true)}
                disabled={labels.medications.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pill className="w-4 h-4" />
                MAR Medication Labels ({labels.medications.length})
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Patient Bracelets
              </h4>
              <p className="text-blue-800">Count: {labels.patients.length}</p>
              <p className="text-blue-700 text-xs mt-1">Hospital-grade patient identification bracelets with barcodes</p>
              {labels.patients.length === 0 && (
                <p className="text-blue-600 text-xs mt-2 italic">No patients found in this tenant</p>
              )}
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Medication Labels
              </h4>
              <p className="text-green-800">Count: {labels.medications.length}</p>
              <p className="text-green-700 text-xs mt-1">MAR-compatible medication labels with barcodes for administration</p>
              {labels.medications.length === 0 && (
                <p className="text-green-600 text-xs mt-2 italic">No active medications found in this tenant</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Bulk Printing Instructions</h4>
                <ul className="text-yellow-800 text-sm mt-1 space-y-1">
                  <li>• <strong>Patient bracelets:</strong> Use standard bracelet paper for wristbands</li>
                  <li>• <strong>Medication labels:</strong> Use Avery 5167 label sheets for MAR compatibility</li>
                  <li>• <strong>Quality settings:</strong> Use high-quality print setting for barcode clarity</li>
                  <li>• <strong>Security:</strong> Store unused labels in secure, controlled environment</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-gray-600">
            <p>Total Labels: {labels.totalCount}</p>
            <p className="text-sm">Generated: {new Date(labels.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Getting Started */}
      {!labels && !loading && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Printer className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate Labels</h3>
          <p className="text-gray-600 mb-4">
            Click "Fetch All Labels" to retrieve all patient and medication data for {selectedTenant.name}
          </p>
          <ul className="text-sm text-gray-500 space-y-1 max-w-md mx-auto">
            <li>• Patient bracelets with identification barcodes</li>
            <li>• MAR medication labels with administration barcodes</li>
            <li>• Optimized for professional medical printing</li>
          </ul>
        </div>
      )}
      
      {/* MAR Medication Labels Modal */}
      {showMedicationLabels && labels && labels.medications.length > 0 && (
        <MedicationLabelsModal
          medications={labels.medications}
          onClose={() => setShowMedicationLabels(false)}
        />
      )}
      
      {/* Patient Bracelets Modal */}
      {showPatientBracelets && labels && labels.patients.length > 0 && (
        <PatientBracelet
          patient={labels.patients[0]} // Use first patient as template
          onClose={() => setShowPatientBracelets(false)}
        />
      )}
    </div>
  );
};

export default BulkLabelPrint;