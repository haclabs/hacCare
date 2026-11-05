/**
 * Camera barcode scanning for phones and tablets without a hardware scanner.
 *
 * Uses the browser's native BarcodeDetector where it exists (Chrome on Android) and otherwise
 * the zxing-wasm ponyfill (Safari on iOS). The WASM file is bundled and served from our own
 * origin — by default the library would fetch it from a CDN, which the CSP blocks.
 */

const FORMATS = ['qr_code', 'code_128'] as const;

/** Share of the shorter screen side taken by the square scan window. */
export const SCAN_WINDOW_RATIO = 0.7;
const SCAN_WINDOW_MAX_PX = 360;

export interface DetectedCode {
  rawValue: string;
}

export interface CodeDetector {
  detect(source: CanvasImageSource): Promise<DetectedCode[]>;
}

interface NativeBarcodeDetector {
  new (options: { formats: string[] }): CodeDetector;
  getSupportedFormats(): Promise<string[]>;
}

let detectorPromise: Promise<CodeDetector> | null = null;

async function createDetector(): Promise<CodeDetector> {
  const Native = (globalThis as { BarcodeDetector?: NativeBarcodeDetector }).BarcodeDetector;
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats();
      if (supported.includes('qr_code')) {
        return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
      }
    } catch {
      // Fall through to the WASM decoder
    }
  }

  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
  });
  return new BarcodeDetector({ formats: [...FORMATS] });
}

/** Lazily create one detector per page load; the WASM decoder is ~1 MB, so only load it when asked. */
export function getCodeDetector(): Promise<CodeDetector> {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

export function isCameraScanSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/** Side length, in CSS pixels, of the square window drawn over the camera preview. */
export function getScanWindowSize(viewWidth: number, viewHeight: number): number {
  return Math.min(Math.min(viewWidth, viewHeight) * SCAN_WINDOW_RATIO, SCAN_WINDOW_MAX_PX);
}

/**
 * The part of the camera frame that sits behind the on-screen window. The preview is drawn with
 * `object-fit: cover` (centred, scaled to fill), so only codes inside the window get decoded —
 * that keeps a neighbouring label on a label sheet from being picked up by mistake.
 */
export function getScanWindowCrop(
  videoWidth: number,
  videoHeight: number,
  viewWidth: number,
  viewHeight: number
): { x: number; y: number; size: number } {
  const scale = Math.max(viewWidth / videoWidth, viewHeight / videoHeight);
  const size = Math.min(getScanWindowSize(viewWidth, viewHeight) / scale, videoWidth, videoHeight);
  return { x: (videoWidth - size) / 2, y: (videoHeight - size) / 2, size };
}

/** Plain-language message for a getUserMedia failure. */
export function describeCameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is blocked. Allow the camera for this site in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is in use by another app. Close it and try again.';
  }
  return 'The camera could not be started.';
}
