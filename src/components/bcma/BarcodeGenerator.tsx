/**
 * Professional Barcode Generator Component
 * Uses JsBarcode library for handheld scanner compatibility
 */

import React, { useRef, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import JsBarcode from 'jsbarcode';

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
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    generateBarcode();
  }, [data]);

  const generateBarcode = () => {
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    
    if (!canvas || !svg) return;

    try {
      // Try CODE128 first (most common for medical applications)
      JsBarcode(canvas, data, {
        format: "CODE128",
        width: 1.5, // Reduced width for smaller barcodes
        height: 80,  // Reduced height  
        displayValue: true,
        text: data,
        fontSize: 12,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 8
      });

      // Also generate SVG version for better print quality
      JsBarcode(svg, data, {
        format: "CODE128", 
        width: 1.5, // Reduced width for smaller barcodes
        height: 80,  // Reduced height
        displayValue: true,
        text: data,
        fontSize: 12,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 8
      });
      
    } catch (error) {
      console.error('CODE128 failed, trying CODE39:', error);
      // Fallback to CODE39 for older/basic handheld scanners
      try {
        JsBarcode(canvas, data, {
          format: "CODE39",
          width: 1.5, // Reduced width for smaller barcodes
          height: 80,  // Reduced height
          displayValue: true,
          text: data,
          fontSize: 12,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 8
        });

        JsBarcode(svg, data, {
          format: "CODE39",
          width: 1.5, // Reduced width for smaller barcodes
          height: 80,  // Reduced height
          displayValue: true,
          text: data,
          fontSize: 12,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 8
        });
      } catch (secondError) {
        console.error('Both barcode formats failed:', secondError);
        // Final fallback to text display
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 300;
          canvas.height = 120;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'black';
          ctx.font = '16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Barcode Error', canvas.width / 2, canvas.height / 2);
          ctx.fillText(data, canvas.width / 2, canvas.height / 2 + 20);
        }
      }
    }
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create printable window optimized for handheld scanning
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Label - ${type === 'medication' ? 'Medication' : 'Patient'}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
            }
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              background: white;
            }
            .label {
              border: 2px solid #000;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
              background: white;
              margin: 10px;
            }
            .barcode {
              margin: 15px 0;
              background: white;
            }
            .info {
              font-size: 14px;
              font-weight: bold;
              margin: 8px 0;
              color: #000;
            }
            .subtitle {
              font-size: 12px;
              color: #666;
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="info">
              ${type === 'medication' ? 'MEDICATION BARCODE' : 'PATIENT BARCODE'}
            </div>
            <div class="subtitle">
              ${label || 'Scan with handheld device'}
            </div>
            <div class="barcode">
              <img src="${canvas.toDataURL()}" alt="Barcode" style="max-width: 100%; height: auto;" />
            </div>
            <div class="info">
              ${data}
            </div>
            <div class="subtitle">
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

    // Create download link
    const link = document.createElement('a');
    link.download = `${type}-barcode-${data.replace(/[^a-zA-Z0-9]/g, '')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {type === 'medication' ? 'Medication Barcode' : 'Patient Barcode'}
        </h3>
        {label && (
          <p className="text-sm text-gray-600">{label}</p>
        )}
      </div>

      {/* Canvas version for display and download */}
      <div className="flex justify-center mb-4 bg-white p-4 border rounded">
        <canvas 
          ref={canvasRef}
          className="max-w-full h-auto"
        />
      </div>

      {/* SVG version (hidden, used for high-quality printing) */}
      <svg 
        ref={svgRef}
        style={{ display: 'none' }}
      />

      <div className="text-center text-sm text-gray-600 mb-4">
        <p className="font-mono bg-gray-100 px-2 py-1 rounded">{data}</p>
        <p className="text-xs mt-2 text-green-600">✅ Optimized for handheld scanners</p>
        <p className="text-xs text-gray-500">Supports CODE128 & CODE39 formats</p>
      </div>

      <div className="flex justify-center space-x-3">
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>Print Label</span>
        </button>
        
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};
