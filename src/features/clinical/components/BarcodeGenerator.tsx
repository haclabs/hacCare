/**
 * Barcode Generator Component
 * Generates and di      } : {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        font: "monospace",
        fontSize: 10,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 2,
        fontOptions: "",
        background: "#ffffff",
        lineColor: "#000000",
        margin: 8,
        marginTop: 8,
        marginBottom: 15,
        marginLeft: 8,
        marginRight: 8
      };128 barcodes for medications and patient wristbands
 */

import React, { useRef, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import JsBarcode from 'jsbarcode';

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
    generateBarcode();
  }, [data]);

  const generateBarcode = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    try {
      // Configure barcode based on orientation
      const barcodeConfig = vertical ? {
        format: "CODE128",
        width: 1,            // Back to standard width - thick bars can cause scan issues
        height: 60,
        displayValue: true,
        font: "monospace",
        fontSize: 8,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 2,
        fontOptions: "",
        background: "#ffffff",
        lineColor: "#000000",
        margin: 0,           
        marginTop: 0,        
        marginBottom: 8,     // Keep bottom margin for text spacing
        marginLeft: 0,       
        marginRight: 0       
      } : {
        format: "CODE128",
        width: 1,
        height: 40,
        displayValue: true,
        font: "monospace",
        fontSize: 10,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 2,
        fontOptions: "",
        background: "#ffffff",
        lineColor: "#000000",
        margin: 5,
        marginTop: 5,
        marginBottom: 10,
        marginLeft: 5,
        marginRight: 5
      };

      // Generate proper Code 128 barcode using JsBarcode
      JsBarcode(canvas, data, barcodeConfig);

      // Add additional label if provided
      if (label) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'black';
          ctx.font = vertical ? '8px sans-serif' : '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, canvas.width / 2, canvas.height - 5);
        }
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
      
      // Fallback: Draw error message
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = vertical ? 160 : 300;  // Increased from 140 to 160 for even wider vertical barcodes
        canvas.height = vertical ? 180 : 100;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'red';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Error generating barcode', canvas.width / 2, canvas.height / 2);
        ctx.fillText(`Data: ${data}`, canvas.width / 2, 60);
      }
    }
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
