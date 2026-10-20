import { describe, it, expect } from 'vitest';
import { isValidPhotoData, squareCropRect, PATIENT_PHOTO_MAX_CHARS } from './patientPhoto';

describe('isValidPhotoData', () => {
  it('accepts small raster data URLs', () => {
    expect(isValidPhotoData('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(isValidPhotoData('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
  });

  it('rejects SVG, remote URLs, non-strings and oversize values', () => {
    expect(isValidPhotoData('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isValidPhotoData('https://example.com/a.jpg')).toBe(false);
    expect(isValidPhotoData('data:image/jpeg;base64,abc"onerror=alert(1)')).toBe(false);
    expect(isValidPhotoData(null)).toBe(false);
    expect(isValidPhotoData('data:image/jpeg;base64,' + 'A'.repeat(PATIENT_PHOTO_MAX_CHARS))).toBe(false);
  });
});

describe('squareCropRect', () => {
  it('centres the crop on the longer side', () => {
    expect(squareCropRect(800, 600)).toEqual({ sx: 100, sy: 0, side: 600 });
    expect(squareCropRect(600, 900)).toEqual({ sx: 0, sy: 150, side: 600 });
    expect(squareCropRect(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });
});
