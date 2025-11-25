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
import type { Medication } from '../../clinical/types/clinical';

interface WindowWithJsBarcode extends Window {
  JsBarcode: (canvas: HTMLElement, text: string, options: Record<string, unknown>) => void;
}

interface PatientBraceletsModalProps {
  patients: PatientLabelData[];
  simulationName: string;
  participants: Array<{ user_profiles?: { first_name?: string; last_name?: string; } | null; role?: string; }>;
  onClose: () => void;
  quantity: number;
  startRow: number;
}

/**
 * Patient Bracelets Modal - Exact copy from BulkLabelPrint.tsx
 * Uses the same Avery 5160 positioning and JsBarcode generation
 */
const PatientBraceletsModal: React.FC<PatientBraceletsModalProps> = ({ patients, simulationName, participants, onClose, quantity, startRow }) => {
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
  
  // Calculate empty labels to skip based on starting row
  // Each row has 3 labels, so skip (startRow - 1) * 3 labels
  const labelsToSkip = (startRow - 1) * 3;
  
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
              padding: 0.1in;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .patient-name {
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 6px;
              line-height: 1.2;
              color: #1a1a1a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 4px 8px;
              background: linear-gradient(90deg, #e8f5e9 0%, transparent 100%);
              border-left: 4px solid #4caf50;
              border-radius: 3px;
            }
            .patient-info {
              font-size: 12px;
              line-height: 1.3;
              padding: 3px 8px;
              color: #333;
              font-weight: 700;
              background: rgba(76, 175, 80, 0.08);
              border-left: 3px solid #81c784;
              border-radius: 2px;
            }
            .barcode-area {
              width: 0.9in;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
              padding: 0.05in 0.1in 0.05in 0.05in;
              border-left: 1px solid #e0e0e0;
            }
            .barcode-canvas {
              max-width: 0.8in;
              max-height: 0.85in;
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
            ${duplicatedPatients.map((patient, index) => `
              <div class="label">
                <div class="label-content">
                  <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
                  <div class="patient-info">DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
                </div>
                <div class="barcode-area">
                  <canvas id="patient-barcode-${index}" class="barcode-canvas"></canvas>
                </div>
              </div>
            `).join('')}
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
    
    // Generate barcodes after content loads
    printWindow.onload = () => {
      // Wait for JsBarcode to be available
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
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
            <p className="text-sm text-purple-700">
              <strong>Quantity: {quantity}×</strong> - Each patient will have {quantity} label{quantity !== 1 ? 's' : ''} printed ({patients.length} patient{patients.length !== 1 ? 's' : ''} × {quantity} = {duplicatedPatients.length} total labels)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {duplicatedPatients.slice(0, 15).map((patient, idx) => (
              <div key={`${patient.id}-${idx}`} className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white rounded shadow-sm flex items-stretch" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center px-3 py-2">
                  <div className="font-black text-base mb-2 uppercase tracking-wide px-2 py-1 bg-gradient-to-r from-green-50 to-transparent border-l-4 border-green-500 rounded" style={{letterSpacing: '0.5px', fontWeight: 900}}>{patient.first_name} {patient.last_name}</div>
                  <div className="text-sm font-bold px-2 py-1 bg-green-50 bg-opacity-50 border-l-3 border-green-400 rounded text-gray-700" style={{borderLeftWidth: '3px'}}>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</div>
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

interface MedicationLabelsModalProps {
  medications: MedicationLabelData[];
  simulationName: string;
  participants: Array<{ user_profiles?: { first_name?: string; last_name?: string; } | null; role?: string; }>;
  onClose: () => void;
  quantity: number;
  startRow: number;
}

/**
 * Medication Labels Modal - Exact copy from BulkLabelPrint.tsx
 * Uses the same Avery 5160 positioning with vertical barcodes
 */
const MedicationLabelsModal: React.FC<MedicationLabelsModalProps> = ({ medications, simulationName, participants, onClose, quantity, startRow }) => {
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
  
  // Calculate empty labels to skip based on starting row
  // Each row has 3 labels, so skip (startRow - 1) * 3 labels
  const labelsToSkip = (startRow - 1) * 3;
  
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
              display: block;
              text-align: left;
              overflow: visible;
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
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: 0.1in 0.05in;
              padding-right: 0.65in;
              width: 100%;
              height: 100%;
              box-sizing: border-box;
              background: #ffffff;
            }
            .medication-name {
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
            .patient-name {
              font-size: 13px;
              font-weight: 700;
              color: #000000;
              margin-top: 2px;
              line-height: 1.3;
              word-wrap: break-word;
              padding: 3px 6px;
              background: #ffffff;
              border-left: 2px solid #666666;
              border-radius: 2px;
            }
            .med-id {
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
            .barcode-area {
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
            .barcode-canvas {
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
              .labels-grid {
                width: 8.5in !important;
                height: 11in !important;
              }
              .barcode-canvas {
                width: 0.92in !important;
                height: 0.58in !important;
              }
              .barcode-area {
                width: 0.94in !important;
                height: 0.6in !important;
                transform: rotate(90deg) !important;
                transform-origin: center !important;
              }
              .med-id {
                background: #ffffff !important;
              }
              .label-content {
                background: #ffffff !important;
              }
              .medication-name {
                background: #ffffff !important;
              }
              .patient-name {
                background: #ffffff !important;
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
                <div style="font-size: 8px; color: #999;">${duplicatedMedications.length} medication${duplicatedMedications.length !== 1 ? 's' : ''} • Medication Labels</div>
              </div>
            </div>
            ${duplicatedMedications.map((medication, index) => {
              // Use BCMA service to generate the correct barcode that matches the medication records
              const med = { id: medication.id, name: medication.medication_name || 'Unknown' };
              // Generate barcode ID using the same logic as bcmaService
              const cleanName = med.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
              const namePrefix = cleanName.charAt(0) || 'X';
              const cleanId = med.id.replace(/[^A-Z0-9]/g, '').toUpperCase();
              let numericCode = 0;
              for (let i = 0; i < cleanId.length; i++) {
                numericCode = (numericCode * 37 + cleanId.charCodeAt(i)) % 100000;
              }
              const idSuffix = numericCode.toString().padStart(5, '0');
              const barcodeValue = 'M' + namePrefix + idSuffix;
              
              return `
              <div class="label">
                <div class="label-content">
                  <div class="medication-name">${medication.medication_name}</div>
                  <div class="patient-name">${medication.patient_name}</div>
                  <div class="med-id">ID: ${barcodeValue}</div>
                </div>
                <div class="barcode-area">
                  <canvas id="medication-barcode-${index}" class="barcode-canvas"></canvas>
                </div>
              </div>
              `;
            }).join('')}
            ${Array(Math.max(0, 30 - labelsToSkip - 1 - duplicatedMedications.length)).fill(0).map(() => `
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
          duplicatedMedications.forEach((medication, index) => {
            const canvas = printWindow.document.getElementById(`medication-barcode-${index}`);
            if (canvas) {
              // Generate short, scannable barcode using BCMA service
              const barcodeValue = bcmaService.generateMedicationBarcode({
                id: medication.id,
                name: medication.medication_name || 'Unknown'
              } as unknown as Medication);
              windowWithBarcode.JsBarcode(canvas, barcodeValue, {
                format: "CODE128",
                width: 5, // Extra thick bars for junky 1D scanners
                height: 100, // Maximum height fills 0.97in width
                displayValue: false, // Hide text
                margin: 5, // Good margin for scanner lock-on
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
                  <div className="text-xs font-semibold text-blue-600 leading-tight mt-1 px-2 py-1 bg-blue-50 bg-opacity-50 border-l-2 border-blue-600 rounded" style={{borderLeftWidth: '2px'}}>{medication.patient_name}</div>
                </div>
                <div className="w-20 h-full flex justify-center items-center">
                  <div className="transform rotate-90 origin-center">
                    <BarcodeGenerator
                      data={bcmaService.generateMedicationBarcode({
                        id: medication.id,
                        name: medication.medication_name || 'Unknown'
                      } as unknown as Medication)}
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

interface AllLabelsModalProps {
  patients: PatientLabelData[];
  medications: MedicationLabelData[];
  simulationName: string;
  participants: Array<{ user_profiles?: { first_name?: string; last_name?: string; } | null; role?: string; }>;
  onClose: () => void;
  patientQuantity: number;
  medicationQuantity: number;
  startRow: number;
}

/**
 * All Labels Modal - Combines patient bracelets and medication labels in one print job
 */
const AllLabelsModal: React.FC<AllLabelsModalProps> = ({ 
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
              padding: 0.1in;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .patient-bracelet .patient-name {
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 6px;
              line-height: 1.2;
              color: #1a1a1a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 4px 8px;
              background: linear-gradient(90deg, #e8f5e9 0%, transparent 100%);
              border-left: 4px solid #4caf50;
              border-radius: 3px;
            }
            .patient-bracelet .patient-info {
              font-size: 12px;
              line-height: 1.3;
              padding: 3px 8px;
              color: #333;
              font-weight: 700;
              background: rgba(76, 175, 80, 0.08);
              border-left: 3px solid #81c784;
              border-radius: 2px;
            }
            .patient-bracelet .barcode-area {
              width: 0.9in;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
              padding: 0.05in;
              border-left: 1px solid #e0e0e0;
              transform: none;
            }
            .patient-bracelet .barcode-canvas {
              max-width: 0.8in;
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
              color: #000000;
              margin-top: 2px;
              line-height: 1.3;
              word-wrap: break-word;
              padding: 3px 6px;
              background: #ffffff;
              border-left: 2px solid #666666;
              border-radius: 2px;
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
              
              return `
              <div class="label patient-bracelet" style="left: ${leftPos}; top: ${topPos};">
                <div class="label-content">
                  <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
                  <div class="patient-info">DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}</div>
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
              
              return `
              <div class="label medication-label" style="left: ${leftPos}; top: ${topPos};">
                <div class="label-content">
                  <div class="medication-name">${medication.medication_name}</div>
                  <div class="patient-name-med">${medication.patient_name}</div>
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
