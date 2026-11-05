import { useEffect, useRef } from 'react';
import { isBCMACurrentlyActive } from '../../../services/simulation/bcmaState';

/**
 * Subscribe to scanner input (the global `barcodescanned` event fired by
 * lib/barcode/barcodeScanner for hardware scanners and by the Rover camera). Scans are ignored while a BCMA verification is open so the
 * Five-Rights check keeps exclusive use of the scanner.
 */
export function useRoverScan(onScan: (barcode: string) => void) {
  const handlerRef = useRef(onScan);
  useEffect(() => {
    handlerRef.current = onScan;
  });

  useEffect(() => {
    const listener = (event: Event) => {
      if (isBCMACurrentlyActive()) return;
      const barcode = (event as CustomEvent<{ barcode?: string }>).detail?.barcode;
      if (barcode) handlerRef.current(barcode);
    };
    document.addEventListener('barcodescanned', listener);
    return () => document.removeEventListener('barcodescanned', listener);
  }, []);
}
