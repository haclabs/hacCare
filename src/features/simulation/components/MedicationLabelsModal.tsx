import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { QrThumbnail } from '../../admin/components/BarcodeLabelSheetModal';
import { type BarcodeLabelItem, MEDICATION_LABEL_ACCENT_COLOR, splitMedicationSubtitle } from '../../../services/operations/bulkLabelService';
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
              border-left-width: 4px;
              box-sizing: border-box;
              display: flex; flex-direction: column; justify-content: space-between;
              padding: 0.07in 0.08in 0.05in 0.11in;
              overflow: hidden; background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 3px;
            }
            .med-name {
              font-size: 12px; font-weight: 800; color: #111827; text-transform: uppercase;
              letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              max-width: 1.75in;
            }
            .dose-line { display: flex; flex-direction: column; align-items: flex-start; margin-top: 2px; }
            .dose-value { font-size: 17px; font-weight: 800; color: #14776a; line-height: 1; }
            .dose-form { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px; }
            .qr-corner { position: absolute; top: 0.07in; right: 0.07in; width: 0.6in; height: 0.6in; }
            .qr-corner .qr-img { width: 100%; height: 100%; image-rendering: pixelated; }
            .brand-footer { display: flex; align-items: baseline; justify-content: space-between; color: #9ca3af; }
            .brand-footer .brand-name { font-size: 9.5px; }
            .brand-footer strong { color: #1e3a5f; }
            .brand-footer .mint { color: #3EB489; }
            .brand-footer .barcode-id { font-size: 8px; font-family: monospace; color: #9ca3af; }
            @media print {
              .label { border-top: 1px solid #dee2e6 !important; border-right: 1px solid #dee2e6 !important; border-bottom: 1px solid #dee2e6 !important; box-shadow: none !important; }
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
              const leftPos = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
              const topPos = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left:${leftPos};top:${topPos};"></div>`;
            }).join('')}
            ${(() => {
              const pos = labelsToSkip;
              const col = pos % 3;
              const row = Math.floor(pos / 3);
              const left = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
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
              const left = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
              const top = (0.5 + row * 1.0) + 'in';
              return `<div class="label" style="left:${left};top:${top};border-left-color:${MEDICATION_LABEL_ACCENT_COLOR};">
                <div class="med-name">${item.name}</div>
                <div class="dose-line">
                  <span class="dose-value">${splitMedicationSubtitle(item.subtitle).dose}</span>
                  <span class="dose-form">${splitMedicationSubtitle(item.subtitle).form}</span>
                </div>
                <div class="qr-corner"><img class="qr-img" src="${medQRs[index]}" alt="QR" /></div>
                <div class="brand-footer">
                  <span class="brand-name"><strong>hac</strong><strong class="mint">Care</strong> EMR Sim</span>
                  <span class="barcode-id">${item.barcode}</span>
                </div>
              </div>`;
            }).join('')}
            ${Array(Math.max(0, 30 - labelsToSkip - 1 - duplicatedItems.length)).fill(0).map((_, idx) => {
              const pos = labelsToSkip + 1 + duplicatedItems.length + idx;
              const col = pos % 3;
              const row = Math.floor(pos / 3);
              const left = col === 0 ? '0.1875in' : col === 1 ? '2.9375in' : '5.6875in';
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
            {duplicatedItems.slice(0, 15).map((item, idx) => {
              const { dose, form } = splitMedicationSubtitle(item.subtitle);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="relative border border-gray-300 bg-white flex flex-col justify-between rounded shadow-sm overflow-hidden px-3 py-2"
                  style={{ width: '2.625in', height: '1in', borderLeftWidth: '4px', borderLeftColor: MEDICATION_LABEL_ACCENT_COLOR }}
                >
                  <span className="text-xs font-extrabold uppercase tracking-wide text-gray-900 truncate pr-16">{item.name}</span>
                  <div className="flex flex-col items-start mt-0.5">
                    <span className="text-lg font-extrabold leading-none" style={{ color: '#14776a' }}>{dose}</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">{form}</span>
                  </div>
                  <div className="absolute top-1.5 right-1.5 w-14 h-14">
                    <QrThumbnail data={item.barcode} size={56} />
                  </div>
                  <div className="flex items-baseline justify-between text-gray-400">
                    <span className="text-[9.5px]"><strong className="text-[#1e3a5f]">hac</strong><strong className="text-[#3EB489]">Care</strong> EMR Sim</span>
                    <span className="text-[8px] font-mono">{item.barcode}</span>
                  </div>
                </div>
              );
            })}
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

