/**
 * ===========================================================================
 * SIMULATION LABEL PRINT MODAL
 * ===========================================================================
 * Reusable modal for printing patient and medication labels for a specific simulation
 * References the exact printing logic from BulkLabelPrint.tsx
 * ===========================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Printer, Users, Pill, AlertTriangle } from 'lucide-react';
import { fetchAllLabelsForPrinting, BulkLabelData, PatientLabelData, MedicationLabelData } from '../../../services/operations/bulkLabelService';
import { BarcodeGenerator } from '../../clinical/components/BarcodeGenerator';
import { bcmaService } from '../../../services/clinical/bcmaService';

interface WindowWithJsBarcode extends Window {
  JsBarcode: (canvas: HTMLElement, text: string, options: Record<string, unknown>) => void;
}

interface PatientBraceletsModalProps {
  patients: PatientLabelData[];
  onClose: () => void;
}

/**
 * Patient Bracelets Modal - Exact copy from BulkLabelPrint.tsx
 * Uses the same Avery 5160 positioning and JsBarcode generation
 */
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
              border: ${debugMode ? '2px solid #ff0000' : '1px solid #dee2e6'};
              padding: 8px;
              box-sizing: border-box;
              ${debugMode ? 'background-color: rgba(255, 0, 0, 0.1);' : 'background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);'}
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: flex-start;
              text-align: left;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              border-radius: 3px;
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
              font-size: 11px;
              font-weight: 800;
              margin-bottom: 2px;
              line-height: 1.2;
              color: #1a1a1a;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              padding: 3px 6px;
              background: linear-gradient(90deg, #e8f5e9 0%, transparent 100%);
              border-left: 3px solid #4caf50;
              border-radius: 2px;
              width: 100%;
              box-sizing: border-box;
            }
            .patient-info {
              font-size: 8px;
              line-height: 1.2;
              margin-bottom: 2px;
              padding: 2px 6px;
              color: #555;
              font-weight: 600;
              background: rgba(76, 175, 80, 0.05);
              border-left: 2px solid #81c784;
              border-radius: 2px;
              width: 100%;
              box-sizing: border-box;
            }
            .barcode-area {
              margin: 3px 0 0 0;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
              padding: 2px;
              border-radius: 2px;
              border: 1px solid #e0e0e0;
            }
            .barcode-canvas {
              max-width: 2.2in;
              max-height: 0.45in;
            }
            @media print {
              .label {
                border: 1px solid #dee2e6 !important;
                box-shadow: none !important;
                background: #ffffff !important;
              }
              .labels-grid {
                width: 8.5in !important;
                height: 11in !important;
              }
              .barcode-canvas {
                max-width: 2.2in !important;
                max-height: 0.45in !important;
                width: auto !important;
                height: auto !important;
              }
              .barcode-area {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #ffffff !important;
              }
              .patient-name {
                background: #f1f8f4 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .patient-info {
                background: #f8fbf9 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${patients.map((patient, index) => `
              <div class="label">
                <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
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
        const windowWithBarcode = printWindow as unknown as WindowWithJsBarcode;
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
            <p className="text-sm text-gray-600 mt-1">Patient identification labels with barcodes</p>
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
              <div key={patient.id} className="border border-gray-300 p-2 bg-gradient-to-br from-gray-50 to-white rounded shadow-sm flex flex-col items-start" style={{width: '2.625in', height: '1in'}}>
                <div className="font-extrabold text-sm mb-2 uppercase tracking-wide px-2 py-1 bg-gradient-to-r from-green-50 to-transparent border-l-3 border-green-500 rounded w-full" style={{borderLeftWidth: '3px', letterSpacing: '0.5px'}}>{patient.first_name} {patient.last_name}</div>
                <div className="text-xs font-semibold mb-2 px-2 py-1 bg-green-50 bg-opacity-50 border-l-2 border-green-400 rounded w-full text-gray-700" style={{borderLeftWidth: '2px'}}>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</div>
                <div className="flex justify-center w-full bg-white p-1 rounded border border-gray-200">
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
      </div>
    </div>
  );
};

interface MedicationLabelsModalProps {
  medications: MedicationLabelData[];
  onClose: () => void;
}

