/**
 * Security Configuration for hacCare
 * 
 * This file centralizes security settings and constants
 * to ensure consistent security practices across the application.
 */

export const SECURITY_CONFIG = {
  // Session Management
  SESSION: {
    MAX_IDLE_TIME: 30 * 60 * 1000, // 30 minutes in milliseconds
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    REMEMBER_ME_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    MAX_AGE_DAYS: 90,
    HISTORY_COUNT: 5, // Don't reuse last 5 passwords
  },

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
    API_REQUESTS_PER_MINUTE: 100,
    PASSWORD_RESET_ATTEMPTS: 3,
    PASSWORD_RESET_WINDOW: 60 * 60 * 1000, // 1 hour
  },

  // Content Security
  CSP: {
    ALLOWED_ORIGINS: ['https://*.supabase.co'],
    ALLOWED_SCRIPTS: ['self', 'unsafe-inline'], // Minimize unsafe-inline usage
    ALLOWED_STYLES: ['self', 'unsafe-inline'],
    ALLOWED_IMAGES: ['self', 'data:', 'https:'],
  },

  // Data Validation
  VALIDATION: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    MAX_TEXT_LENGTH: 10000,
    SANITIZE_HTML: true,
  },

  // Audit & Logging
  AUDIT: {
    LOG_LEVEL: import.meta.env.PROD ? 'warn' : 'debug',
    RETAIN_LOGS_DAYS: 90,
    SENSITIVE_FIELDS: ['password', 'token', 'key', 'secret'],
  },
} as const;

/**
 * Security utility functions
 */
export const SecurityUtils = {
  /**
   * Sanitize log data by removing sensitive information
   */
  sanitizeLogData: (data: any): any => {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = { ...data };
    SECURITY_CONFIG.AUDIT.SENSITIVE_FIELDS.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  },

  /**
   * Validate password against security policy
   */
  validatePassword: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const policy = SECURITY_CONFIG.PASSWORD;

    if (password.length < policy.MIN_LENGTH) {
      errors.push(`Password must be at least ${policy.MIN_LENGTH} characters long`);
    }

    if (policy.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.REQUIRE_SPECIAL_CHARS && !new RegExp(`[${policy.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Check if content appears to be malicious
   */
  sanitizeInput: (input: string): string => {
    // Remove potential XSS vectors
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },
} as const;
