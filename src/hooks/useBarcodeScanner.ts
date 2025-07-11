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
    minLength: 5,
    maxInputInterval: 50,
    resetTimeout: 300,
  }
) => {
  const [buffer, setBuffer] = useState<string>('');
  const [lastKeyTime, setLastKeyTime] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Clear the buffer
  const clearBuffer = useCallback(() => {
    setBuffer('');
    setIsScanning(false);
  }, []);

  // Process keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only log in debug mode to reduce console spam
      const isDebugMode = localStorage.getItem('debug-mode') === 'true';
      if (isDebugMode) console.log('Barcode scanner keydown:', event.key);
      const currentTime = new Date().getTime();
      
      // Ignore if the target is an input element
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        if (isDebugMode) console.log('Ignoring keydown in input element');
        return;
      }

      // Check if this is likely from a barcode scanner (fast input)
      const isLikelyBarcodeScanner = 
        currentTime - lastKeyTime < options.maxInputInterval || 
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
      if (!isLikelyBarcodeScanner && !isScanning) {
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
        if (buffer.length >= options.minLength) {
          onScan(buffer);
        }
        clearBuffer();
        event.preventDefault();
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

  return { buffer, clearBuffer };
};