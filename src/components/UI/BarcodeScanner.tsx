import React, { useEffect } from 'react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  debug?: boolean;
  className?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  debug = false,
  className = ''
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
    </div>
  );
};

export default BarcodeScanner;
