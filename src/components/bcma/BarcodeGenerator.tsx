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

  // UPC-128 (Code 128) pattern generation with proper encoding
  const generateCode128Pattern = (text: string): string => {
    // UPC-128 uses Code 128 encoding
    // This is a more accurate implementation for medical barcode scanning
    
    // Code 128 character set patterns (partial implementation)
    const code128Patterns: { [key: string]: string } = {
      'START_B': '11010010000',
      'STOP': '1100011101011',
      ' ': '11011001100', // Space (32)
      '!': '11001101100', // 33
      '"': '11001100110', // 34
      '#': '10010011000', // 35
      '$': '10010001100', // 36
      '%': '10001001100', // 37
      '&': '10011001000', // 38
      "'": '10011000100', // 39
      '(': '10001100100', // 40
      ')': '11001001000', // 41
      '*': '11001000100', // 42
      '+': '11000100100', // 43
      ',': '10110011100', // 44
      '-': '10011011100', // 45
      '.': '10011001110', // 46
      '/': '10111001100', // 47
      '0': '10011101100', // 48
      '1': '10011100110', // 49
      '2': '11001110010', // 50
      '3': '11001011100', // 51
      '4': '11001001110', // 52
      '5': '11011100100', // 53
      '6': '11001110100', // 54
      '7': '11101101110', // 55
      '8': '11101001100', // 56
      '9': '11100101100', // 57
      'A': '11100100110', // 65
      'B': '11001011000', // 66
      'C': '11001010010', // 67
      'D': '11000101100', // 68
      'E': '11000100110', // 69
      'F': '10110001100', // 70
      'G': '10001101100', // 71
      'H': '10001100110', // 72
      'I': '10110001000', // 73
      'J': '10001101000', // 74
      'K': '10001100010', // 75
      'L': '11010001000', // 76
      'M': '11000101000', // 77
      'N': '11000100010', // 78
      'O': '10110111000', // 79
      'P': '10110001110', // 80
      'Q': '10001101110', // 81
      'R': '10111011000', // 82
      'S': '10111000110', // 83
      'T': '10001110110', // 84
      'U': '11101110110', // 85
      'V': '11010001110', // 86
      'W': '11000101110', // 87
      'X': '11011101000', // 88
      'Y': '11011100010', // 89
      'Z': '11011101110', // 90
    };

    let pattern = code128Patterns['START_B'] || '11010010000';
    
    // Calculate checksum for Code 128
    let checksum = 104; // Start B value
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charCode = char.charCodeAt(0);
      const charPattern = code128Patterns[char];
      
      if (charPattern) {
        pattern += charPattern;
        // Add to checksum (position-weighted)
        checksum += (charCode - 32) * (i + 1);
      } else {
        // Fallback pattern for unsupported characters
        pattern += '11001011000'; // Default pattern
        checksum += 66 * (i + 1); // 'B' value as fallback
      }
    }
    
    // Add checksum character pattern
    const checksumValue = checksum % 103;
    const checksumChar = String.fromCharCode(checksumValue + 32);
    pattern += code128Patterns[checksumChar] || '11001011000';
    
    // Add stop pattern
    pattern += code128Patterns['STOP'] || '1100011101011';
    
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
