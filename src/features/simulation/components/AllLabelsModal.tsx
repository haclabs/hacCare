import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { PATIENT_COLORS, buildPatientColorMap, generateQRDataURLs, SimulationParticipant } from './labelPrintingUtils';
import type { PatientLabelData } from '../../../services/operations/bulkLabelService';
import { type BarcodeLabelItem, MEDICATION_LABEL_ACCENT_COLOR, splitMedicationSubtitle } from '../../../services/operations/bulkLabelService';
interface AllLabelsModalProps {
  patients: PatientLabelData[];
  medicationItems: BarcodeLabelItem[];
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
  medicationItems, 
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
  
  const duplicatedMedications = medicationItems.flatMap(item => 
    Array(medicationQuantity).fill(item)
  );

  // Build color map keyed by patient id — same sort order as individual modals
  const patientColorMap = buildPatientColorMap(patients.map(p => p.id));

  const labelsToSkip = (startRow - 1) * 3;
  const totalLabels = 1 + duplicatedPatients.length + duplicatedMedications.length; // 1 for header
  
  const handlePrint = async () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Pre-generate all QR data URLs before writing to the print window (no CDN needed)
    const [patientQRs, medicationQRs] = await Promise.all([
      generateQRDataURLs(
        duplicatedPatients.map(p => `PT${p.patient_id.slice(-8).toUpperCase()}`),
        80
      ),
      generateQRDataURLs(
        duplicatedMedications.map(m => m.barcode),
        80
      ),
    ]);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Labels - ${simulationName}</title>
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
              padding: 0.05in;
              border-left: 1px solid #e0e0e0;
            }
            
            /* Medication label styles */
            .label.medication-label {
              border-left-width: 4px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 0.07in 0.08in 0.05in 0.11in;
              box-sizing: border-box;
            }
            .medication-label .med-name {
              font-size: 12px;
              font-weight: 800;
              color: #111827;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 1.75in;
            }
            .medication-label .dose-line { display: flex; flex-direction: column; align-items: flex-start; margin-top: 2px; }
            .medication-label .dose-value { font-size: 17px; font-weight: 800; color: #14776a; line-height: 1; }
            .medication-label .dose-form { font-size: 8px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px; }
            .medication-label .brand-footer { display: flex; align-items: baseline; justify-content: space-between; color: #9ca3af; }
            .medication-label .brand-footer .brand-name { font-size: 9.5px; }
            .medication-label .brand-footer strong { color: #1e3a5f; }
            .medication-label .brand-footer .mint { color: #3EB489; }
            .medication-label .brand-footer .barcode-id { font-size: 8px; font-family: monospace; color: #9ca3af; }
            .medication-label .qr-corner {
              position: absolute;
              top: 0.06in;
              right: 0.06in;
              width: 0.6in;
              height: 0.6in;
            }
            
            .qr-img {
              width: 0.85in;
              height: 0.85in;
              image-rendering: pixelated;
            }
            .medication-label .qr-corner .qr-img {
              width: 100%;
              height: 100%;
            }
            
            @media print {
              .label {
                border-top: 1px solid #dee2e6 !important;
                border-right: 1px solid #dee2e6 !important;
                border-bottom: 1px solid #dee2e6 !important;
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
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left: ${leftPos}; top: ${topPos};"></div>`;
            }).join('')}
            
            <!-- Header Label -->
            ${(() => {
              const position = labelsToSkip;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
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
              const position = labelsToSkip + 1 + index;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              const color = PATIENT_COLORS[patientColorMap[patient.id]];
              
              return `
              <div class="label patient-bracelet" style="left: ${leftPos}; top: ${topPos};">
                <div class="label-content">
                  <div class="patient-name" style="background: ${color.bg}; border-color: ${color.border}; color: ${color.text};">${patient.last_name}, ${patient.first_name}</div>
                  <div class="patient-info" style="background: ${color.bg}; border-color: ${color.border};">DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
                </div>
                <div class="barcode-area">
                  <img class="qr-img" src="${patientQRs[index]}" alt="QR" />
                </div>
              </div>
              `;
            }).join('')}
            
            <!-- Medication Labels -->
            ${duplicatedMedications.map((item, index) => {
              const position = labelsToSkip + 1 + duplicatedPatients.length + index;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              
              return `
              <div class="label medication-label" style="left: ${leftPos}; top: ${topPos}; border-left-color: ${MEDICATION_LABEL_ACCENT_COLOR};">
                <div class="med-name">${item.name}</div>
                <div class="dose-line">
                  <span class="dose-value">${splitMedicationSubtitle(item.subtitle).dose}</span>
                  <span class="dose-form">${splitMedicationSubtitle(item.subtitle).form}</span>
                </div>
                <div class="qr-corner"><img class="qr-img" src="${medicationQRs[index]}" alt="QR" /></div>
                <div class="brand-footer">
                  <span class="brand-name"><strong>hac</strong><strong class="mint">Care</strong> EMR Sim</span>
                  <span class="barcode-id">${item.barcode}</span>
                </div>
              </div>
              `;
            }).join('')}
            
            <!-- Fill remaining labels -->
            ${Array(Math.max(0, 30 - labelsToSkip - totalLabels)).fill(0).map((_, idx) => {
              const position = labelsToSkip + totalLabels + idx;
              const col = position % 3;
              const row = Math.floor(position / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
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

    if (!debugMode) {
      setTimeout(() => printWindow.print(), 250);
    }
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
              <p className="text-sm text-green-700">{medicationItems.length} medications × {medicationQuantity} = {duplicatedMedications.length} labels</p>
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

