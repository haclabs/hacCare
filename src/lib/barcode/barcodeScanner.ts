/**
 * Barcode Scanner Event Dispatcher
 * Ensures barcode scans are properly dispatched to listening components
 */

// Dispatch barcode scan event
export const dispatchBarcodeEvent = (barcode: string) => {
  console.log('📱 Dispatching barcode event:', barcode);
  
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
  console.log('⌨️ Key pressed:', e.key, 'Buffer:', barcodeBuffer);
  
  // Reset buffer after 100ms of inactivity
  barcodeTimeout = setTimeout(() => {
    console.log('⏰ Buffer timeout, clearing:', barcodeBuffer);
    barcodeBuffer = '';
  }, 100);

  if (e.key === 'Enter') {
    // Barcode scanners typically end with Enter
    if (barcodeBuffer.length > 3) {
      console.log('🔍 Keyboard barcode detected:', barcodeBuffer);
      dispatchBarcodeEvent(barcodeBuffer);
      barcodeBuffer = '';
    } else {
      console.log('⚠️ Buffer too short for barcode:', barcodeBuffer);
    }
  } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    // Add character to buffer (ignore modifier keys)
    barcodeBuffer += e.key;
    console.log('➕ Added to buffer:', e.key, 'Full buffer:', barcodeBuffer);
  }
};

// Initialize barcode scanner listener
export const initializeBarcodeScanner = () => {
  console.log('🔧 Initializing barcode scanner listener');
  document.addEventListener('keypress', handleKeyPress);
  
  // Add global test function for browser console
  (window as any).testBarcodeScan = (barcode: string) => {
    console.log('🧪 Console test barcode scan:', barcode);
    simulateBarcodeScan(barcode);
  };
  
  // Test that the system is working
  console.log('🔧 Barcode scanner initialized. Test with: testBarcodeScan("TEST123")');
  
  return () => {
    document.removeEventListener('keypress', handleKeyPress);
    clearTimeout(barcodeTimeout);
    delete (window as any).testBarcodeScan;
  };
};

// Manual barcode input for testing
export const simulateBarcodeScan = (barcode: string) => {
  console.log('🧪 Simulating barcode scan:', barcode);
  dispatchBarcodeEvent(barcode);
};
