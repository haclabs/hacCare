import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { BarcodeGenerator } from '../../patients/components/BarcodeGenerator';
import type { PatientLabelData, MedicationLabelData } from '../../../services/operations/bulkLabelService';
import { PATIENT_COLORS, buildPatientColorMap, WindowWithJsBarcode, SimulationParticipant, getInstructorNames } from './labelPrintingUtils';
interface AllLabelsModalProps {
  patients: PatientLabelData[];
  medications: MedicationLabelData[];
  simulationName: string;
  participants: SimulationParticipant[];
  onClose: () => void;
  patientQuantity: number;
  medicationQuantity: number;
  startRow: number;
}

/**
 * All Labels Modal - Combines patient bracelets and medication labels in one print job
 */
export const AllLabelsModal: React.FC<AllLabelsModalProps> = ({ 
  patients, 
  medications, 
  simulationName, 
  participants, 
  onClose, 
  patientQuantity, 
  medicationQuantity, 
  startRow 
}) => {
  const [debugMode, setDebugMode] = useState(false);
  
  // Get instructor names
  const instructors = participants
    .filter(p => p.role === 'instructor')
    .map(p => {
      const profile = p.user_profiles;
      if (!profile) return 'Unknown Instructor';
      const first = profile.first_name || '';
      const last = profile.last_name || '';
      return `${first} ${last}`.trim() || 'Unknown Instructor';
    });
  
  const instructorNames = instructors.length > 0 ? instructors.join(', ') : 'No Instructor Assigned';
  
  // Duplicate labels based on quantity
  const duplicatedPatients = patients.flatMap(patient => 
    Array(patientQuantity).fill(patient)
  );
  
  const duplicatedMedications = medications.flatMap(medication => 
    Array(medicationQuantity).fill(medication)
  );

  // Build color map keyed by patient id — same sort order as individual modals
  const patientColorMap = buildPatientColorMap(patients.map(p => p.id));

  const labelsToSkip = (startRow - 1) * 3;
  const totalLabels = 1 + duplicatedPatients.length + duplicatedMedications.length; // 1 for header
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Labels - ${simulationName}</title>
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
            /* Base label styles - positioning done via inline styles */
            .label {
              position: absolute;
              width: 2.625in;
              height: 1in;
              border: 1px solid #dee2e6;
              box-sizing: border-box;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              border-radius: 3px;
            }
            
            /* Patient bracelet styles - horizontal layout */
            .label.patient-bracelet {
              padding: 0;
              display: flex;
              flex-direction: row;
              align-items: stretch;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .patient-bracelet .label-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: 0.08in;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .patient-bracelet .patient-name {
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 6px;
              line-height: 1.2;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 4px 8px;
              border-left: 4px solid;
              border-radius: 3px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .patient-bracelet .patient-info {
              font-size: 12px;
              line-height: 1.3;
              padding: 3px 8px;
              color: #333;
              font-weight: 700;
              border-left: 3px solid;
              border-radius: 2px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .patient-bracelet .barcode-area {
              width: 1.05in;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
              padding: 0.05in 0.1in 0.05in 0.05in;
              border-left: 1px solid #e0e0e0;
              transform: none;
            }
            .patient-bracelet .barcode-canvas {
              max-width: 0.9in;
              max-height: 0.9in;
            }
            
            /* Medication label styles - vertical barcode layout */
            .label.medication-label {
              padding: 3px;
              display: block;
            }
            .medication-label .label-content {
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: 0.1in 0.05in;
              padding-right: 0.65in;
              width: 100%;
              height: 100%;
              box-sizing: border-box;
            }
            .medication-label .medication-name {
              font-size: 14px;
              font-weight: 800;
              margin-bottom: 4px;
              line-height: 1.3;
              color: #1a1a1a;
              word-wrap: break-word;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              padding: 4px 6px;
              background: #ffffff;
              border-left: 3px solid #000000;
              border-radius: 2px;
            }
            .medication-label .patient-name-med {
              font-size: 13px;
              font-weight: 700;
              margin-top: 2px;
              line-height: 1.3;
              word-wrap: break-word;
              padding: 3px 6px;
              border-left: 2px solid;
              border-radius: 2px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .medication-label .med-id {
              font-size: 11px;
              font-weight: 700;
              color: #000000;
              margin-top: 3px;
              line-height: 1.2;
              padding: 3px 6px;
              background: #ffffff;
              border-left: 2px solid #666666;
              border-radius: 1px;
              font-family: monospace;
              letter-spacing: 0.8px;
            }
            .medication-label .barcode-area {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 0.94in;
              height: 0.6in;
              transform: rotate(90deg);
              transform-origin: center;
              background: #ffffff;
              border: none;
              padding: 0;
              position: absolute;
              right: 0.05in;
              top: 50%;
              margin-top: -0.3in;
            }
            .medication-label .barcode-canvas {
              width: 0.92in;
              height: 0.58in;
              background: #ffffff;
              border: none;
            }
            
            @media print {
              .label {
                border: 1px solid #dee2e6 !important;
                box-shadow: none !important;
              }
              .patient-bracelet {
                background: #ffffff !important;
              }
              .labels-grid {
                width: 8.5in !important;
                height: 11in !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            <!-- Empty labels for starting row offset -->
            ${Array(labelsToSkip).fill(0).map((_, idx) => {
              const col = idx % 3;
              const row = Math.floor(idx / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left: ${leftPos}; top: ${topPos};"></div>`;
            }).join('')}
            
            <!-- Header Label -->
            ${(() => {
              const position = labelsToSkip;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              return `
            <div class="label" style="left: ${leftPos}; top: ${topPos};">
              <div class="label-content" style="display: flex; flex-direction: column; justify-content: center; padding: 0.15in;">
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 0.05in; line-height: 1.2;">${simulationName}</div>
                <div style="font-size: 9px; color: #666; margin-bottom: 0.05in;">Instructors: ${instructorNames}</div>
                <div style="font-size: 8px; color: #999;">${duplicatedPatients.length} bracelets + ${duplicatedMedications.length} medications = ${totalLabels - 1} labels</div>
              </div>
            </div>`;
            })()}
            
            <!-- Patient Bracelet Labels -->
            ${duplicatedPatients.map((patient, index) => {
              // Calculate position: skip labels + 1 header + current index
              const position = labelsToSkip + 1 + index;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              const color = PATIENT_COLORS[patientColorMap[patient.id]];
              
              return `
              <div class="label patient-bracelet" style="left: ${leftPos}; top: ${topPos};">
                <div class="label-content">
                  <div class="patient-name" style="background: ${color.bg}; border-color: ${color.border}; color: ${color.text};">${patient.first_name} ${patient.last_name}</div>
                  <div class="patient-info" style="background: ${color.bg}; border-color: ${color.border};">DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
                </div>
                <div class="barcode-area">
                  <canvas id="patient-barcode-${index}" class="barcode-canvas"></canvas>
                </div>
              </div>
              `;
            }).join('')}
            
            <!-- Medication Labels -->
            ${duplicatedMedications.map((medication, index) => {
              // Calculate position: skip labels + 1 header + patient count + current index
              const position = labelsToSkip + 1 + duplicatedPatients.length + index;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              
              const med = { id: medication.id, name: medication.medication_name || 'Unknown' };
              const cleanName = med.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
              const namePrefix = cleanName.charAt(0) || 'X';
              const cleanId = med.id.replace(/[^A-Z0-9]/g, '').toUpperCase();
              let numericCode = 0;
              for (let i = 0; i < cleanId.length; i++) {
                numericCode = (numericCode * 37 + cleanId.charCodeAt(i)) % 100000;
              }
              const idSuffix = numericCode.toString().padStart(5, '0');
              const barcodeValue = 'M' + namePrefix + idSuffix;
              const color = PATIENT_COLORS[patientColorMap[medication.patient_id]];
              
              return `
              <div class="label medication-label" style="left: ${leftPos}; top: ${topPos};">
                <div class="label-content">
                  <div class="medication-name">${medication.medication_name}</div>
                  <div class="patient-name-med" style="background: ${color.bg}; border-color: ${color.border}; color: ${color.text};">${medication.patient_name}</div>
                  <div class="med-id">ID: ${barcodeValue}</div>
                </div>
                <div class="barcode-area">
                  <canvas id="medication-barcode-${index}" class="barcode-canvas"></canvas>
                </div>
              </div>
              `;
            }).join('')}
            
            <!-- Fill remaining labels -->
            ${Array(Math.max(0, 30 - labelsToSkip - totalLabels)).fill(0).map((_, idx) => {
              const position = labelsToSkip + totalLabels + idx;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left: ${leftPos}; top: ${topPos};"></div>`;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Generate barcodes after content loads
    printWindow.onload = () => {
      const checkJsBarcode = () => {
        const windowWithBarcode = printWindow as unknown as WindowWithJsBarcode;
        if (windowWithBarcode.JsBarcode) {
          // Generate patient barcodes
          duplicatedPatients.forEach((patient, index) => {
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
          
          // Generate medication barcodes
          duplicatedMedications.forEach((medication, index) => {
            const canvas = printWindow.document.getElementById(`medication-barcode-${index}`);
            if (canvas) {
              const barcodeValue = bcmaService.generateMedicationBarcode({
                id: medication.id,
                name: medication.medication_name || 'Unknown'
              } as unknown as Medication);
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
          
          if (!debugMode) {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          }
        } else {
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
            <h2 className="text-xl font-bold text-gray-900">All Labels</h2>
            <p className="text-sm text-gray-600 mt-1">Combined patient bracelets and medication labels</p>
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
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
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <h3 className="font-medium text-purple-900 mb-1">Combined Label Print</h3>
            <p className="text-sm text-purple-700">
              <strong>Total: {totalLabels} labels</strong> (1 header + {duplicatedPatients.length} bracelets + {duplicatedMedications.length} medications)
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-medium text-blue-900 mb-2">Patient Bracelets</h4>
              <p className="text-sm text-blue-700">{patients.length} patients × {patientQuantity} = {duplicatedPatients.length} labels</p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <h4 className="font-medium text-green-900 mb-2">Medication Labels</h4>
              <p className="text-sm text-green-700">{medications.length} medications × {medicationQuantity} = {duplicatedMedications.length} labels</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Efficient printing:</strong> All labels will print together with one header label, maximizing label sheet usage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

