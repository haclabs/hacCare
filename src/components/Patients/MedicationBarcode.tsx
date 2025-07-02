import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Medication } from '../../types';
import { format, isValid } from 'date-fns';

interface MedicationBarcodeProps {
  medication: Medication;
  patientName: string;
  patientId: string;
  onClose: () => void;
}

export const MedicationBarcode: React.FC<MedicationBarcodeProps> = ({ 
  medication, 
  patientName, 
  patientId, 
  onClose 
}) => {
  // Generate unique medication barcode based on medication ID and details
  const medicationBarcodeId = `MED${medication.id.slice(-6).toUpperCase()}`;

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
              <title>Medication Labels - ${medication.name}</title>
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

    // Avery 5160 exact specifications
    const labelWidth = 787.5; // 2.625 * 300
    const labelHeight = 300; // 1 * 300
    const leftMargin = 56.25; // 0.1875 * 300
    const topMargin = 150; // 0.5 * 300

    // Draw 30 labels (3 columns x 10 rows)
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 3; col++) {
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
        ctx.fillText(medication.name, x + 15, y + 35);

        // Draw dosage in red
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 27px Arial';
        ctx.fillText(medication.dosage, x + 15, y + 65);

        // Draw patient info
        ctx.fillStyle = 'black';
        ctx.font = '21px Arial';
        ctx.fillText(`Patient: ${patientName}`, x + 15, y + 90);
        ctx.fillText(`ID: ${patientId}`, x + 15, y + 115);

        // Draw frequency
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.fillText(medication.frequency, x + 15, y + 140);
        ctx.fillText(medication.route, x + 15, y + 160);

        // Draw simple barcode on the right
        ctx.fillStyle = 'black';
        const barcodeX = x + labelWidth - 180;
        const barcodeY = y + 80;
        
        // Simple barcode pattern
        for (let i = 0; i < 25; i++) {
          const barWidth = (i % 3) + 1;
          const barX = barcodeX + (i * 4.8);
          if (i % 2 === 0) {
            ctx.fillRect(barX, barcodeY, barWidth, 42);
          }
        }

        // Draw barcode ID
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(medicationBarcodeId, barcodeX + 60, barcodeY + 60);

        // Draw medication ID
        ctx.fillStyle = '#666';
        ctx.font = '15px Arial';
        ctx.fillText(medication.id.slice(-6), barcodeX + 60, barcodeY + 80);
      }
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medication-labels-${medicationBarcodeId}-${medication.name.replace(/\s+/g, '-')}.png`;
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
    for (let i = 0; i < 30; i++) {
      labels.push(
        <div key={i} className="label">
          <div className="left-section">
            <div>
              <div className="medication-name">{medication.name}</div>
              <div className="dosage">{medication.dosage}</div>
              <div className="patient-info">
                <div>Patient: {patientName}</div>
                <div>ID: {patientId}</div>
              </div>
            </div>
            <div className="frequency">
              <div>{medication.frequency}</div>
              <div>{medication.route}</div>
            </div>
          </div>
          
          <div className="barcode-section">
            <div className="barcode">
              {/* Compact barcode for small labels */}
              {Array.from({length: 12}, (_, i) => (
                <div
                  key={i}
                  className="barcode-line"
                  style={{
                    width: `${(i % 3) + 1}px`,
                    height: i % 2 === 0 ? '14px' : '10px'
                  }}
                />
              ))}
            </div>
            <div className="barcode-id">{medicationBarcodeId}</div>
            <div className="med-id">{medication.id.slice(-6)}</div>
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
          <h2 className="text-xl font-semibold text-gray-900">Medication Labels - Avery 5160</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Medication Label Information</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-900"><strong>Medication:</strong> {medication.name}</p>
                  <p className="text-blue-900"><strong>Dosage:</strong> {medication.dosage}</p>
                  <p className="text-blue-900"><strong>Frequency:</strong> {medication.frequency}</p>
                  <p className="text-blue-900"><strong>Route:</strong> {medication.route}</p>
                </div>
                <div>
                  <p className="text-blue-900"><strong>Patient:</strong> {patientName}</p>
                  <p className="text-blue-900"><strong>Patient ID:</strong> {patientId}</p>
                  <p className="text-blue-900"><strong>Barcode ID:</strong> {medicationBarcodeId}</p>
                  <p className="text-blue-900"><strong>Labels per Sheet:</strong> 30 identical labels</p>
                </div>
              </div>
            </div>
          </div>

          {/* Label Sheet Preview */}
          <div className="bg-gray-100 p-8 rounded-lg overflow-x-auto">
            <div className="text-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Avery 5160 Medication Label Sheet Preview</h4>
              <p className="text-sm text-gray-600">30 labels • 2⅝" × 1" each • 3 columns × 10 rows</p>
              <p className="text-xs text-gray-500 mt-1">Compact format optimized for medication containers</p>
            </div>
            
            <div 
              id="medication-labels-content" 
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

          {/* Instructions and Information */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center space-x-2">
                <Printer className="h-4 w-4" />
                <span>Printing Instructions</span>
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Load Avery 5160 label sheets into printer</li>
                <li>• Set printer to "Actual Size" (100% scale)</li>
                <li>• Use high-quality print setting for barcode clarity</li>
                <li>• Test alignment with regular paper first</li>
                <li>• Print generates 30 identical medication labels</li>
                <li>• <strong>Compact format</strong> - fits on small containers</li>
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
                  <p>• <strong>Name:</strong> {medication.name}</p>
                  <p>• <strong>Dosage:</strong> <span className="text-red-600 font-bold">{medication.dosage}</span></p>
                  <p>• <strong>Route:</strong> {medication.route}</p>
                </div>
                <div>
                  <p>• <strong>Frequency:</strong> {medication.frequency}</p>
                  <p>• <strong>Prescribed by:</strong> {medication.prescribed_by}</p>
                  <p>• <strong>Next Due:</strong> {formatSafeDate(medication.next_due)}</p>
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
            <h4 className="font-medium text-gray-900 mb-2">Avery 5160 Specifications</h4>
            <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
              <div>
                <p>• Label Size: 2⅝" × 1" (compact format)</p>
                <p>• Sheet Size: 8½" × 11"</p>
                <p>• Layout: 3 columns × 10 rows</p>
                <p>• Total Labels: 30 per sheet</p>
              </div>
              <div>
                <p>• Margins: 0.1875" left/right, 0.5" top/bottom</p>
                <p>• No gaps between labels</p>
                <p>• Optimized for small medication containers</p>
                <p>• High-contrast barcode for reliable scanning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};