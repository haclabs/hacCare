// Password generation utility for simulation users

/** Cryptographically secure random integer in [0, max) */
function cryptoRandInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // Use modulo — bias is negligible for small max values relative to 2^32
  return arr[0] % max;
}

export class PasswordGenerator {
  private static readonly ADJECTIVES = [
    'quick', 'brave', 'smart', 'calm', 'wise', 'bold', 'kind', 'cool', 'warm', 'fresh'
  ];
  
  private static readonly NOUNS = [
    'nurse', 'doctor', 'student', 'teacher', 'helper', 'leader', 'learner', 'expert', 'guide', 'mentor'
  ];
  
  private static readonly NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  /**
   * Generate a memorable temporary password for simulation users
   * Format: adjective + noun + 2-digit number (e.g., "quicknurse42")
   */
  static generateTemporaryPassword(): string {
    const adjective = this.ADJECTIVES[cryptoRandInt(this.ADJECTIVES.length)];
    const noun = this.NOUNS[cryptoRandInt(this.NOUNS.length)];
    const number1 = this.NUMBERS[cryptoRandInt(this.NUMBERS.length)];
    const number2 = this.NUMBERS[cryptoRandInt(this.NUMBERS.length)];
    
    return `${adjective}${noun}${number1}${number2}`;
  }

  /**
   * Generate a simple alphanumeric password
   */
  static generateAlphanumericPassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(cryptoRandInt(chars.length));
    }
    return password;
  }
}