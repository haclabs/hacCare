// Password generation utility for simulation users
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
    const adjective = this.ADJECTIVES[Math.floor(Math.random() * this.ADJECTIVES.length)];
    const noun = this.NOUNS[Math.floor(Math.random() * this.NOUNS.length)];
    const number1 = this.NUMBERS[Math.floor(Math.random() * this.NUMBERS.length)];
    const number2 = this.NUMBERS[Math.floor(Math.random() * this.NUMBERS.length)];
    
    return `${adjective}${noun}${number1}${number2}`;
  }

  /**
   * Generate a simple alphanumeric password
   */
  static generateAlphanumericPassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}