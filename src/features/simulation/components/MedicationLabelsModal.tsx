import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { BarcodeGenerator } from '../../patients/components/BarcodeGenerator';
import type { MedicationLabelData } from '../../../services/operations/bulkLabelService';
import { PATIENT_COLORS, buildPatientColorMap, generateQRDataURLs, SimulationParticipant } from './labelPrintingUtils';
interface MedicationLabelsModalProps {
  medications: MedicationLabelData[];
  simulationName: string;
  participants: SimulationParticipant[];
  onClose: () => void;
  quantity: number;
  startRow: number;
}

/**
 * Medication Labels Modal - Exact copy from BulkLabelPrint.tsx
 * Uses the same Avery 5160 positioning with vertical barcodes
 */
export const MedicationLabelsModal: React.FC<MedicationLabelsModalProps> = ({ medications, simulationName, participants, onClose, quantity, startRow }) => {
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
  
  // Duplicate each medication label based on quantity
  const duplicatedMedications = medications.flatMap(medication => 
    Array(quantity).fill(medication)
  );

  const patientColorMap = buildPatientColorMap(medications.map(m => m.patient_id));

  // Calculate empty labels to skip based on starting row
  // Each row has 3 labels, so skip (startRow - 1) * 3 labels
  const labelsToSkip = (startRow - 1) * 3;

  /** Returns the stable barcode value for a medication (catalog barcode if set, else hash). */
  const getMedBarcodeValue = (medication: MedicationLabelData): string => {
    if (medication.barcode) return medication.barcode;
    const cleanName = (medication.medication_name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const namePrefix = cleanName.charAt(0) || 'X';
    const cleanId = medication.id.replace(/[^A-Z0-9]/g, '').toUpperCase();
    let numericCode = 0;
    for (let i = 0; i < cleanId.length; i++) {
      numericCode = (numericCode * 37 + cleanId.charCodeAt(i)) % 100000;
    }
    return 'M' + namePrefix + numericCode.toString().padStart(5, '0');
  };
  
  const handlePrint = async () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Pre-generate QR data URLs before building print content
    const medBarcodeValues = duplicatedMedications.map(m => getMedBarcodeValue(m));
    const medQRs = await generateQRDataURLs(medBarcodeValues, 80);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medication Labels - ${simulationName}</title>
          <style>
            @page { size: 8.5in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 7px; }
            .labels-grid { position: relative; width: 8.5in; height: 11in; margin: 0; padding: 0; }
            .label {
              position: absolute;
              width: 2.625in; height: 1in;
              border: 1px solid #dee2e6;
              padding: 3px; box-sizing: border-box;
              overflow: hidden; background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 3px;
            }
            .label-content {
              display: flex; flex-direction: column; justify-content: center;
              padding: 0.1in 0.05in; padding-right: 0.65in;
              width: 100%; height: 100%; box-sizing: border-box;
            }
            .medication-name {
              font-size: 14px; font-weight: 800; margin-bottom: 4px;
              line-height: 1.3; color: #1a1a1a; word-wrap: break-word;
              text-transform: uppercase; letter-spacing: 0.3px;
              padding: 4px 6px; border-left: 3px solid #000000; border-radius: 2px;
            }
            .patient-name {
              font-size: 13px; font-weight: 700; margin-top: 2px;
              line-height: 1.3; word-wrap: break-word;
              padding: 3px 6px; border-left: 2px solid; border-radius: 2px;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .med-id {
              font-size: 11px; font-weight: 700; color: #000000; margin-top: 3px;
              line-height: 1.2; padding: 3px 6px; border-left: 2px solid #666666;
              border-radius: 1px; font-family: monospace; letter-spacing: 0.8px;
            }
            .barcode-area {
              display: flex; justify-content: center; align-items: center;
              width: 0.94in; height: 0.6in;
              transform: rotate(90deg); transform-origin: center;
              position: absolute; right: 0.05in; top: 50%; margin-top: -0.3in;
            }
            .qr-img { width: 0.85in; height: 0.85in; image-rendering: pixelated; }
            @media print {
              .label { border: 1px solid #dee2e6 !important; box-shadow: none !important; }
              .labels-grid { width: 8.5in !important; height: 11in !important; }
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${Array(labelsToSkip).fill(0).map((_, idx) => {
              const col = idx % 3;
              const row = Math.floor(idx / 3);
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left:${leftPos};top:${topPos};"></div>`;
            }).join('')}
            ${(() => {
              const pos = labelsToSkip;
              const col = pos % 3;
              const row = Math.floor(pos / 3);
              const left = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const top = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left:${left};top:${top};">
                <div class="label-content" style="padding:0.15in;">
                  <div style="font-size:12px;font-weight:bold;margin-bottom:0.05in;">${simulationName}</div>
                  <div style="font-size:9px;color:#666;">Instructors: ${instructorNames}</div>
                  <div style="font-size:8px;color:#999;">${duplicatedMedications.length} medication label${duplicatedMedications.length !== 1 ? 's' : ''}</div>
                </div>
              </div>`;
            })()}
            ${duplicatedMedications.map((medication, index) => {
              const pos = labelsToSkip + 1 + index;
              const col = pos % 3;
              const row = Math.floor(pos / 3);
              const left = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const top = (0.5 + row * 1.0) + 'in';
              const color = PATIENT_COLORS[patientColorMap[medication.patient_id]];
              const barcodeValue = medBarcodeValues[index];
              return `
              <div class="label" style="left:${left};top:${top};">
                <div class="label-content">
                  <div class="medication-name">${medication.medication_name}</div>
                  <div class="patient-name" style="background:${color.bg};border-color:${color.border};color:${color.text};">${medication.patient_name}</div>
                  <div class="med-id">ID: ${barcodeValue}</div>
                </div>
                <div class="barcode-area">
                  <img class="qr-img" src="${medQRs[index]}" alt="QR" />
                </div>
              </div>`;
            }).join('')}
            ${Array(Math.max(0, 30 - labelsToSkip - 1 - duplicatedMedications.length)).fill(0).map((_, idx) => {
              const pos = labelsToSkip + 1 + duplicatedMedications.length + idx;
              const col = pos % 3;
              const row = Math.floor(pos / 3);
              const left = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const top = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left:${left};top:${top};"></div>`;
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
            <h2 className="text-xl font-bold text-gray-900">Medication Labels</h2>
            <p className="text-sm text-gray-600 mt-1">Medication labels with vertical barcodes for round containers</p>
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
            <h3 className="font-medium text-blue-900 mb-1">Avery 5160 Format - Optimized for Round Containers</h3>
            <p className="text-sm text-blue-700">Labels sized for 1" × 2⅝" (30 labels per sheet)</p>
          </div>
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <p className="text-sm text-purple-700">
              <strong>Quantity: {quantity}×</strong> - Each medication will have {quantity} label{quantity !== 1 ? 's' : ''} printed ({medications.length} medication{medications.length !== 1 ? 's' : ''} × {quantity} = {duplicatedMedications.length} total labels)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {duplicatedMedications.slice(0, 15).map((medication, idx) => (
              <div key={`${medication.id}-${idx}`} className="border border-gray-300 p-1 bg-white flex items-stretch rounded shadow-sm" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center px-2 bg-gradient-to-br from-gray-50 to-white border-r-2 border-gray-200" style={{minWidth: '1.6in'}}>
                  <div className="font-extrabold text-sm mb-1 leading-tight uppercase tracking-wide px-2 py-1 bg-gradient-to-r from-blue-50 to-transparent border-l-3 border-blue-500 rounded" style={{borderLeftWidth: '3px'}}>{medication.medication_name}</div>
                  <div className="text-xs font-semibold leading-tight mt-1 px-2 py-1 rounded" style={{borderLeft: `2px solid ${PATIENT_COLORS[patientColorMap[medication.patient_id]].border}`, background: PATIENT_COLORS[patientColorMap[medication.patient_id]].bg, color: PATIENT_COLORS[patientColorMap[medication.patient_id]].text}}>{medication.patient_name}</div>
                </div>
                <div className="w-20 h-full flex justify-center items-center">
                  <div className="transform rotate-90 origin-center">
                    <BarcodeGenerator
                      data={getMedBarcodeValue(medication)}
                      type="medication"
                      vertical={true}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {duplicatedMedications.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 15 labels. Print will include all {duplicatedMedications.length} medication labels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

