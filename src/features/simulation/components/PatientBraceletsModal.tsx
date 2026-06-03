import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { BarcodeGenerator } from '../../patients/components/BarcodeGenerator';
import type { PatientLabelData } from '../../../services/operations/bulkLabelService';
import { PATIENT_COLORS, buildPatientColorMap, generateQRDataURLs, SimulationParticipant } from './labelPrintingUtils';
interface PatientBraceletsModalProps {
  patients: PatientLabelData[];
  simulationName: string;
  participants: SimulationParticipant[];
  onClose: () => void;
  quantity: number;
  startRow: number;
}

/**
 * Patient Bracelets Modal - Exact copy from BulkLabelPrint.tsx
 * Uses the same Avery 5160 positioning and QR code generation
 */
export const PatientBraceletsModal: React.FC<PatientBraceletsModalProps> = ({ patients, simulationName, participants, onClose, quantity, startRow }) => {
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
  
  // Duplicate each patient label based on quantity
  const duplicatedPatients = patients.flatMap(patient => 
    Array(quantity).fill(patient)
  );

  const patientColorMap = buildPatientColorMap(patients.map(p => p.id));

  // Calculate empty labels to skip based on starting row
  // Each row has 3 labels, so skip (startRow - 1) * 3 labels
  const labelsToSkip = (startRow - 1) * 3;
  
  const handlePrint = async () => {
    // Pre-generate all QR code data URLs before opening the print window.
    // This eliminates the CDN dependency and the polling loop.
    const qrDataURLs = await generateQRDataURLs(
      duplicatedPatients.map(p => `PT${p.patient_id.slice(-8).toUpperCase()}`),
      80
    );

    // Create a new window with only the labels for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Labels - Avery 5160</title>
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
              padding: 0;
              box-sizing: border-box;
              ${debugMode ? 'background-color: rgba(255, 0, 0, 0.1);' : 'background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);'}
              display: flex;
              flex-direction: row;
              align-items: stretch;
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
            .label-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: 0.08in;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .patient-name {
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
            .patient-info {
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
            .barcode-area {
              width: 1.0in;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
              padding: 0.05in;
              border-left: 1px solid #e0e0e0;
            }
            .qr-img {
              width: 0.85in;
              height: 0.85in;
              image-rendering: pixelated;
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
              .patient-name {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .patient-info {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            <!-- Empty labels for starting row offset -->
            ${Array(labelsToSkip).fill(0).map(() => `
              <div class="label"></div>
            `).join('')}
            <!-- Header Label -->
            <div class="label">
              <div class="label-content" style="display: flex; flex-direction: column; justify-content: center; padding: 0.15in;">
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 0.05in; line-height: 1.2;">${simulationName}</div>
                <div style="font-size: 9px; color: #666; margin-bottom: 0.05in;">Instructors: ${instructorNames}</div>
                <div style="font-size: 8px; color: #999;">${duplicatedPatients.length} patient${duplicatedPatients.length !== 1 ? 's' : ''} • Patient Bracelets</div>
              </div>
            </div>
            ${duplicatedPatients.map((patient, index) => {
              const color = PATIENT_COLORS[patientColorMap[patient.id]];
              return `
              <div class="label">
                <div class="label-content">
                  <div class="patient-name" style="background: ${color.bg}; border-color: ${color.border}; color: ${color.text};">${patient.first_name} ${patient.last_name}</div>
                  <div class="patient-info" style="background: ${color.bg}; border-color: ${color.border};">DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
                </div>
                <div class="barcode-area">
                  <img class="qr-img" src="${qrDataURLs[index]}" alt="QR" />
                </div>
              </div>
              `;
            }).join('')}
            ${Array(Math.max(0, 30 - labelsToSkip - 1 - duplicatedPatients.length)).fill(0).map(() => `
              <div class="label"></div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    if (!debugMode) {
      // Small delay for the DOM to fully render before printing
      setTimeout(() => printWindow.print(), 250);
    }
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
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <p className="text-sm text-purple-700">
              <strong>Quantity: {quantity}×</strong> - Each patient will have {quantity} label{quantity !== 1 ? 's' : ''} printed ({patients.length} patient{patients.length !== 1 ? 's' : ''} × {quantity} = {duplicatedPatients.length} total labels)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {duplicatedPatients.slice(0, 15).map((patient, idx) => (
              <div key={`${patient.id}-${idx}`} className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white rounded shadow-sm flex items-stretch" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center px-3 py-2">
                  <div className="font-black text-base mb-2 uppercase tracking-wide px-2 py-1 rounded" style={{letterSpacing: '0.5px', fontWeight: 900, background: PATIENT_COLORS[patientColorMap[patient.id]].bg, borderLeft: `4px solid ${PATIENT_COLORS[patientColorMap[patient.id]].border}`, color: PATIENT_COLORS[patientColorMap[patient.id]].text}}>{patient.first_name} {patient.last_name}</div>
                  <div className="text-sm font-bold px-2 py-1 rounded text-gray-700" style={{background: PATIENT_COLORS[patientColorMap[patient.id]].bg, borderLeft: `3px solid ${PATIENT_COLORS[patientColorMap[patient.id]].border}`}}>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</div>
                </div>
                <div className="w-20 flex justify-center items-center bg-white border-l border-gray-200 p-1">
                  <BarcodeGenerator
                    data={`PT${patient.patient_id.slice(-8).toUpperCase()}`}
                    type="patient"
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
      </div>
    </div>
  );
};

