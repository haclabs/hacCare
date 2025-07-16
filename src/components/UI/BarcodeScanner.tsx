import React, { useEffect } from 'react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  debug?: boolean;
  className?: string;
  isScanning?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  debug = false,
  className = '',
  isScanning = false
}) => {
  const { buffer } = useBarcodeScanner(onScan, {
    minLength: 3,
    maxInputInterval: 300,
    resetTimeout: 500
  });

  useEffect(() => {
    if (debug) console.log('🔢 Buffer updated:', buffer);
  }, [buffer, debug]);

  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      {debug && <div>Buffer: {buffer}</div>}
      {/* Optionally show scanning status visually */}
      {isScanning && <div className="text-blue-500">Scanning...</div>}
    </div>
  );
};

export default BarcodeScanner;
