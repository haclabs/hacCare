/**
 * Barcode Scanner Component
 * Handles barcode scanning for medications and patient wristbands
 * 
 * Supported Barcode Formats:
 * - Medication: CODE128 format, alphanumeric IDs (e.g., ACE3D4DD4)
 * - Patient: CODE128 format, PT prefix + patient ID (e.g., PT12345678)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, AlertTriangle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string, type: 'medication' | 'patient') => void;
  expectedType: 'medication' | 'patient';
  isActive: boolean;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  expectedType,
  isActive,
  onClose
}) => {
  const [lastScanned, setLastScanned] = useState<string>('');
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive]);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied or not available');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Handle keyboard input for testing (simulate barcode scanner)
  useEffect(() => {
    let inputBuffer = '';
    let inputTimer: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isActive) return;

      // Clear buffer after 100ms of no input
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        inputBuffer = '';
      }, 100);

      if (e.key === 'Enter') {
        if (inputBuffer.length > 0) {
          handleBarcodeDetected(inputBuffer);
          inputBuffer = '';
        }
      } else if (e.key.length === 1) {
        inputBuffer += e.key;
      }
    };

    if (isActive) {
      document.addEventListener('keypress', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(inputTimer);
    };
  }, [isActive]);

  const handleBarcodeDetected = (barcode: string) => {
    if (barcode === lastScanned) return; // Prevent duplicate scans

    setLastScanned(barcode);
    
    // Determine barcode type based on prefix or format
    let detectedType: 'medication' | 'patient';
    
    // Updated logic for new barcode formats:
    // - Patient barcodes start with 'PT' (e.g., PT12345678)
    // - Medication barcodes are alphanumeric without prefix (e.g., ACE3D4DD4)
    if (barcode.startsWith('PT') || barcode.startsWith('PAT-')) {
      detectedType = 'patient';
    } else if (barcode.startsWith('MED-') || barcode.startsWith('RX-')) {
      // Legacy medication prefixes (for backward compatibility)
      detectedType = 'medication';
    } else if (/^[A-Z0-9]{6,12}$/i.test(barcode)) {
      // Alphanumeric medication IDs (new format)
      detectedType = 'medication';
    } else {
      // Fallback to expected type
      detectedType = expectedType;
    }

    onScan(barcode, detectedType);
  };

  const handleManualInput = () => {
    const input = prompt(`Enter ${expectedType} barcode manually:`);
    if (input && input.trim()) {
      handleBarcodeDetected(input.trim());
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Scan {expectedType === 'medication' ? 'Medication' : 'Patient'} Barcode
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Camera Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                autoPlay
                muted
                playsInline
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-red-500 w-64 h-16 relative">
                  <div className="absolute inset-0 bg-red-500 bg-opacity-20"></div>
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {expectedType === 'medication' 
                  ? 'Position the medication barcode (CODE128 format) within the red frame'
                  : 'Position the patient wristband barcode (PT prefix) within the red frame'
                }
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {expectedType === 'medication' 
                  ? 'Expected format: alphanumeric ID (e.g., ACE3D4DD4)'
                  : 'Expected format: PT + patient ID (e.g., PT12345678)'
                }
              </p>
            </div>

            <button
              onClick={handleManualInput}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Enter Barcode Manually
            </button>

            {lastScanned && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Last scanned: {lastScanned}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>You can also use a physical barcode scanner</p>
            <p>The scanner will automatically detect input</p>
          </div>
        </div>
      </div>
    </div>
  );
};
