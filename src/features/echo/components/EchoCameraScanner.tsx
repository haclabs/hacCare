import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { secureLogger } from '../../../lib/security/secureLogger';
import { describeCameraError, getCodeDetector, getScanWindowCrop, getScanWindowSize } from '../cameraScanner';

const SCAN_INTERVAL_MS = 150;

interface EchoCameraScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

function useViewportSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

/** Full-screen camera view with a square window; the first code read inside it is returned. */
export const EchoCameraScanner: React.FC<EchoCameraScannerProps> = ({ onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const viewport = useViewportSize();
  const viewportRef = useRef(viewport);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    viewportRef.current = viewport;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const fail = (message: string, err: unknown) => {
      if (stopped) return;
      secureLogger.error('Echo camera scan failed', err);
      setError(message);
      setStatus('error');
    };

    const start = async () => {
      const detectorPromise = getCodeDetector();
      detectorPromise.catch(() => undefined);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (stopped) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
      } catch (err) {
        fail(describeCameraError(err), err);
        return;
      }

      try {
        const detector = await detectorPromise;
        const video = videoRef.current;
        if (stopped || !video || !context || !stream) return;
        video.srcObject = stream;
        await video.play();
        setStatus('scanning');

        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth) {
            const { width, height } = viewportRef.current;
            const crop = getScanWindowCrop(video.videoWidth, video.videoHeight, width, height);
            canvas.width = canvas.height = Math.round(crop.size);
            context.drawImage(video, crop.x, crop.y, crop.size, crop.size, 0, 0, canvas.width, canvas.height);
            try {
              const code = (await detector.detect(canvas)).find((c) => c.rawValue.trim());
              if (code && !stopped) {
                stopped = true;
                navigator.vibrate?.(80);
                onDetectedRef.current(code.rawValue.trim());
                return;
              }
            } catch (err) {
              secureLogger.debug('Echo camera: frame decode failed', err);
            }
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch (err) {
        fail('The barcode reader could not be started. Check the connection and try again.', err);
      }
    };

    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const windowSize = getScanWindowSize(viewport.width, viewport.height);

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan with camera" className="fixed inset-0 z-[80] bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay muted playsInline />

      {/* The huge shadow darkens everything outside the window */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
        style={{ width: windowSize, height: windowSize }}
      >
        {['left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
          'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl',
        ].map((corner) => (
          <span key={corner} className={`absolute h-10 w-10 border-haccare-mint ${corner}`} />
        ))}
        {status === 'scanning' && (
          <span className="absolute inset-x-4 top-1/2 h-0.5 bg-haccare-mint/80 animate-pulse" />
        )}
        {status === 'starting' && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="mt-2 text-lg font-semibold text-white drop-shadow">
          Place the wristband or medication code inside the square
        </p>
        <button
          onClick={onClose}
          aria-label="Close camera"
          className="shrink-0 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg hover:bg-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {status === 'error' && (
        <div className="absolute inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] mx-auto max-w-md rounded-xl bg-white p-4 shadow-xl">
          <div role="alert" className="flex items-start gap-3 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-haccare-teal px-4 py-3 font-semibold text-white hover:bg-haccare-teal-dark"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
