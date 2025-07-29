/**
 * Barcode Generator Component
 * Generates and displays barcodes for medications and patient wristbands
 */

import React, { useRef, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';

interface BarcodeGeneratorProps {
  data: string;
  type: 'medication' | 'patient';
  label?: string;
  onPrint?: () => void;
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  data,
  type,
  label,
  onPrint
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateBarcode();
  }, [data]);

  const generateBarcode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 300;
    canvas.height = 100;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate Code 128 barcode pattern
    const barcodePattern = generateCode128Pattern(data);
    
    // Draw barcode bars
    ctx.fillStyle = 'black';
    const barWidth = 2;
    let x = 20;

    for (let i = 0; i < barcodePattern.length; i++) {
      if (barcodePattern[i] === '1') {
        ctx.fillRect(x, 20, barWidth, 40);
      }
      x += barWidth;
    }

    // Draw human-readable text
    ctx.fillStyle = 'black';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(data, canvas.width / 2, 80);

    // Draw label if provided
    if (label) {
      ctx.font = '10px sans-serif';
      ctx.fillText(label, canvas.width / 2, 95);
    }
  };

  // Simplified Code 128 pattern generation
  const generateCode128Pattern = (text: string): string => {
    // This is a simplified implementation
    // In production, use a proper Code 128 library like JsBarcode
    let pattern = '11010010000'; // Start Code B
    
    for (let i = 0; i < text.length; i++) {
      // Add character patterns (simplified)
      pattern += '1101011000'; // Example pattern
    }
    
    pattern += '1100011101011'; // Stop pattern
    return pattern;
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create printable window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Label - ${type === 'medication' ? 'Medication' : 'Patient'}</title>
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
              ${type === 'medication' ? 'MEDICATION' : 'PATIENT'} BARCODE
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
