import { secureLogger } from '../security/secureLogger';
/**
 * Barcode Scanner Event Dispatcher
 * Ensures barcode scans are properly dispatched to listening components
 */

// Dispatch barcode scan event
export const dispatchBarcodeEvent = (barcode: string) => {
  secureLogger.debug('📱 Dispatching barcode event:', barcode);
  
  const event = new CustomEvent('barcodescanned', {
    detail: { barcode },
    bubbles: true,
    cancelable: true
  });
  
  document.dispatchEvent(event);
};

// Listen for keyboard barcode input (common for USB scanners)
let barcodeBuffer = '';
let barcodeTimeout: NodeJS.Timeout;

const handleKeyPress = (e: KeyboardEvent) => {
  // Clear buffer timeout
  clearTimeout(barcodeTimeout);
  
  // Debug keyboard input
  secureLogger.debug('⌨️ Key pressed:', e.key, 'Buffer:', barcodeBuffer);
  
  // Reset buffer after 100ms of inactivity
  barcodeTimeout = setTimeout(() => {
    secureLogger.debug('⏰ Buffer timeout, clearing:', barcodeBuffer);
    barcodeBuffer = '';
  }, 100);

  if (e.key === 'Enter') {
    // Barcode scanners typically end with Enter
    if (barcodeBuffer.length > 3) {
      secureLogger.debug('🔍 Keyboard barcode detected:', barcodeBuffer);
      dispatchBarcodeEvent(barcodeBuffer);
      barcodeBuffer = '';
    } else {
      secureLogger.debug('⚠️ Buffer too short for barcode:', barcodeBuffer);
    }
  } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    // Add character to buffer (ignore modifier keys)
    barcodeBuffer += e.key;
    secureLogger.debug('➕ Added to buffer:', e.key, 'Full buffer:', barcodeBuffer);
  }
};

// Initialize barcode scanner listener
export const initializeBarcodeScanner = () => {
  secureLogger.debug('🔧 Initializing barcode scanner listener');
  document.addEventListener('keypress', handleKeyPress);
  
  // Add global test function for browser console
  (window as any).testBarcodeScan = (barcode: string) => {
    secureLogger.debug('🧪 Console test barcode scan:', barcode);
    simulateBarcodeScan(barcode);
  };
  
  // Test that the system is working
  secureLogger.debug('🔧 Barcode scanner initialized. Test with: testBarcodeScan("TEST123")');
  
  return () => {
    document.removeEventListener('keypress', handleKeyPress);
    clearTimeout(barcodeTimeout);
    delete (window as any).testBarcodeScan;
  };
};

// Manual barcode input for testing
export const simulateBarcodeScan = (barcode: string) => {
  secureLogger.debug('🧪 Simulating barcode scan:', barcode);
  dispatchBarcodeEvent(barcode);
};
