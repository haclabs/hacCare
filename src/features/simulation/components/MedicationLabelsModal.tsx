import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { QrThumbnail } from '../../admin/components/BarcodeLabelSheetModal';
import { type BarcodeLabelItem, getMedicationAccentColor } from '../../../services/operations/bulkLabelService';
import { generateQRDataURLs, SimulationParticipant } from './labelPrintingUtils';
interface MedicationLabelsModalProps {
  items: BarcodeLabelItem[];
  simulationName: string;
  participants: SimulationParticipant[];
  onClose: () => void;
  quantity: number;
  startRow: number;
}

/**
 * Medication Labels Modal — one label per distinct medication (no patient info),
 * matching the Medication Catalog's standard label design.
 */
export const MedicationLabelsModal: React.FC<MedicationLabelsModalProps> = ({ items, simulationName, participants, onClose, quantity, startRow }) => {
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
  const duplicatedItems = items.flatMap(item => 
    Array(quantity).fill(item)
  );

  // Calculate empty labels to skip based on starting row
  // Each row has 3 labels, so skip (startRow - 1) * 3 labels
  const labelsToSkip = (startRow - 1) * 3;

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Pre-generate QR data URLs before building print content
    const medQRs = await generateQRDataURLs(duplicatedItems.map(i => i.barcode), 80);

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
              box-sizing: border-box;
              display: flex; flex-direction: row; align-items: stretch;
              overflow: hidden; background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 3px;
            }
            .label-content {
              flex: 1 1 auto; min-width: 0;
              display: flex; flex-direction: column; justify-content: center;
              padding: 0.06in 0.08in; box-sizing: border-box; overflow: hidden;
            }
            .medication-name {
              font-size: 13px; font-weight: 800; margin-bottom: 2px;
              line-height: 1.2; color: #1a1a1a; word-wrap: break-word;
              text-transform: uppercase; letter-spacing: 0.3px;
              padding: 3px 6px; border-left: 3px solid #000000; border-radius: 2px;
            }
            .med-subtitle {
              font-size: 11px; font-weight: 700; margin-top: 2px;
              line-height: 1.2; color: #333; padding: 2px 6px;
              border-left: 2px solid #666; border-radius: 2px;
            }
            .med-id {
              font-size: 10px; font-weight: 700; color: #000; margin-top: 2px;
              padding: 2px 6px; border-left: 2px solid #666; border-radius: 1px;
              font-family: monospace; letter-spacing: 0.8px;
            }
            .barcode-area {
              flex: 0 0 auto;
              display: flex; justify-content: center; align-items: center;
              width: 0.9in; background: #ffffff;
              border-left: 1px solid #e0e0e0;
            }
            .qr-img { width: 0.8in; height: 0.8in; image-rendering: pixelated; }
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
                  <div style="font-size:8px;color:#999;">${duplicatedItems.length} medication label${duplicatedItems.length !== 1 ? 's' : ''}</div>
                </div>
              </div>`;
            })()}
            ${duplicatedItems.map((item, index) => {
              const pos = labelsToSkip + 1 + index;
              const col = pos % 3;
              const row = Math.floor(pos / 3);
              const left = col === 0 ? '0.1875in' : col === 1 ? '3.0375in' : '5.7875in';
              const top = (0.5 + row * 1.0) + 'in';
              return `
              <div class="label" style="left:${left};top:${top};">
                <div class="label-content">
                  <div class="medication-name" style="border-left-color: ${getMedicationAccentColor(item.category)};">${item.name}</div>
                  <div class="med-subtitle">${item.subtitle}</div>
                  <div class="med-id">${item.barcode}</div>
                </div>
                <div class="barcode-area">
                  <img class="qr-img" src="${medQRs[index]}" alt="QR" />
                </div>
              </div>`;
            }).join('')}
            ${Array(Math.max(0, 30 - labelsToSkip - 1 - duplicatedItems.length)).fill(0).map((_, idx) => {
              const pos = labelsToSkip + 1 + duplicatedItems.length + idx;
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
            <p className="text-sm text-gray-600 mt-1">One label per distinct medication — no patient-specific info</p>
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
              <strong>Quantity: {quantity}×</strong> - Each medication will have {quantity} label{quantity !== 1 ? 's' : ''} printed ({items.length} medication{items.length !== 1 ? 's' : ''} × {quantity} = {duplicatedItems.length} total labels)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{gridTemplateColumns: 'repeat(3, 2.625in)'}}>
            {duplicatedItems.slice(0, 15).map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="border border-gray-300 p-1 bg-white flex items-stretch rounded shadow-sm" style={{width: '2.625in', height: '1in'}}>
                <div className="flex-1 flex flex-col justify-center px-2 bg-gradient-to-br from-gray-50 to-white border-r-2 border-gray-200" style={{minWidth: '1.6in'}}>
                  <div
                    className="font-extrabold text-sm mb-1 leading-tight uppercase tracking-wide px-2 py-1 bg-gradient-to-r from-blue-50 to-transparent border-l-3 rounded"
                    style={{ borderLeftWidth: '3px', borderLeftColor: getMedicationAccentColor(item.category) }}
                  >
                    {item.name}
                  </div>
                  <div className="text-xs font-semibold leading-tight mt-1 px-2 py-1 rounded text-gray-700">{item.subtitle}</div>
                  <div className="text-xs font-mono mt-1 px-2 text-gray-500">{item.barcode}</div>
                </div>
                <div className="w-20 h-full flex justify-center items-center border-l border-gray-200">
                  <QrThumbnail data={item.barcode} size={70} />
                </div>
              </div>
            ))}
          </div>
          {duplicatedItems.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 15 labels. Print will include all {duplicatedItems.length} medication labels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

