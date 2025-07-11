import { useEffect, useState, useCallback } from 'react';

/**
 * Custom hook for barcode scanner integration
 * 
 * This hook listens for keyboard input that resembles barcode scanner behavior:
 * - Fast consecutive keystrokes
 * - Typically ends with Enter key
 * - Has a minimum length requirement
 * 
 * @param onScan - Callback function that receives the scanned barcode
 * @param options - Configuration options
 * @returns Object containing the current buffer and a method to clear it
 */
export const useBarcodeScanner = (
  onScan: (barcode: string) => void,
  options = {
    minLength: 1, // Minimum length to consider as a valid barcode
    maxInputInterval: 300, // Maximum time between keystrokes to be considered part of the same scan
    resetTimeout: 500, // Time to wait after last keystroke before processing the barcode
  }
) => {
  const [buffer, setBuffer] = useState<string>('');
  const [lastKeyTime, setLastKeyTime] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(true);

  // Clear the buffer
  const clearBuffer = useCallback(() => {
    setBuffer('');
    setIsScanning(false);
  }, []);

  // Force the scanner to start listening
  const startListening = useCallback(() => {
    setIsListening(true);
    console.log('Barcode scanner started listening');
  }, []);

  // Process keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if we're not listening
      if (!isListening) return;
      
      // Debug logging
      const isDebugMode = localStorage.getItem('debug-mode') === 'true';
      if (isDebugMode) console.log('🔍 Barcode scanner keydown:', event.key, event.keyCode);
      const currentTime = new Date().getTime();
      
      // Only ignore if the target is a text input, textarea, or select element
      // AND it doesn't have the barcode-scanner-input class
      if (
        ((event.target instanceof HTMLInputElement && 
          event.target.type !== 'button' &&
          event.target.type !== 'checkbox' &&
          event.target.type !== 'radio' &&
          !(event.target as HTMLInputElement).classList.contains('barcode-scanner-input')) ||
         (event.target instanceof HTMLTextAreaElement) ||
         (event.target instanceof HTMLSelectElement))
      ) {
        if (isDebugMode) console.log('Ignoring keydown in input element');
        return;
      }

      // Check if this is likely from a barcode scanner (fast input)
      const isLikelyBarcodeScanner = 
        (currentTime - lastKeyTime < options.maxInputInterval && buffer.length > 0) || 
        buffer.length === 0;

      if (isDebugMode) {
        console.log('Barcode scanner timing:', {
          currentTime,
          lastKeyTime,
          diff: currentTime - lastKeyTime,
          maxInterval: options.maxInputInterval,
          isLikelyBarcodeScanner,
          bufferLength: buffer.length
        });
      }

      setLastKeyTime(currentTime);

      // If it's not likely from a scanner, reset
      if (!isLikelyBarcodeScanner && buffer.length > 0) {
        if (isDebugMode) console.log('Not from scanner, clearing buffer');
        clearBuffer();
        return; 
      }

      // Start scanning mode if not already started
      if (!isScanning) {
        if (isDebugMode) console.log('Starting scanning mode');
        setIsScanning(true);
      }

      // Process the key
      if (event.key === 'Enter') {
        // Enter key signals end of barcode
        console.log('Barcode scan complete:', buffer);
        // Process any code that ends with Enter, regardless of length
        if (buffer.length > 0) { 
          onScan(buffer);
          event.preventDefault(); // Prevent form submissions
          event.stopPropagation(); // Stop event bubbling
        }
        clearBuffer();
      } else if (event.key.length === 1) {
        // Only add printable characters to the buffer
        if (isDebugMode) console.log('Adding character to buffer:', event.key);
        setBuffer(prev => prev + event.key);
      }
    },
    [buffer, lastKeyTime, isScanning, options.maxInputInterval, options.minLength, onScan, clearBuffer]
  );

  // Set up and clean up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Set up reset timeout
  useEffect(() => {
    if (buffer.length > 0) {
      // Only log in debug mode
      if (localStorage.getItem('debug-mode') === 'true') {
        console.log('Setting reset timeout for buffer:', buffer);
      }
      const timeoutId = setTimeout(() => {
        if (buffer.length >= options.minLength) {
          // If we have enough characters but no Enter key was pressed,
          // still consider it a valid scan
          console.log('Barcode scan timeout, processing anyway:', buffer);
          onScan(buffer);
        }
        clearBuffer();
      }, options.resetTimeout);
      
      return () => clearTimeout(timeoutId);
    }
  }, [buffer, options.resetTimeout, options.minLength, onScan, clearBuffer]);

  return { buffer, clearBuffer, startListening };
};