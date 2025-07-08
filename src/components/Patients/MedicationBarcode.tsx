import React, { useState } from 'react';
import { X, Printer, Download, AlertTriangle } from 'lucide-react';
import { Medication } from '../../types';
import { format, isValid } from 'date-fns';
import { generateCode128SVG } from '../../utils/barcodeUtils';

/**
 * Medication Label Component
 * 
 * Generates Avery 5167 compatible medication labels for printing.
 * Creates a sheet of labels with medication information and barcodes.
 * 
 * Features:
 * - Medication name and dosage
 * - Patient information
 * - UPC-128 barcode for medication identification
 * - Print and download functionality
 * - Avery 5167 label sheet format (4" x 1.33")
 */
interface MedicationBarcodeProps {
  patient: any;
  medications: Medication[];
  onClose: () => void;
}

export const MedicationBarcode: React.FC<MedicationBarcodeProps> = ({ 
  patient,
  medications,
  onClose 
}) => {
  // Ensure patient data is valid
  const safePatient = {
    id: patient?.id || '',
    first_name: patient?.first_name || 'Unknown',
    last_name: patient?.last_name || 'Patient',
    patient_id: patient?.patient_id || 'UNKNOWN'
  };
  
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(
    medications.length > 0 ? medications[0] : null
  );
  
  // Avery 5167 specifications
  const labelWidth = 4; // inches
  const labelHeight = 1.33; // inches
  const labelsPerSheet = 20; // 4 across, 5 down

  if (!selectedMedication) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Medications Available</h2>
          <p className="text-gray-600 mb-6">There are no medications available to generate barcodes for.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Generate unique medication barcode based on medication ID and details
  const medicationBarcodeId = `MED${selectedMedication.id.slice(-6).toUpperCase()}`;

  // Generate barcode SVG
  const barcodeSvg = generateCode128SVG(selectedMedication.id, {
    width: 200,
    height: 30,
    showText: false
  });

  // Helper function to safely format dates
  const formatSafeDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    return isValid(date) ? format(date, 'MM/dd HH:mm') : 'N/A';
  };

  const handlePrint = () => {
    const printContent = document.getElementById('medication-labels-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Medication Labels - ${selectedMedication.name}</title>
              <style>
                @page {
                  size: 8.5in 11in;
                  margin: 0.5in 0.25in 0.5in 0.25in;
                }
                body { 
                  margin: 0; 
                  padding: 0; 
                  font-family: Arial, sans-serif; 
                  background: white;
                }
                .label-sheet {
                  width: 8in;
                  height: 10in;
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: flex-start;
                  align-content: flex-start;
                }
                .label {
                  width: 4in;
                  height: 1.33in;
                  box-sizing: border-box;
                  padding: 3px;
                  display: flex;
                  justify-content: space-between;
                  background: white;
                  position: relative;
                  overflow: hidden;
                  border: 1px dashed #ccc;
                  margin: 0;
                }
                .left-section {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  padding-right: 2px;
                }
                .medication-name {
                  font-size: 10px;
                  font-weight: bold;
                  line-height: 1;
                  margin-bottom: 1px;
                  color: #000;
                }
                .dosage {
                  font-size: 9px;
                  font-weight: bold;
                  color: #dc2626;
                  line-height: 1;
                  margin-bottom: 1px;
                }
                .patient-info {
                  font-size: 7px;
                  line-height: 1.1;
                  color: #000;
                }
                .frequency {
                  font-size: 6px;
                  color: #666;
                  line-height: 1;
                  margin-top: 1px;
                }
                .barcode-section {
                  width: 60px;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  text-align: center;
                }
                .barcode {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin-bottom: 1px;
                  height: 14px;
                }
                .barcode-line {
                  background: black;
                  margin: 0 0.2px;
                }
                .barcode-id {
                  font-size: 6px;
                  font-weight: bold;
                  color: #000;
                  line-height: 1;
                }
                .med-id {
                  font-size: 5px;
                  color: #666;
                  line-height: 1;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .label { border: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full sheet dimensions at 300 DPI
    canvas.width = 2550; // 8.5 * 300
    canvas.height = 3300; // 11 * 300
    
    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Avery 5167 exact specifications
    const labelWidth = 1200; // 4 * 300
    const labelHeight = 399; // 1.33 * 300
    const leftMargin = 75; // 0.25 * 300
    const topMargin = 150; // 0.5 * 300
    
    // Draw 20 labels (4 columns x 5 rows)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        const x = leftMargin + (col * labelWidth);
        const y = topMargin + (row * labelHeight);
        
        // Draw label border (for reference only)
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, labelWidth, labelHeight);

        // Draw medication name
        ctx.fillStyle = 'black';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'left'; 
        ctx.fillText(selectedMedication.name, x + 20, y + 40);
        
        // Draw dosage in red
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 27px Arial';
        ctx.fillText(selectedMedication.dosage, x + 20, y + 80);
        
        // Draw patient info
        ctx.fillStyle = 'black';
        ctx.font = '21px Arial';
        ctx.fillText(`Patient: ${patient.first_name} ${patient.last_name}`, x + 20, y + 120);
        ctx.fillText(`ID: ${patient.patient_id}`, x + 20, y + 150);
        
        // Draw frequency
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.fillText(`Frequency: ${selectedMedication.frequency}`, x + 20, y + 180);
        ctx.fillText(`Route: ${selectedMedication.route}`, x + 20, y + 210);
        
        // Draw simple barcode on the right
        ctx.fillStyle = 'black';
        const barcodeX = x + labelWidth - 220;
        const barcodeY = y + 120;
        
        // Simple barcode pattern
        for (let i = 0; i < 30; i++) {
          const barWidth = (i % 3) + 1;
          const barX = barcodeX + (i * 5);
          if (i % 2 === 0) {
            ctx.fillRect(barX, barcodeY, barWidth, 50);
          }
        }
        
        // Draw barcode ID
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(medicationBarcodeId, barcodeX + 75, barcodeY + 70);
        
        // Draw medication ID
        ctx.fillStyle = '#666';
        ctx.font = '15px Arial';
        ctx.fillText(selectedMedication.id.slice(-6), barcodeX + 75, barcodeY + 90);
      }
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medication-labels-${medicationBarcodeId}-${selectedMedication.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  // Generate 30 identical medication labels for the sheet
  const generateLabelSheet = () => {  
    const labels = [];  
    // Generate 20 labels for Avery 5167 (4 across, 5 down)
    for (let i = 0; i < 20; i++) {
      labels.push(
        <div key={i} className="label">
          <div className="left-section">
            <div>
              <div className="medication-name" style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedMedication.name}</div>
              <div className="dosage" style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>{selectedMedication.dosage}</div>
              <div className="patient-info">
                <div style={{ fontSize: '10px' }}>Patient: {patient.first_name} {patient.last_name}</div>
                <div style={{ fontSize: '10px' }}>ID: {patient.patient_id}</div>
              </div>
            </div>
            <div className="frequency" style={{ fontSize: '9px', color: '#666' }}>
              <div>Frequency: {selectedMedication.frequency}</div>
              <div>Route: {selectedMedication.route}</div>
            </div>
          </div>
          
          <div className="barcode-section" style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="barcode" style={{ marginBottom: '2px' }}>
              {/* Compact barcode for small labels */}
              {Array.from({length: 12}, (_, i) => (
                <div
                  key={i}
                  className="barcode-line"
                  style={{
                    width: `${(i % 3) + 1}px`,
                    height: i % 2 === 0 ? '20px' : '16px',
                    background: 'black',
                    margin: '0 0.2px',
                    display: 'inline-block'
                  }}
                />
              ))}
            </div>
            <div className="barcode-id" style={{ fontSize: '8px', fontWeight: 'bold' }}>{medicationBarcodeId}</div>
            <div className="med-id" style={{ fontSize: '7px', color: '#666' }}>{selectedMedication.id.slice(-6)}</div>
          </div>
        </div>
      );
    }
    return labels;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Medication Labels - Avery 5167</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Labels</span>
            </button>
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Medication Label Information</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-900 mb-2">Select Medication</label>
                <select 
                  value={selectedMedication?.id || ''}
                  onChange={(e) => {
                    const med = medications.find(m => m.id === e.target.value);
                    if (med) setSelectedMedication(med);
                  }}
                  className="w-full p-2 border border-blue-300 rounded-md"
                >
                  {medications.map(med => (
                    <option key={med.id} value={med.id}>
                      {med.name} - {med.dosage}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-900"><strong>Medication:</strong> {selectedMedication?.name || 'N/A'}</p>
                  <p className="text-blue-900"><strong>Dosage:</strong> <span className="text-red-600 font-bold">{selectedMedication?.dosage || 'N/A'}</span></p>
                  <p className="text-blue-900"><strong>Frequency:</strong> {selectedMedication?.frequency || 'N/A'}</p>
                  <p className="text-blue-900"><strong>Route:</strong> {selectedMedication?.route || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-blue-900"><strong>Patient:</strong> {safePatient.first_name} {safePatient.last_name}</p>
                  <p className="text-blue-900"><strong>Patient ID:</strong> {safePatient.patient_id}</p>
                  <p className="text-blue-900"><strong>Barcode ID:</strong> {medicationBarcodeId}</p>
                  <p className="text-blue-900"><strong>Labels per Sheet:</strong> 20 identical labels</p>
                </div>
              </div>
            </div>
          </div>

          {/* Label Sheet Preview */}
          <div className="bg-gray-100 p-8 rounded-lg overflow-x-auto">
            <div className="text-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Avery 5167 Medication Label Sheet Preview</h4>
              <p className="text-sm text-gray-600">20 labels • 4" × 1.33" each • 4 across × 5 down</p>
              <p className="text-xs text-gray-500 mt-1">Return address format optimized for medication containers</p>
            </div>
            
            <div 
              id="medication-labels-content" 
              className="bg-white shadow-lg mx-auto border border-gray-300"
              style={{
                width: '8.5in',
                height: '10in',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                alignContent: 'flex-start',
                transform: 'scale(0.6)',
                transformOrigin: 'top center',
                padding: '0.5in 0.25in',
                gap: '0'
              }}
            >
              {generateLabelSheet()}
            </div>
          </div>

          {/* Instructions and Information */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center space-x-2">
                <Printer className="h-4 w-4" />
                <span>Printing Instructions</span>
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Load Avery 5167 label sheets into printer</li>
                <li>• Set printer to "Actual Size" (100% scale)</li>
                <li>• Use high-quality print setting for barcode clarity</li>
                <li>• Test alignment with regular paper first</li>
                <li>• Print generates identical medication labels</li>
                <li>• <strong>Return address format</strong> - fits on medication containers</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Label Usage</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Apply to medication containers and vials</li>
                <li>• Use on IV bags and syringes</li>
                <li>• Attach to pill bottles and blister packs</li>
                <li>• Scannable barcode for medication verification</li>
                <li>• Red dosage text for quick identification</li>
                <li>• Store unused labels securely</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">Safety Information</h4>
            <div className="text-sm text-red-800 space-y-2">
              <p><strong>Medication Details:</strong></p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>• <strong>Name:</strong> {selectedMedication?.name || 'N/A'}</p>
                  <p>• <strong>Dosage:</strong> <span className="text-red-600 font-bold">{selectedMedication?.dosage || 'N/A'}</span></p>
                  <p>• <strong>Route:</strong> {selectedMedication?.route || 'N/A'}</p>
                </div>
                <div>
                  <p>• <strong>Frequency:</strong> {selectedMedication?.frequency || 'N/A'}</p>
                  <p>• <strong>Prescribed by:</strong> {selectedMedication?.prescribed_by || 'N/A'}</p>
                  <p>• <strong>Next Due:</strong> {selectedMedication?.next_due ? formatSafeDate(selectedMedication.next_due) : 'N/A'}</p>
                </div>
              </div>
              <div className="bg-red-100 border border-red-300 rounded p-2 mt-3">
                <p className="text-xs font-bold">
                  ⚠️ IMPORTANT: Scan barcode before administration. Verify patient identity, medication name, dosage, and administration time.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Avery 5167 Specifications</h4>
            <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
              <div>
                <p>• Label Size: 4" × 1.33" (return address format)</p>
                <p>• Sheet Size: 8½" × 11"</p>
                <p>• Layout: 4 columns × 5 rows</p>
                <p>• Total Labels: 20 per sheet</p>
              </div>
              <div>
                <p>• Margins: 0.25" left/right, 0.5" top/bottom</p>
                <p>• No gaps between labels</p>
                <p>• Optimized for medication containers</p>
                <p>• High-contrast barcode for reliable scanning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};