import React, { useState } from 'react';
import { Printer, Download, Users, Pill, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { fetchAllLabelsForPrinting, BulkLabelData, MedicationLabelData, PatientLabelData } from '../../lib/bulkLabelService';
import { BarcodeGenerator } from '../bcma/BarcodeGenerator';
import { Tenant } from '../../types';
import { bcmaService } from '../../lib/bcmaService';

interface PatientBraceletsModalProps {
  patients: PatientLabelData[];
  onClose: () => void;
}

const PatientBraceletsModal: React.FC<PatientBraceletsModalProps> = ({ patients, onClose }) => {
  const [debugMode, setDebugMode] = useState(false);
  
  const handlePrint = () => {
    // Create a new window with only the labels for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Labels - Avery 5160</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { 
              size: 8.5in 11in; 
              margin: 0; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              font-size: 8px;
            }
            .labels-grid {
              position: relative;
              width: 8.5in;
              height: 11in;
              margin: 0;
              padding: 0;
            }
            .label {
              position: absolute;
              width: 2.625in;
              height: 1in;
              border: ${debugMode ? '2px solid #ff0000' : '1px dashed #ccc'};
              padding: 2px;
              box-sizing: border-box;
              ${debugMode ? 'background-color: rgba(255, 0, 0, 0.1);' : ''}
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              overflow: hidden;
            }
            /* Avery 5160 perfect positioning - restored */
            .label:nth-child(3n+1) { left: 0.1875in; } /* Left margin */
            .label:nth-child(3n+2) { left: 3.0375in; } /* Column 2 */
            .label:nth-child(3n+3) { left: 5.7875in; } /* Column 3 */
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
            .patient-name {
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 1px;
              line-height: 1;
            }
            .patient-info {
              font-size: 6px;
              line-height: 1;
              margin-bottom: 2px;
            }
            .barcode-area {
              margin: 1px 0;
            }
            .barcode-canvas {
              max-width: 2.2in;
              max-height: 0.6in;
            }
            @media print {
              .label {
                border: none !important;
              }
              .labels-grid {
                width: 8.5in !important;
                height: 11in !important;
              }
              .barcode-canvas {
                max-width: 2.2in !important;
                max-height: 0.6in !important;
                width: auto !important;
                height: auto !important;
              }
              .barcode-area {
                flex: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${patients.map((patient, index) => `
              <div class="label">
                <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
                <div class="patient-info">ID: ${patient.patient_id}</div>
                <div class="patient-info">DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
                <div class="barcode-area">
                  <canvas id="patient-barcode-${index}" class="barcode-canvas"></canvas>
                </div>
              </div>
            `).join('')}
            ${Array(30 - patients.length).fill(0).map(() => `
              <div class="label"></div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Generate barcodes after content loads
    printWindow.onload = () => {
      // Wait for JsBarcode to be available
      const checkJsBarcode = () => {
        const windowWithBarcode = printWindow as any;
        if (windowWithBarcode.JsBarcode) {
          // Generate patient barcodes
          patients.forEach((patient, index) => {
            const canvas = printWindow.document.getElementById(`patient-barcode-${index}`);
            if (canvas) {
              const barcodeValue = `PT${patient.patient_id.slice(-8).toUpperCase()}`;
              windowWithBarcode.JsBarcode(canvas, barcodeValue, {
                format: "CODE128",
                width: 1,
                height: 40,
                displayValue: true,
                fontSize: 8,
                margin: 3,
                background: "#ffffff",
                lineColor: "#000000"
              });
            }
          });
          
          // Print after barcodes are generated
          setTimeout(() => {
            printWindow.print();
          }, 100);
        } else {
          // Retry if JsBarcode not ready
          setTimeout(checkJsBarcode, 50);
        }
      };
      checkJsBarcode();
    };
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
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {patients.slice(0, 15).map((patient) => (
              <div key={patient.id} className="border border-gray-300 p-1 bg-white text-center" style={{width: '2.625in', height: '1in', fontSize: '8px'}}>
                <div className="font-bold text-xs mb-1">{patient.first_name} {patient.last_name}</div>
                <div className="text-xs mb-1">ID: {patient.patient_id}</div>
                <div className="text-xs mb-1">DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</div>
                <div className="flex justify-center">
                  <BarcodeGenerator
                    data={`PT${patient.patient_id.slice(-8).toUpperCase()}`}
                    type="patient"
                  />
                </div>
              </div>
            ))}
          </div>
          {patients.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 15 labels. Print will include all {patients.length} patient labels.
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

interface MedicationLabelsModalProps {
  medications: MedicationLabelData[];
  onClose: () => void;
}

const MedicationLabelsModal: React.FC<MedicationLabelsModalProps> = ({ medications, onClose }) => {
  const handlePrint = () => {
    // Create a new window with only the labels for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medication Labels - Avery 5160</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { 
              size: 8.5in 11in; 
              margin: 0; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              font-size: 7px;
            }
            .labels-grid {
              position: relative;
              width: 8.5in;
              height: 11in;
              margin: 0;
              padding: 0;
            }
            .label {
              position: absolute;
              width: 2.625in;
              height: 1in;
              border: 1px dashed #ccc;
              padding: 2px;
              box-sizing: border-box;
              display: flex;
              flex-direction: row;
              align-items: stretch;
              text-align: left;
              overflow: hidden;
            }
            /* Avery 5160 perfect positioning - restored */
            .label:nth-child(3n+1) { left: 0.1875in; } /* Left margin */
            .label:nth-child(3n+2) { left: 3.0375in; } /* Column 2 */
            .label:nth-child(3n+3) { left: 5.7875in; } /* Column 3 */
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
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding-right: 5px;
              min-width: 1.6in;
            }
            .medication-name {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 3px;
              line-height: 1.2;
              color: #000;
              word-wrap: break-word;
            }
            .patient-name {
              font-size: 12px;
              font-weight: bold;
              color: #0066cc;
              margin-bottom: 3px;
              line-height: 1.2;
              word-wrap: break-word;
            }
            .barcode-area {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 0.9in;
              height: 0.9in;
              transform: rotate(90deg);
              transform-origin: center;
            }
            .barcode-canvas {
              width: 0.8in;
              height: 0.8in;
            }
            @media print {
              .label {
                border: none !important;
              }
              .labels-grid {
                width: 8.5in !important;
                height: 11in !important;
              }
              .barcode-canvas {
                width: 0.8in !important;
                height: 0.8in !important;
              }
              .barcode-area {
                width: 0.9in !important;
                height: 0.9in !important;
                transform: rotate(90deg) !important;
                transform-origin: center !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${medications.map((medication, index) => `
              <div class="label">
                <div class="label-content">
                  <div class="medication-name">${medication.medication_name}</div>
                  <div class="patient-name">${medication.patient_name}</div>
                </div>
                <div class="barcode-area">
                  <canvas id="medication-barcode-${index}" class="barcode-canvas"></canvas>
                </div>
              </div>
            `).join('')}
            ${Array(Math.max(0, 30 - medications.length)).fill(0).map(() => `
              <div class="label"></div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Generate barcodes after content loads
    printWindow.onload = () => {
      // Wait for JsBarcode to be available
      const checkJsBarcode = () => {
        const windowWithBarcode = printWindow as any;
        if (windowWithBarcode.JsBarcode) {
          // Generate medication barcodes
          medications.forEach((medication, index) => {
            const canvas = printWindow.document.getElementById(`medication-barcode-${index}`);
            if (canvas) {
              // Generate short, scannable barcode using BCMA service
              const barcodeValue = bcmaService.generateMedicationBarcode({
                id: medication.id,
                name: medication.medication_name || 'Unknown'
              } as any);
              windowWithBarcode.JsBarcode(canvas, barcodeValue, {
                format: "CODE128",
                width: 1,
                height: 60,
                displayValue: true,
                fontSize: 8,
                margin: 3,
                background: "#ffffff",
                lineColor: "#000000",
                textAlign: "center",
                textPosition: "bottom"
              });
            }
          });
          
          // Print after barcodes are generated
          setTimeout(() => {
            printWindow.print();
          }, 100);
        } else {
          // Retry if JsBarcode not ready
          setTimeout(checkJsBarcode, 50);
        }
      };
      checkJsBarcode();
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Medication Labels</h2>
            <p className="text-sm text-gray-600 mt-1">All active medications with patient names and vertical barcodes for round containers</p>
          </div>
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
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-medium text-blue-900 mb-1">Avery 5160 Format - Optimized for Round Containers</h3>
            <p className="text-sm text-blue-700">Labels sized for 1" × 2⅝" (30 labels per sheet)</p>
            <p className="text-xs text-blue-600 mt-1">• Moderately wide vertical barcodes for reliable scanning on round containers</p>
            <p className="text-xs text-blue-600">• Equal-sized medication and patient names for consistent readability</p>
            <p className="text-xs text-blue-600">• Balanced barcode width for optimal scan success and label space usage</p>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {medications.slice(0, 15).map((medication) => (
              <div key={medication.id} className="border border-gray-300 p-1 bg-white flex items-stretch" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center pr-1" style={{minWidth: '1.6in'}}>
                  <div className="font-bold text-base mb-1 leading-tight">{medication.medication_name}</div>
                  <div className="text-base font-bold text-blue-600 leading-tight">{medication.patient_name}</div>
                </div>
                <div className="w-20 h-full flex justify-center items-center">
                  <div className="transform rotate-90 origin-center">
                    <BarcodeGenerator
                      data={bcmaService.generateMedicationBarcode({
                        id: medication.id,
                        name: medication.medication_name || 'Unknown'
                      } as any)}
                      type="medication"
                      vertical={true}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {medications.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 15 labels. Print will include all {medications.length} medication labels.
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
      
      console.log('🚨 TENANT DEBUG INFO:');
      console.log('📍 Selected Tenant:', selectedTenant);
      console.log('🆔 Using Tenant ID:', selectedTenant.id);
      console.log('🏷️ Tenant Name:', selectedTenant.name);
      console.log('🌐 Tenant Subdomain:', selectedTenant.subdomain);
      console.log('🔍 Fetching bulk labels for tenant:', selectedTenant.id, selectedTenant.name);
      
      const labelsData = await fetchAllLabelsForPrinting(selectedTenant.id);
      console.log('📊 Raw labels data:', {
        patients: labelsData.patients,
        medications: labelsData.medications,
        tenantUsed: selectedTenant.id
      });
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
              <p className="text-green-700 text-xs mt-1">MAR-compatible medication labels with vertical barcodes for round containers</p>
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
            <li>• MAR medication labels with vertical administration barcodes</li>
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
        <PatientBraceletsModal
          patients={labels.patients}
          onClose={() => setShowPatientBracelets(false)}
        />
      )}
    </div>
  );
};

export default BulkLabelPrint;