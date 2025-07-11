import React, { useState } from 'react';
import { Scan, QrCode, Barcode } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isScanning?: boolean;
}

/**
 * Barcode Scanner Component
 * 
 * Visual indicator and manual input for barcode scanning.
 * This component provides:
 * 1. A visual indicator when scanning is active
 * 2. A manual input option for testing or when a physical scanner isn't available
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScan,
  isScanning = false
}) => {
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualScan = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
      setShowManualInput(false);
    }
  };

  return (
    <div className="relative">
      {/* Scanner Button */}
      <button
        onClick={() => setShowManualInput(!showManualInput)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
          isScanning 
            ? 'bg-green-100 text-green-700 border border-green-300 animate-pulse' 
            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
        }`}
        title="Scan barcode or enter manually"
      >
        <Barcode className="h-4 w-4" />
        <span>Scan Barcode</span>
      </button>

      {/* Manual Input Dropdown */}
      {showManualInput && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center space-x-2 mb-2">
            <QrCode className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Manual Barcode Entry</span>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter barcode value"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
            />
            <button
              onClick={handleManualScan}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Scan
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            <p>Example formats:</p>
            <p>• Patient: PT12345</p>
            <p>• Medication: MED123456</p>
          </div>
        </div>
      )}
    </div>
  );
};