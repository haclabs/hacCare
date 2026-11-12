import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { dispatchBarcodeEvent } from '../../../lib/barcode/barcodeScanner';
import { isCameraScanSupported } from '../cameraScanner';
import { EchoCameraScanner } from './EchoCameraScanner';

interface EchoCameraContextValue {
  cameraAvailable: boolean;
  openCamera: () => void;
}

const EchoCameraContext = createContext<EchoCameraContextValue>({ cameraAvailable: false, openCamera: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useEchoCamera = () => useContext(EchoCameraContext);

/**
 * Lets a phone or tablet camera stand in for a hardware scanner. A code read by the camera is
 * sent as the same `barcodescanned` event a scanner gun produces, so wristband lookup, the MAR
 * and BCMA all handle it unchanged. The floating button sits above the BCMA dialog (z-50), and
 * is lifted clear of the patient tab bar when one is showing.
 */
export const EchoCameraProvider: React.FC<{ showButton: boolean; aboveTabBar?: boolean; children: React.ReactNode }> = ({
  showButton,
  aboveTabBar = false,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const cameraAvailable = isCameraScanSupported();
  const openCamera = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const handleDetected = useCallback((code: string) => {
    setOpen(false);
    dispatchBarcodeEvent(code);
  }, []);
  const value = useMemo(() => ({ cameraAvailable, openCamera }), [cameraAvailable, openCamera]);

  return (
    <EchoCameraContext.Provider value={value}>
      {children}
      {cameraAvailable && showButton && !open && (
        <button
          onClick={openCamera}
          aria-label="Scan with camera"
          className={`fixed ${
            aboveTabBar
              ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
              : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
          } right-5 z-[70] flex items-center gap-2 rounded-full bg-haccare-teal px-5 py-4 font-semibold text-white shadow-xl hover:bg-haccare-teal-dark`}
        >
          <Camera className="h-6 w-6" />
          <span className="hidden sm:inline">Camera</span>
        </button>
      )}
      {open && <EchoCameraScanner onDetected={handleDetected} onClose={close} />}
    </EchoCameraContext.Provider>
  );
};
