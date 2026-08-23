import React, { useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';

// Standard medication label item — no patient-specific info, since dispensing
// is verified by the medication admin system rather than a per-patient label.
export interface BarcodeLabelItem {
  id: string;
  barcode: string;
  name: string;
  subtitle: string; // e.g. "25 mg · tablet"
  category?: string | null; // scheduled | prn | continuous | diabetic | stat | unscheduled
}

// Matches the category colors used in the Medication Catalog admin table
const CATEGORY_ACCENT_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  prn: '#d97706',
  continuous: '#9333ea',
  diabetic: '#dc2626',
  stat: '#ea580c',
  unscheduled: '#4b5563',
};

function getAccentColor(category?: string | null): string {
  return (category && CATEGORY_ACCENT_COLORS[category]) || '#000000';
}

interface BarcodeLabelSheetModalProps {
  items: BarcodeLabelItem[];
  title: string;
  description: string;
  quantity?: number; // labels printed per item, default 1
  onClose: () => void;
}

// Bare QR code preview (no header/print/download chrome) matching what actually prints on the label
const QrThumbnail: React.FC<{ data: string; size?: number }> = ({ data, size = 70 }) => {
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

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />;
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
  const duplicated = items.flatMap((item) => Array(quantity).fill(item));

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

    // Avery 5160 fits 30 labels per sheet — split into multiple sheets beyond that
    const pages: BarcodeLabelItem[][] = [];
    for (let i = 0; i < duplicated.length; i += 30) {
      pages.push(duplicated.slice(i, i + 30));
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Avery 5160</title>
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
              text-align: left;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              border-radius: 3px;
            }
            .label:nth-child(3n+1) { left: 0.1875in; }
            .label:nth-child(3n+2) { left: 3.0375in; }
            .label:nth-child(3n+3) { left: 5.7875in; }
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
              <div class="label">
                <div class="label-content">
                  <div class="medication-name" style="border-left-color: ${getAccentColor(item.category)};">${item.name}</div>
                  <div class="med-subtitle">${item.subtitle}</div>
                  <div class="med-id">${item.barcode}</div>
                </div>
                <div class="barcode-area">
                  <img class="qr-img" src="${qrByBarcode.get(item.barcode)}" alt="QR" />
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
          {quantity > 1 && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm text-purple-700">
                <strong>Quantity: {quantity}×</strong> - Each item will have {quantity} labels printed (
                {items.length} × {quantity} = {duplicated.length} total labels)
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, 2.625in)' }}>
            {items.slice(0, 15).map((item) => (
              <div
                key={item.id}
                className="border border-gray-300 p-1 bg-white flex items-stretch rounded shadow-sm"
                style={{ width: '2.625in', height: '1in' }}
              >
                <div
                  className="flex-1 flex flex-col justify-center px-2 bg-gradient-to-br from-gray-50 to-white border-r-2 border-gray-200"
                  style={{ minWidth: '1.6in' }}
                >
                  <div
                    className="font-extrabold text-sm mb-1 leading-tight uppercase tracking-wide px-2 py-1 bg-gradient-to-r from-blue-50 to-transparent border-l-3 rounded"
                    style={{ borderLeftWidth: '3px', borderLeftColor: getAccentColor(item.category) }}
                  >
                    {item.name}
                  </div>
                  <div className="text-xs font-semibold leading-tight mt-1 px-2 py-1 rounded text-gray-700">
                    {item.subtitle}
                  </div>
                  <div className="text-xs font-mono mt-1 px-2 text-gray-500">{item.barcode}</div>
                </div>
                <div className="w-20 h-full flex justify-center items-center border-l border-gray-200">
                  <QrThumbnail data={item.barcode} size={70} />
                </div>
              </div>
            ))}
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
