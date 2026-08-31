import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { type BarcodeLabelItem, MEDICATION_LABEL_ACCENT_COLOR, splitMedicationSubtitle, paginateLabelsByItem } from '../../../services/operations/bulkLabelService';

export type { BarcodeLabelItem };

interface BarcodeLabelSheetModalProps {
  items: BarcodeLabelItem[];
  title: string;
  description: string;
  quantity?: number; // labels printed per item, default 1
  onClose: () => void;
}

// Bare QR code preview (no header/print/download chrome) matching what actually prints on the label
export const QrThumbnail: React.FC<{ data: string; size?: number }> = ({ data, size = 70 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const QRCode = await import('qrcode');
      if (!cancelled && canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, data, {
          width: size,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        }).catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [data, size]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', width: '100%', height: '100%', display: 'block' }} />;
};

/**
 * Shared Avery 5160 label sheet renderer for medication barcodes.
 * One label per item (× quantity), with a QR code (no rotation needed — QR codes scan in any orientation).
 */
export const BarcodeLabelSheetModal: React.FC<BarcodeLabelSheetModalProps> = ({
  items,
  title,
  description,
  quantity = 1,
  onClose,
}) => {
  // Each item may override the label count via its own `quantity`; otherwise falls back to the sheet-wide default
  const duplicated = items.flatMap((item) => Array(item.quantity && item.quantity > 0 ? item.quantity : quantity).fill(item));

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const QRCode = await import('qrcode');
    const qrByBarcode = new Map<string, string>();
    await Promise.all(
      [...new Set(duplicated.map((item) => item.barcode))].map(async (barcode) => {
        qrByBarcode.set(
          barcode,
          await QRCode.toDataURL(barcode, { width: 80, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        );
      })
    );

    // Avery 5160 fits 30 labels per sheet — split into multiple sheets beyond that;
    // each item's labels always get their own sheet(s), never mixed with another item's
    const pages: BarcodeLabelItem[][] = paginateLabelsByItem(duplicated, 30);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Avery 5160</title>
          <style>
            @page { size: 8.5in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 7px; }
            .labels-grid { position: relative; width: 8.5in; height: 10.95in; overflow: hidden; margin: 0; padding: 0; }
            .label {
              position: absolute;
              width: 2.625in; height: 1in;
              border: 1px solid #dee2e6;
              border-left-width: 4px;
              box-sizing: border-box;
              display: flex; flex-direction: column; justify-content: space-between;
              padding: 0.07in 0.08in 0.05in 0.11in;
              text-align: left;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              border-radius: 3px;
            }
            .label:nth-child(3n+1) { left: 0.1875in; }
            .label:nth-child(3n+2) { left: 2.9375in; }
            .label:nth-child(3n+3) { left: 5.6875in; }
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
              .labels-grid:not(:last-child) { page-break-after: always; }
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${pages
            .map(
              (page) => `
          <div class="labels-grid">
            ${page
              .map(
                (item) => `
              <div class="label" style="border-left-color: ${MEDICATION_LABEL_ACCENT_COLOR};">
                <div class="med-name">${item.name}</div>
                <div class="dose-line">
                  <span class="dose-value">${splitMedicationSubtitle(item.subtitle).dose}</span>
                  <span class="dose-form">${splitMedicationSubtitle(item.subtitle).form}</span>
                </div>
                <div class="qr-corner"><img class="qr-img" src="${qrByBarcode.get(item.barcode)}" alt="QR" /></div>
                <div class="brand-footer">
                  <span class="brand-name"><strong>hac</strong><strong class="mint">Care</strong> EMR Sim</span>
                  <span class="barcode-id">${item.barcode}</span>
                </div>
              </div>`
              )
              .join('')}
            ${Array(Math.max(0, 30 - page.length))
              .fill(0)
              .map(() => `<div class="label"></div>`)
              .join('')}
          </div>`
            )
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
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
          {duplicated.length !== items.length && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm text-purple-700">
                <strong>{duplicated.length} total labels</strong> from {items.length} selected item{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, 2.625in)' }}>
            {items.slice(0, 15).map((item) => {
              const { dose, form } = splitMedicationSubtitle(item.subtitle);
              return (
                <div
                  key={item.id}
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
                  {(item.quantity ?? quantity) > 1 && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-[#14776a] rounded-full px-1.5 py-0.5">
                      ×{item.quantity ?? quantity}
                    </span>
                  )}
                  <div className="flex items-baseline justify-between text-gray-400">
                    <span className="text-[9.5px]"><strong className="text-[#1e3a5f]">hac</strong><strong className="text-[#3EB489]">Care</strong> EMR Sim</span>
                    <span className="text-[8px] font-mono">{item.barcode}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Preview showing first 15 labels. Print will include all {duplicated.length} labels.
            </div>
          )}
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
              .fixed { position: relative !important; }
              .bg-black { background: white !important; }
              .shadow-xl { box-shadow: none !important; }
              .rounded-lg { border-radius: 0 !important; }
              .border-b { display: none !important; }
              .overflow-hidden { overflow: visible !important; }
              .p-6 { padding: 0 !important; }
              .max-h-\\[90vh\\] { max-height: none !important; }
              .overflow-y-auto { overflow: visible !important; }
              .max-h-\\[70vh\\] { max-height: none !important; }
            }
          `,
          }}
        />
      </div>
    </div>
  );
};

export default BarcodeLabelSheetModal;
