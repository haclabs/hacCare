/**
 * Secure Random Number Generation
 * 
 * Uses crypto.getRandomValues() instead of Math.random() for cryptographically
 * secure random number generation.
 */

/**
 * Generate a cryptographically secure random integer between min and max (inclusive)
 */
export function getSecureRandomInt(min: number, max: number): number {
  if (min >= max) {
    throw new Error('min must be less than max');
  }
  
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const cutoff = Math.floor(maxValue / range) * range;
  
  const randomBytes = new Uint8Array(bytesNeeded);
  
  let randomValue;
  do {
    crypto.getRandomValues(randomBytes);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = randomValue * 256 + randomBytes[i];
    }
  } while (randomValue >= cutoff);
  
  return min + (randomValue % range);
}

/**
 * Generate a cryptographically secure random patient ID
 */
export function generateSecurePatientId(): string {
  const randomNum = getSecureRandomInt(10000, 99999);
  return `PT${randomNum}`;
}

/**
 * Generate a cryptographically secure random UUID-like ID
 */
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // Convert to hex string
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a secure random string of specified length
 */
export function generateSecureRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  return Array.from(array)
    .map(b => b.toString(36))
    .join('')
    .substring(0, length);
}