/**
 * Medication Labels Modal - Exact copy from BulkLabelPrint.tsx
 * Uses the same Avery 5160 positioning with vertical barcodes
 */
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
              border: 1px solid #dee2e6;
              padding: 3px;
              box-sizing: border-box;
              display: flex;
              flex-direction: row;
              align-items: stretch;
              text-align: left;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              border-radius: 3px;
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
              padding-left: 8px;
              padding-right: 8px;
              min-width: 1.6in;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-right: 2px solid #e9ecef;
            }
            .medication-name {
              font-size: 13px;
              font-weight: 800;
              margin-bottom: 4px;
              line-height: 1.3;
              color: #1a1a1a;
              word-wrap: break-word;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              padding: 4px 6px;
              background: linear-gradient(90deg, #e3f2fd 0%, transparent 100%);
              border-left: 3px solid #2196f3;
              border-radius: 2px;
            }
            .patient-name {
              font-size: 11px;
              font-weight: 600;
              color: #0066cc;
              margin-top: 2px;
              line-height: 1.3;
              word-wrap: break-word;
              padding: 3px 6px;
              background: rgba(0, 102, 204, 0.05);
              border-left: 2px solid #0066cc;
              border-radius: 2px;
            }
            .barcode-area {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 0.9in;
              height: 0.9in;
              transform: rotate(90deg);
              transform-origin: center;
              background: #ffffff;
              border-radius: 4px;
              padding: 2px;
            }
            .barcode-canvas {
              width: 0.8in;
              height: 0.8in;
              background: #ffffff;
            }
            @media print {
              .label {
                border: 1px solid #dee2e6 !important;
                box-shadow: none !important;
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
              .label-content {
                background: #ffffff !important;
              }
              .medication-name {
                background: #f0f8ff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .patient-name {
                background: #f0f7ff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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
        const windowWithBarcode = printWindow as unknown as WindowWithJsBarcode;
        if (windowWithBarcode.JsBarcode) {
          // Generate medication barcodes
          medications.forEach((medication, index) => {
            const canvas = printWindow.document.getElementById(`medication-barcode-${index}`);
            if (canvas) {
              // Generate short, scannable barcode using BCMA service
              const barcodeValue = bcmaService.generateMedicationBarcode({
                id: medication.id,
                name: medication.medication_name || 'Unknown'
              } as { id: string; name: string });
              windowWithBarcode.JsBarcode(canvas, barcodeValue, {
                format: "CODE128",
                width: 2, // INCREASED from 1 to 2 for thicker bars (better for heavy labels)
                height: 60,
                displayValue: true,
                fontSize: 8,
                margin: 2, // REDUCED margin to fit wider bars
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
            <p className="text-sm text-gray-600 mt-1">Medication labels with vertical barcodes for round containers</p>
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
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {medications.slice(0, 15).map((medication) => (
              <div key={medication.id} className="border border-gray-300 p-1 bg-white flex items-stretch rounded shadow-sm" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center px-2 bg-gradient-to-br from-gray-50 to-white border-r-2 border-gray-200" style={{minWidth: '1.6in'}}>
                  <div className="font-extrabold text-sm mb-1 leading-tight uppercase tracking-wide px-2 py-1 bg-gradient-to-r from-blue-50 to-transparent border-l-3 border-blue-500 rounded" style={{borderLeftWidth: '3px'}}>{medication.medication_name}</div>
                  <div className="text-xs font-semibold text-blue-600 leading-tight mt-1 px-2 py-1 bg-blue-50 bg-opacity-50 border-l-2 border-blue-600 rounded" style={{borderLeftWidth: '2px'}}>{medication.patient_name}</div>
                </div>
                <div className="w-20 h-full flex justify-center items-center">
                  <div className="transform rotate-90 origin-center">
                    <BarcodeGenerator
                      data={bcmaService.generateMedicationBarcode({
                        id: medication.id,
                        name: medication.medication_name || 'Unknown'
                      } as { id: string; name: string })}
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
      </div>
    </div>
  );
};

interface SimulationLabelPrintModalProps {
  simulationName: string;
  tenantId: string;
  onClose: () => void;
}

/**
 * Main Modal Component - Fetches and displays labels for a specific simulation
 */
export const SimulationLabelPrintModal: React.FC<SimulationLabelPrintModalProps> = ({
  simulationName,
  tenantId,
  onClose
}) => {
  const [labels, setLabels] = useState<BulkLabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPatientBracelets, setShowPatientBracelets] = useState(false);
  const [showMedicationLabels, setShowMedicationLabels] = useState(false);

  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏷️ Fetching labels for simulation:', simulationName);
      console.log('🆔 Using Tenant ID:', tenantId);
      
      const labelsData = await fetchAllLabelsForPrinting(tenantId);
      
      console.log('✅ Successfully loaded labels:', {
        patients: labelsData.patients.length,
        medications: labelsData.medications.length,
        simulation: simulationName
      });
      
      setLabels(labelsData);
    } catch (err) {
      console.error('❌ Error fetching labels:', err);
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
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
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
                  <button
                    onClick={() => setShowPatientBracelets(true)}
                    disabled={labels.patients.length === 0}
                    className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg p-6 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-blue-900">Patient Bracelets</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mb-1">
                      {labels.patients.length}
                    </p>
                    <p className="text-sm text-blue-700">
                      Patient identification labels
                    </p>
                  </button>

                  <button
                    onClick={() => setShowMedicationLabels(true)}
                    disabled={labels.medications.length === 0}
                    className="bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg p-6 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <Pill className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-green-900">Medication Labels</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mb-1">
                      {labels.medications.length}
                    </p>
                    <p className="text-sm text-green-700">
                      MAR medication labels
                    </p>
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
          onClose={() => setShowPatientBracelets(false)}
        />
      )}

      {/* Medication Labels Modal */}
      {showMedicationLabels && labels && labels.medications.length > 0 && (
        <MedicationLabelsModal
          medications={labels.medications}
          onClose={() => setShowMedicationLabels(false)}
        />
      )}
    </>
  );
};
