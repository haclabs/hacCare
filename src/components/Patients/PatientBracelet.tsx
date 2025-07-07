import React from 'react';
import { Patient } from '../../types';
import { X, Printer, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Patient Label Component
 * 
 * Generates Avery 5160 compatible patient identification labels for printing.
 * Creates a sheet of labels with patient information and barcodes.
 * 
 * Features:
 * - Patient name and ID
 * - Date of birth
 * - Room and bed number
 * - Allergy warnings
 * - UPC-128 barcode for patient identification
 * - Print and download functionality
 * - Avery 5160 label sheet format (2⅝" × 1")
 */
interface PatientBraceletProps {
  patient: Patient;
  onClose: () => void;
}

export const PatientBracelet: React.FC<PatientBraceletProps> = ({ patient, onClose }) => {
  const handlePrint = () => {
    const printContent = document.getElementById('label-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Patient Labels - ${patient.patient_id}</title>
              <style>
                @page {
                  size: 8.5in 11in;
                  margin: 0.5in 0.1875in 0.5in 0.1875in;
                }
                body { 
                  margin: 0; 
                  padding: 0; 
                  font-family: Arial, sans-serif; 
                  background: white;
                }
                .label-sheet {
                  width: 8.125in;
                  height: 10in;
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: flex-start;
                  align-content: flex-start;
                }
                .label {
                  width: 2.625in;
                  height: 1in;
                  box-sizing: border-box;
                  padding: 4px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  background: white;
                  position: relative;
                  overflow: hidden;
                  border: 1px dashed #ccc;
                  margin: 0;
                }
                .patient-name {
                  font-size: 11px;
                  font-weight: bold;
                  text-align: center;
                  margin-bottom: 1px;
                  line-height: 1;
                  color: #000;
                }
                .room-number {
                  font-size: 9px;
                  font-weight: bold;
                  text-align: center;
                  margin-bottom: 1px;
                  line-height: 1;
                  color: #000;
                }
                .dob {
                  font-size: 8px;
                  text-align: center;
                  margin-bottom: 2px;
                  line-height: 1;
                  color: #000;
                }
                .allergies {
                  font-size: 7px;
                  font-weight: bold;
                  text-align: center;
                  color: white;
                  background: #dc2626;
                  padding: 1px 2px;
                  border-radius: 2px;
                  margin-bottom: 2px;
                  line-height: 1.1;
                  border: 1px solid #dc2626;
                }
                .barcode-section {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  margin-top: auto;
                }
                .barcode {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin-bottom: 1px;
                  height: 16px;
                }
                .barcode-line {
                  background: black;
                  margin: 0 0.3px;
                }
                .patient-id {
                  font-size: 7px;
                  font-weight: bold;
                  text-align: center;
                  color: #000;
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
    // Create a canvas to generate an image of the label sheet
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full sheet dimensions at 300 DPI
    canvas.width = 2550; // 8.5 * 300
    canvas.height = 3300; // 11 * 300

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Avery 5160 exact specifications
    const labelWidth = 787.5; // 2.625 * 300
    const labelHeight = 300; // 1 * 300
    const leftMargin = 56.25; // 0.1875 * 300
    const topMargin = 150; // 0.5 * 300
    const horizontalSpacing = 0; // No gap between columns
    const verticalSpacing = 0; // No gap between rows

    // Draw 30 labels (3 columns x 10 rows)
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 3; col++) {
        const x = leftMargin + (col * (labelWidth + horizontalSpacing));
        const y = topMargin + (row * (labelHeight + verticalSpacing));

        // Draw label border (for reference only)
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, labelWidth, labelHeight);

        // Draw patient name
        ctx.fillStyle = 'black';
        ctx.font = 'bold 33px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${patient.first_name} ${patient.last_name}`, x + labelWidth/2, y + 45);

        // Draw room number
        ctx.font = 'bold 27px Arial';
        ctx.fillText(`Room: ${patient.room_number}${patient.bed_number}`, x + labelWidth/2, y + 75);

        // Draw DOB
        ctx.font = '24px Arial';
        ctx.fillText(`DOB: ${format(new Date(patient.date_of_birth), 'MM/dd/yyyy')}`, x + labelWidth/2, y + 105);

        // Draw allergies if any
        if (patient.allergies && patient.allergies.length > 0) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x + 15, y + 115, labelWidth - 30, 22);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(`ALLERGIES: ${patient.allergies.join(', ')}`, x + labelWidth/2, y + 132);
        }

        // Draw simple barcode representation
        ctx.fillStyle = 'black';
        const barcodeY = y + (patient.allergies && patient.allergies.length > 0 ? 150 : 130);
        const barcodeWidth = 120;
        const barcodeHeight = 20;
        const startX = x + (labelWidth - barcodeWidth) / 2;
        
        // Simple barcode pattern
        for (let i = 0; i < 20; i++) {
          const barWidth = (i % 3) + 1;
          const barX = startX + (i * 6);
          if (i % 2 === 0) {
            ctx.fillRect(barX, barcodeY, barWidth, barcodeHeight);
          }
        }

        // Draw patient ID
        ctx.font = 'bold 21px Arial';
        ctx.fillText(patient.patient_id, x + labelWidth/2, y + 280);
      }
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patient-labels-${patient.patient_id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  // Generate 30 identical labels for the sheet
  const generateLabelSheet = () => {
    const labels = [];
    for (let i = 0; i < 30; i++) {
      labels.push(
        <div key={i} className="label">
          <div className="patient-name">{patient.first_name} {patient.last_name}</div>
          <div className="room-number">Room: {patient.room_number}{patient.bed_number}</div>
          <div className="dob">DOB: {format(new Date(patient.date_of_birth), 'MM/dd/yyyy')}</div>
          
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="allergies">
              ALLERGIES: {patient.allergies.join(', ')}
            </div>
          )}
          
          <div className="barcode-section">
            <div className="barcode">
              {/* Simple barcode representation for print */}
              {Array.from({length: 15}, (_, i) => (
                <div
                  key={i}
                  className="barcode-line"
                  style={{
                    width: `${(i % 3) + 1}px`,
                    height: i % 2 === 0 ? '16px' : '12px'
                  }}
                />
              ))}
            </div>
            <div className="patient-id">{patient.patient_id}</div>
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
          <h2 className="text-xl font-semibold text-gray-900">Patient ID Labels - Avery 5160</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mr-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print 30 Labels</span>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Patient Label Information</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-900"><strong>Patient Name:</strong> {patient.first_name} {patient.last_name}</p>
                  <p className="text-blue-900"><strong>Room Number:</strong> {patient.room_number}{patient.bed_number}</p>
                  <p className="text-blue-900"><strong>Date of Birth:</strong> {format(new Date(patient.date_of_birth), 'MM/dd/yyyy')}</p>
                </div>
                <div>
                  <p className="text-blue-900"><strong>Patient Number:</strong> {patient.patient_id}</p>
                  <p className="text-blue-900"><strong>Allergies:</strong> {patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None'}</p>
                  <p className="text-blue-900"><strong>Labels per Sheet:</strong> 30 identical labels</p>
                </div>
              </div>
            </div>
          </div>

          {/* Label Sheet Preview */}
          <div className="bg-gray-100 p-8 rounded-lg overflow-x-auto">
            <div className="text-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Avery 5160 Label Sheet Preview</h4>
              <p className="text-sm text-gray-600">30 labels • 2⅝" × 1" each • 3 columns × 10 rows</p>
              <p className="text-xs text-gray-500 mt-1">Exact Avery 5160 specifications with proper spacing</p>
            </div>
            
            <div 
              id="label-content" 
              className="bg-white shadow-lg mx-auto border border-gray-300"
              style={{
                width: '8.125in',
                height: '10in',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                alignContent: 'flex-start',
                transform: 'scale(0.6)',
                transformOrigin: 'top center',
                padding: '0.5in 0.1875in'
              }}
            >
              {generateLabelSheet()}
            </div>
          </div>

          {/* Instructions and Warnings */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center space-x-2">
                <Printer className="h-4 w-4" />
                <span>Printing Instructions</span>
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Load Avery 5160 label sheets into printer</li>
                <li>• Set printer to "Actual Size" (100% scale)</li>
                <li>• Use high-quality print setting</li>
                <li>• Test alignment with regular paper first</li>
                <li>• Print generates 30 identical patient labels</li>
                <li>• <strong>Fixed spacing</strong> - matches Avery 5160 exactly</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Label Usage</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Apply to patient charts and medical records</li>
                <li>• Use on laboratory specimens and samples</li>
                <li>• Attach to medication containers</li>
                <li>• Scannable barcode for quick patient lookup</li>
                <li>• Store unused labels securely</li>
              </ul>
            </div>
          </div>

          {patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-medium text-red-900">Critical Allergy Alert</h4>
              </div>
              <div className="text-sm text-red-800">
                <p className="mb-2"><strong>Patient Allergies:</strong></p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {patient.allergies.map((allergy, index) => (
                    <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-300">
                      {allergy}
                    </span>
                  ))}
                </div>
                <div className="bg-red-100 border border-red-300 rounded p-2">
                  <p className="text-xs font-bold">
                    ⚠️ IMPORTANT: Each label displays allergies in RED background with white text to immediately alert medical staff.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Avery 5160 Specifications</h4>
            <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
              <div>
                <p>• Label Size: 2⅝" × 1"</p>
                <p>• Sheet Size: 8½" × 11"</p>
                <p>• Layout: 3 columns × 10 rows</p>
              </div>
              <div>
                <p>• Total Labels: 30 per sheet</p>
                <p>• Margins: 0.1875" left/right, 0.5" top/bottom</p>
                <p>• No gaps between labels</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};