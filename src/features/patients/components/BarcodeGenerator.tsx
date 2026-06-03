/**
 * QR Code Generator Component
 * Generates and displays QR codes for medications and patient wristbands.
 * QR scanners use the same HID keyboard emulation as 1D scanners — no
 * scanning infrastructure changes needed.
 */

import React, { useRef, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { secureLogger } from '../../../lib/security/secureLogger';

interface BarcodeGeneratorProps {
  data: string;
  type: 'medication' | 'patient';
  label?: string;
  onPrint?: () => void;
  vertical?: boolean;
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  data,
  type,
  label,
  onPrint,
  vertical = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const size = vertical ? 80 : 120;
    QRCode.toCanvas(canvas, data, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch((err) => {
      secureLogger.error('Error generating QR code:', err);
    });
  }, [data, vertical]);

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create printable window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Label - ${type === 'medication' ? 'Medication' : 'Patient'}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .label {
              border: 1px solid #000;
              padding: 10px;
              text-align: center;
              page-break-inside: avoid;
            }
            .barcode {
              margin: 10px 0;
            }
            .info {
              font-size: 12px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="info">
              ${type === 'medication' ? 'MEDICATION' : 'PATIENT'} QR CODE
            </div>
            <div class="barcode">
              <img src="${canvas.toDataURL()}" alt="Barcode" />
            </div>
            <div class="info">
              ${label || data}
            </div>
            <div class="info">
              Generated: ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    onPrint?.();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${type}-barcode-${data}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          {type === 'medication' ? 'Medication' : 'Patient'} Barcode
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Print Label"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Download Image"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="border border-gray-300 rounded p-2 bg-white">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        ID: {data}
      </div>
    </div>
  );
};
