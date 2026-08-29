import React from 'react';
import { Printer, X } from 'lucide-react';
import { QrThumbnail } from './BarcodeLabelSheetModal';
import { type BarcodeLabelItem, MEDICATION_LABEL_ACCENT_COLOR, splitMedicationSubtitle } from '../../../services/operations/bulkLabelService';

interface SmallVialLabelSheetModalProps {
  items: BarcodeLabelItem[];
  onClose: () => void;
}

/**
 * Test print for Avery 5167 (1/2" x 1-3/4", 80 per sheet — 4 columns x 20 rows).
 * Stripped-down content vs. the standard Avery 5160 label: no brand footer, no
 * barcode text — just name, dose/form, and a QR code, since there's no room.
 *
 * NOTE: column/row offsets below are a best estimate (0.3in side margins,
 * 0.3in gutters, 0.5in top/bottom margins, no vertical gap) — print one test
 * sheet on plain paper and hold it against real 5167 stock before relying on it.
 */
export const SmallVialLabelSheetModal: React.FC<SmallVialLabelSheetModalProps> = ({ items, onClose }) => {
  const handlePrint = async () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const QRCode = await import('qrcode');
    const qrByBarcode = new Map<string, string>();
    await Promise.all(
      [...new Set(items.map((item) => item.barcode))].map(async (barcode) => {
        qrByBarcode.set(
          barcode,
          await QRCode.toDataURL(barcode, { width: 60, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        );
      })
    );

    // Avery 5167 fits 80 labels per sheet (4 cols x 20 rows)
    const pages: BarcodeLabelItem[][] = [];
    for (let i = 0; i < items.length; i += 80) {
      pages.push(items.slice(i, i + 80));
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Small Vial Labels - Avery 5167</title>
          <style>
            @page { size: 8.5in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 6px; }
            .labels-grid { position: relative; width: 8.5in; height: 11in; margin: 0; padding: 0; }
            .vlabel {
              position: absolute;
              width: 1.75in; height: 0.5in;
              border: 1px solid #dee2e6;
              border-left-width: 3px;
              box-sizing: border-box;
              display: flex; align-items: center; justify-content: space-between;
              padding: 0.03in 0.05in 0.03in 0.07in;
              background: #ffffff;
              overflow: hidden;
              border-radius: 2px;
            }
            .vlabel:nth-child(4n+1) { left: 0.3in; }
            .vlabel:nth-child(4n+2) { left: 2.35in; }
            .vlabel:nth-child(4n+3) { left: 4.4in; }
            .vlabel:nth-child(4n+4) { left: 6.45in; }
            .vlabel-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
            .vlabel-name { font-size: 8px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .vlabel-dose { display: flex; align-items: baseline; gap: 3px; margin-top: 1px; }
            .vlabel-dose-value { font-size: 11px; font-weight: 800; color: #14776a; line-height: 1; white-space: nowrap; }
            .vlabel-dose-form { font-size: 6.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
            .vlabel-qr { flex: 0 0 auto; width: 0.44in; height: 0.44in; margin-left: 0.05in; }
            .vlabel-qr img { width: 100%; height: 100%; image-rendering: pixelated; }
            @media print {
              .vlabel { border-top: 1px solid #dee2e6 !important; border-right: 1px solid #dee2e6 !important; border-bottom: 1px solid #dee2e6 !important; }
              .labels-grid:not(:last-child) { page-break-after: always; }
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${pages
            .map((page) => {
              const rows: string[] = [];
              for (let row = 0; row < 20; row++) {
                const top = (0.5 + row * 0.5) + 'in';
                for (let col = 0; col < 4; col++) {
                  const index = row * 4 + col;
                  const item = page[index];
                  if (!item) continue;
                  const { dose, form } = splitMedicationSubtitle(item.subtitle);
                  rows.push(`
                    <div class="vlabel" style="top: ${top}; border-left-color: ${MEDICATION_LABEL_ACCENT_COLOR};">
                      <div class="vlabel-text">
                        <div class="vlabel-name">${item.name}</div>
                        <div class="vlabel-dose">
                          <span class="vlabel-dose-value">${dose}</span>
                          <span class="vlabel-dose-form">${form}</span>
                        </div>
                      </div>
                      <div class="vlabel-qr"><img src="${qrByBarcode.get(item.barcode)}" alt="QR" /></div>
                    </div>`);
                }
              }
              return `<div class="labels-grid">${rows.join('')}</div>`;
            })
            .join('')}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Small Vial Labels (Test)</h2>
            <p className="text-sm text-gray-600 mt-1">Avery 5167 — 1/2" × 1-3/4" (80 per sheet)</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Test Sheet
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
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              <strong>Unverified layout:</strong> column/row spacing is a best estimate for Avery 5167. Print this on
              plain paper first and check it against real label stock before printing directly onto labels.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2" style={{ gridTemplateColumns: 'repeat(4, 1.75in)' }}>
            {items.slice(0, 20).map((item) => {
              const { dose, form } = splitMedicationSubtitle(item.subtitle);
              return (
                <div
                  key={item.id}
                  className="border border-gray-300 bg-white flex items-center justify-between rounded overflow-hidden px-2 py-1"
                  style={{ width: '1.75in', height: '0.5in', borderLeftWidth: '3px', borderLeftColor: MEDICATION_LABEL_ACCENT_COLOR }}
                >
                  <div className="flex flex-col justify-center min-w-0 overflow-hidden">
                    <span className="text-[8px] font-extrabold uppercase tracking-wide text-gray-900 truncate">{item.name}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-[11px] font-extrabold leading-none" style={{ color: '#14776a' }}>{dose}</span>
                      <span className="text-[6.5px] font-bold text-gray-500 uppercase tracking-wide">{form}</span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-1" style={{ width: '0.44in', height: '0.44in' }}>
                    <QrThumbnail data={item.barcode} size={44} />
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > 20 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 20 labels. Print will include all {items.length} labels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmallVialLabelSheetModal;
