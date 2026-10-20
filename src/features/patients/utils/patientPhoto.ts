/**
 * Patient photo helpers. Photos are stored on patients.photo_data as a small JPEG data URL
 * (see migration 20261020000001_add_patient_photo.sql for why it isn't in Storage).
 */

export const PATIENT_PHOTO_SIZE = 256;
/** Mirrors the patients_photo_data_check constraint. */
export const PATIENT_PHOTO_MAX_CHARS = 200_000;
export const PATIENT_PHOTO_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Only accept raster data URLs we produced, so a stored value can't point anywhere else. */
export function isValidPhotoData(value: unknown): value is string {
  return typeof value === 'string' && value.length <= PATIENT_PHOTO_MAX_CHARS && PHOTO_DATA_URL.test(value);
}

/** Centre-crop to a square and scale down to size×size. */
export function squareCropRect(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

/** Reads an uploaded image, centre-crops it to a square and re-encodes it as a small JPEG. */
export async function resizePatientPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > PATIENT_PHOTO_MAX_UPLOAD_BYTES) throw new Error('That image is over 10 MB. Please choose a smaller one.');

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That image couldn't be read. Try a JPG or PNG.");
  });

  try {
    const canvas = document.createElement('canvas');
    canvas.width = PATIENT_PHOTO_SIZE;
    canvas.height = PATIENT_PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Your browser couldn't process the image.");

    const { sx, sy, side } = squareCropRect(bitmap.width, bitmap.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PATIENT_PHOTO_SIZE, PATIENT_PHOTO_SIZE);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, PATIENT_PHOTO_SIZE, PATIENT_PHOTO_SIZE);

    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (isValidPhotoData(dataUrl)) return dataUrl;
    }
    throw new Error("That image couldn't be made small enough. Try a simpler photo.");
  } finally {
    bitmap.close();
  }
}
