import { useEffect, useState, useCallback } from 'react';
import { isBCMACurrentlyActive } from '../lib/bcmaState';

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
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if we're not listening
    if (!isListening) return;
    
    // Skip if BCMA is active - let BCMA handle barcode events
    if (isBCMACurrentlyActive()) {
      console.log('🔵 Header barcode scanner: BCMA is active, skipping event handling');
      return;
    }
    
    // Debug logging
    const isDebugMode = localStorage.getItem('debug-mode') === 'true';
    if (isDebugMode) console.log('🔍 Barcode scanner keydown:', event.key, event.keyCode);
    const currentTime = new Date().getTime();
    
    // Check if we're in an input field that should handle its own input
    // IMPORTANT: We need to specifically allow barcode-scanner-input class
    const isInputField = 
      event.target instanceof HTMLInputElement || 
      event.target instanceof HTMLTextAreaElement || 
      event.target instanceof HTMLSelectElement;
    
    const isBarcodeInput = 
      event.target instanceof HTMLInputElement && 
      (event.target as HTMLInputElement).classList.contains('barcode-scanner-input');
    
    // Allow normal input behavior for barcode-scanner-input class
    if (isInputField && !isBarcodeInput) {
      if (isDebugMode) console.log('Ignoring keydown in standard input element');
      return;
    }
    
    // For barcode input fields, we want to allow normal typing but still capture Enter
    if (isBarcodeInput && event.key !== 'Enter') {
      if (isDebugMode) console.log('Allowing typing in barcode input field');
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
        bufferLength: buffer.length,
        isBarcodeInput
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

    // For non-barcode inputs, prevent default for all keys during scanning
    // For barcode inputs, only prevent default for Enter key
    if (!isBarcodeInput || (isBarcodeInput && event.key === 'Enter')) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Process the key
    if (event.key === 'Enter') {
      // Enter key signals end of barcode
      console.log('Barcode scan complete:', buffer);
      
      // For barcode input fields, get the value from the input
      if (isBarcodeInput) {
        const inputValue = (event.target as HTMLInputElement).value;
        if (inputValue && inputValue.length > 0) {
          console.log('Using input field value:', inputValue);
          onScan(inputValue);
        }
      } 
      // For regular scanning, use the buffer
      else if (buffer.length > 0) {
        onScan(buffer);
      }
      
      clearBuffer();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      // Only add printable characters to the buffer
      // Exclude any key combinations that might trigger browser shortcuts
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