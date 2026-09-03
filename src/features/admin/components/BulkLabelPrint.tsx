import React, { useMemo, useState } from 'react';
import { Printer, Download, Users, Pill, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { fetchAllLabelsForPrinting, BulkLabelData, PatientLabelData, dedupeMedicationLabels } from '../../../services/operations/bulkLabelService';
import { BarcodeGenerator } from '../../patients/components/BarcodeGenerator';
import { BarcodeLabelSheetModal, type BarcodeLabelItem } from './BarcodeLabelSheetModal';
import { Tenant } from '../../../types';
import { secureLogger } from '../../../lib/security/secureLogger';

// 5 fluorescent colors for per-patient label color-coding
const PATIENT_COLORS = [
  { bg: '#d4f97a', border: '#8ab800', text: '#1a2600' },  // Pastel yellow-green
  { bg: '#a0fdf7', border: '#00b8a8', text: '#003530' },  // Pastel cyan
  { bg: '#f5fd8f', border: '#b8c200', text: '#2a2a00' },  // Pastel yellow
  { bg: '#f9a0d4', border: '#c4006a', text: '#1a0010' },  // Pastel pink
  { bg: '#ffc299', border: '#cc5500', text: '#1a0a00' },  // Pastel orange
];

// Sort patient IDs for deterministic color assignment across bracelets and medication labels
function buildPatientColorMap(patientIds: string[]): Record<string, number> {
  const sorted = [...new Set(patientIds)].sort();
  const map: Record<string, number> = {};
  sorted.forEach((id, i) => { map[id] = i % PATIENT_COLORS.length; });
  return map;
}

interface PatientBraceletsModalProps {
  patients: PatientLabelData[];
  onClose: () => void;
  quantity: number;
}

const PatientBraceletsModal: React.FC<PatientBraceletsModalProps> = ({ patients, onClose, quantity }) => {
  const [debugMode, setDebugMode] = useState(false);
  
  // Duplicate each patient label based on quantity
  const duplicatedPatients = patients.flatMap(patient => 
    Array(quantity).fill(patient)
  );

  const patientColorMap = buildPatientColorMap(patients.map(p => p.id));

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Pre-generate QR data URLs before building print content
    const patientBarcodeValues = duplicatedPatients.map(p => `PT${p.patient_id.slice(-8).toUpperCase()}`);
    const QRCode = await import('qrcode');
    const patientQRs = await Promise.all(patientBarcodeValues.map(v =>
      QRCode.toDataURL(v, { width: 80, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
    ));

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Labels - Avery 5160</title>
          <style>
            @page { size: 8.5in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 8px; }
            .labels-grid { position: relative; width: 8.5in; height: 11in; margin: 0; padding: 0; }
            .label {
              position: absolute;
              width: 2.625in; height: 1in;
              border: ${debugMode ? '2px solid #ff0000' : '1px solid #dee2e6'};
              padding: 0; box-sizing: border-box;
              ${debugMode ? 'background-color: rgba(255, 0, 0, 0.1);' : 'background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);'}
              display: flex; flex-direction: row; align-items: stretch;
              overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 3px;
            }
            .label:nth-child(3n+1) { left: 0.1875in; }
            .label:nth-child(3n+2) { left: 2.9375in; }
            .label:nth-child(3n+3) { left: 5.6875in; }
            .label:nth-child(-n+3) { top: 0.5in; }
            .label:nth-child(n+4):nth-child(-n+6) { top: 1.5in; }
            .label:nth-child(n+7):nth-child(-n+9) { top: 2.5in; }
            .label:nth-child(n+10):nth-child(-n+12) { top: 3.5in; }
            .label:nth-child(n+13):nth-child(-n+15) { top: 4.5in; }
            .label:nth-child(n+16):nth-child(-n+18) { top: 5.5in; }
            .label:nth-child(n+19):nth-child(-n+21) { top: 6.5in; }
            .label:nth-child(n+22):nth-child(-n+24) { top: 7.5in; }
            .label:nth-child(n+25):nth-child(-n+27) { top: 8.5in; }
            .label:nth-child(n+28):nth-child(-n+30) { top: 9.5in; }
            .label-content {
              flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
              padding: 0.08in 0.1in; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .patient-name {
              font-size: 15px; font-weight: 900; line-height: 1.2;
              text-transform: uppercase; letter-spacing: 0.4px; padding: 4px 10px;
              margin-bottom: 3px;
              border-left: 4px solid; border-radius: 3px;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .patient-info {
              font-size: 10px; font-weight: 700; line-height: 1.3;
              padding: 2px 10px; color: #333;
              border-left: 3px solid; border-radius: 2px;
              margin-bottom: 2px;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .patient-doctor {
              font-size: 9px; font-weight: 600; line-height: 1.2;
              padding: 0 10px; color: #6b7280;
            }
            .barcode-area {
              width: 0.99in; display: flex; justify-content: center; align-items: center;
              background: #ffffff; padding: 0.05in 0.1in 0.05in 0.05in;
              border-left: 1px solid #e0e0e0;
            }
            .qr-img { width: 0.85in; height: 0.85in; image-rendering: pixelated; }
            @media print {
              .label { border: 1px solid #dee2e6 !important; box-shadow: none !important; background: #ffffff !important; }
              .labels-grid { width: 8.5in !important; height: 11in !important; }
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${duplicatedPatients.map((patient, index) => {
              const color = PATIENT_COLORS[patientColorMap[patient.id]];
              return `
              <div class="label">
                <div class="label-content">
                  <div class="patient-name" style="background: ${color.bg}; border-color: ${color.border}; color: ${color.text};">${patient.last_name}, ${patient.first_name}</div>
                  <div class="patient-info" style="background: ${color.bg}; border-color: ${color.border};">DOB: ${new Date(patient.date_of_birth + 'T00:00:00').toLocaleDateString()} &bull; ID: ${patient.patient_id}</div>
                  ${patient.attending_physician ? `<div class="patient-doctor">Dr. ${patient.attending_physician}</div>` : ''}
                </div>
                <div class="barcode-area">
                  <img class="qr-img" src="${patientQRs[index]}" alt="QR" />
                </div>
              </div>`;
            }).join('')}
            ${Array(Math.max(0, 30 - duplicatedPatients.length)).fill(0).map(() => `<div class="label"></div>`).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    if (!debugMode) {
      setTimeout(() => printWindow.print(), 250);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Patient Bracelets</h2>
            <p className="text-sm text-gray-600 mt-1">All patient identification labels with barcodes and names</p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="mr-2"
              />
              Debug Mode
            </label>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              {debugMode ? 'Print Test' : 'Print'}
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
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-medium text-blue-900 mb-1">Avery 5160 Format</h3>
            <p className="text-sm text-blue-700">Labels sized for 1" × 2⅝" (30 labels per sheet)</p>
          </div>
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <p className="text-sm text-purple-700">
              <strong>Quantity: {quantity}×</strong> - Each patient will have {quantity} label{quantity !== 1 ? 's' : ''} printed ({patients.length} patient{patients.length !== 1 ? 's' : ''} × {quantity} = {duplicatedPatients.length} total labels)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {duplicatedPatients.slice(0, 15).map((patient, idx) => (
              <div key={`${patient.id}-${idx}`} className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white rounded shadow-sm flex items-stretch" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center px-3 py-2 min-w-0">
                  <div className="font-black text-sm uppercase tracking-wide px-2.5 py-1 rounded truncate" style={{letterSpacing: '0.4px', fontWeight: 900, background: PATIENT_COLORS[patientColorMap[patient.id]].bg, borderLeft: `4px solid ${PATIENT_COLORS[patientColorMap[patient.id]].border}`, color: PATIENT_COLORS[patientColorMap[patient.id]].text}}>{patient.last_name}, {patient.first_name}</div>
                  <div className="text-[10px] font-bold px-2.5 py-0.5 mt-1 rounded text-gray-700" style={{background: PATIENT_COLORS[patientColorMap[patient.id]].bg, borderLeft: `3px solid ${PATIENT_COLORS[patientColorMap[patient.id]].border}`}}>DOB: {new Date(patient.date_of_birth + 'T00:00:00').toLocaleDateString()} • ID: {patient.patient_id}</div>
                  {patient.attending_physician && (
                    <div className="text-[9px] font-semibold px-2.5 mt-0.5 text-gray-500 truncate">Dr. {patient.attending_physician}</div>
                  )}
                </div>
                <div className="w-20 flex justify-center items-center bg-white border-l border-gray-200 p-1">
                  <BarcodeGenerator
                    data={`PT${patient.patient_id.slice(-8).toUpperCase()}`}
                    type="patient"
                    vertical
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
          {duplicatedPatients.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 15 labels. Print will include all {duplicatedPatients.length} patient labels.
            </div>
          )}
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
  const [patientQuantity, setPatientQuantity] = useState(1);
  const [medicationQuantity, setMedicationQuantity] = useState(1);

  const medicationLabelItems: BarcodeLabelItem[] = useMemo(
    () => (labels ? dedupeMedicationLabels(labels.medications) : []),
    [labels]
  );

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
      
      secureLogger.debug('Fetching bulk labels', { tenantId: selectedTenant.id, tenantName: selectedTenant.name });
      
      const labelsData = await fetchAllLabelsForPrinting(selectedTenant.id);
      secureLogger.debug('Bulk labels loaded', {
        patients: labelsData.patients.length,
        medications: labelsData.medications.length
      });
      setLabels(labelsData);
    } catch (err) {
      secureLogger.error('Error fetching bulk labels', err);
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
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Print Labels</h3>
            
            {/* Patient Bracelets Section */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 text-white p-2 rounded">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Patient Bracelets</h4>
                    <p className="text-sm text-blue-700">Patient identification labels</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-blue-900">Qty per patient:</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={patientQuantity}
                      onChange={(e) => setPatientQuantity(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                      className="w-16 px-2 py-1 border border-blue-300 rounded text-center font-medium"
                    />
                  </div>
                  <div className="text-sm text-blue-700 font-medium">
                    = {labels.patients.length * patientQuantity} labels
                  </div>
                  <button
                    onClick={() => setShowPatientBracelets(true)}
                    disabled={labels.patients.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>
            
            {/* Medication Labels Section */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-600 text-white p-2 rounded">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">Medication Labels</h4>
                    <p className="text-sm text-green-700">One label per distinct medication (no patient info)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-green-900">Qty per medication:</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={medicationQuantity}
                      onChange={(e) => setMedicationQuantity(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                      className="w-16 px-2 py-1 border border-green-300 rounded text-center font-medium"
                    />
                  </div>
                  <div className="text-sm text-green-700 font-medium">
                    = {medicationLabelItems.length * medicationQuantity} labels
                  </div>
                  <button
                    onClick={() => setShowMedicationLabels(true)}
                    disabled={medicationLabelItems.length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
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
              <p className="text-green-800">Count: {medicationLabelItems.length}</p>
              <p className="text-green-700 text-xs mt-1">One label per distinct medication with a vertical barcode for round containers</p>
              {medicationLabelItems.length === 0 && (
                <p className="text-green-600 text-xs mt-2 italic">No active medications found in this tenant</p>
              )}
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Printing Instructions</h4>
                <ul className="text-yellow-800 text-sm mt-1 space-y-1">
                  <li>• Use <strong>Avery 5160</strong> label sheets (30 labels per sheet)</li>
                  <li>• Select <strong>high-quality</strong> print setting for barcode clarity</li>
                  <li>• Test print one sheet before bulk printing</li>
                  <li>• Store unused labels in secure, controlled environment</li>
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
            <li>• MAR medication labels with vertical administration barcodes</li>
            <li>• Optimized for professional medical printing</li>
          </ul>
        </div>
      )}
      
      {/* Medication Labels Modal */}
      {showMedicationLabels && medicationLabelItems.length > 0 && (
        <BarcodeLabelSheetModal
          items={medicationLabelItems}
          title="Medication Labels"
          description="One label per distinct medication in use — no patient-specific info"
          quantity={medicationQuantity}
          onClose={() => setShowMedicationLabels(false)}
        />
      )}
      
      {/* Patient Bracelets Modal */}
      {showPatientBracelets && labels && labels.patients.length > 0 && (
        <PatientBraceletsModal
          patients={labels.patients}
          onClose={() => setShowPatientBracelets(false)}
          quantity={patientQuantity}
        />
      )}
    </div>
  );
};

export default BulkLabelPrint;