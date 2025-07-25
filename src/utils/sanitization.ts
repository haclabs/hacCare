/**
 * ML-powered anomaly detection for unusual input patterns
 */
export class MLSanitizationEngine {
  private model: TensorFlowModel;
  private trainingData: InputPattern[] = [];

  async detectAnomalies(input: string): Promise<AnomalyReport> {
    constimport DOMPurify from 'dompurify';

/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user inputs and prevent XSS attacks
 * while maintaining functionality for the healthcare application.
 */

/**
 * Sanitize HTML content by removing potentially dangerous elements and attributes.
 * This uses DOMPurify, the industry-standard HTML sanitization library.
 * 
 * @param input - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 * 
 * @example
 * ```typescript
 * const safeHtml = sanitizeHtml('<p>Safe content</p><script>alert("xss")</script>');
 * // Returns: '<p>Safe content</p>'
 * ```
 */
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string' || !input) return '';

  // Use DOMPurify for robust HTML sanitization
  return DOMPurify.sanitize(input, {
    // Allow safe HTML elements for healthcare content
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code',
      'a', 'img'
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      'class', 'id', 'title', 'alt', 'src', 'href', 'target',
      'style', 'width', 'height', 'colspan', 'rowspan'
    ],
    // Additional security options
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    // Return DOM instead of string for better performance if needed
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    // Sanitize SVG
    USE_PROFILES: { html: true }
  });
};

/**
 * Sanitize HTML content with stricter rules for sensitive healthcare data.
 * This version only allows basic text formatting and removes all links and images.
 * 
 * @param input - The HTML string to sanitize with strict rules
 * @returns Sanitized HTML string with only basic text formatting
 * 
 * @example
 * ```typescript
 * const strictHtml = sanitizeHtmlStrict('<p>Text with <a href="link">link</a></p>');
 * // Returns: '<p>Text with link</p>'
 * ```
 */
export const sanitizeHtmlStrict = (input: string): string => {
  if (typeof input !== 'string' || !input) return '';

  return DOMPurify.sanitize(input, {
    // Only allow basic text formatting elements
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code'
    ],
    // Minimal safe attributes
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'a', 'img', 'link'],
    FORBID_ATTR: ['href', 'src', 'style', 'onclick', 'onerror', 'onload'],
    RETURN_DOM: false,
    USE_PROFILES: { html: true }
  });
};

/**
 * Sanitize user input for database storage. This is a stricter version of sanitizeHtml.
 * Strips all HTML tags and prevents SQL injection patterns.
 * 
 * @param input - The user input string to sanitize
 * @returns Plain text string safe for database storage
 * 
 * @example
 * ```typescript
 * const safeInput = sanitizeUserInput('<script>alert("xss")</script>User input');
 * // Returns: 'User input'
 * ```
 */
export const sanitizeUserInput = (input: string): string => {
  if (typeof input !== 'string' || !input) return '';

  // For general user input, treat it as plain text (no HTML allowed)
  // DOMPurify will escape any HTML tags when ALLOWED_TAGS is empty
  let sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true // Keep text content but remove HTML tags
  });

  // Additionally, remove potential SQL injection patterns
  sanitized = sanitized.replace(/(['";]|--|\*|\/\*|\*\/)/g, '');
  
  // Remove common SQL injection keywords (case insensitive)
  sanitized = sanitized.replace(/\b(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|SELECT)\s+/gi, '');
  
  // Normalize whitespace
  return sanitized.replace(/\s+/g, ' ').trim();
};

/**
 * Validate and sanitize medical data inputs
 */
export const sanitizeMedicalData = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    // Allow medical terminology and common characters
    .replace(/[^a-zA-Z0-9\s\-_.,()\/:]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Limit length for safety
    .substring(0, 1000);
};

/**
 * Sanitize search queries
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (typeof query !== 'string') return '';

  return query
    .trim()
    // Remove special regex characters that could cause issues
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Limit length
    .substring(0, 100)
    .trim();
};

/**
 * Validate email addresses
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';

  return email
    .trim()
    .toLowerCase()
    // Basic email validation pattern
    .replace(/[^a-zA-Z0-9@._-]/g, '')
    .substring(0, 254); // RFC 5321 limit
};

/**
 * Sanitize phone numbers
 */
export const sanitizePhoneNumber = (phone: string): string => {
  if (typeof phone !== 'string') return '';

  return phone
    .trim()
    // Remove all non-numeric characters except + and -
    .replace(/[^0-9+\-() ]/g, '')
    .substring(0, 20);
};

/**
 * Sanitize patient ID or medical record numbers
 */
export const sanitizeMedicalId = (id: string): string => {
  if (typeof id !== 'string') return '';

  return id
    .trim()
    .toUpperCase()
    // Allow alphanumeric and common separators
    .replace(/[^A-Z0-9\-_]/g, '')
    .substring(0, 50);
};

/**
 * Generic field sanitization with custom validation
 */
export const sanitizeField = (
  input: string, 
  options: {
    maxLength?: number;
    allowedChars?: RegExp;
    trim?: boolean;
    caseSensitive?: boolean;
  } = {}
): string => {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Apply case transformation
  if (options.caseSensitive === false) {
    sanitized = sanitized.toLowerCase();
  }

  // Filter allowed characters
  if (options.allowedChars) {
    sanitized = sanitized.replace(options.allowedChars, '');
  }

  // Limit length
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
};

/**
 * Validation helpers
 */
export const ValidationHelpers = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  isValidPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d\-\(\)\s]{7,20}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  isValidMedicalId: (id: string): boolean => {
    const idRegex = /^[A-Z0-9\-_]{3,50}$/;
    return idRegex.test(id);
  },

  isSafeLength: (input: string, maxLength: number = 1000): boolean => {
    return typeof input === 'string' && input.length <= maxLength;
  },

  containsNoScripts: (input: string): boolean => {
    // NOTE: For actual HTML sanitization, prefer using sanitizeHtml() which uses DOMPurify
    // This function is kept for validation purposes only
    
    // More robust regex that handles script tags with various formats:
    // - <script> opening tags with optional attributes
    // - </script> closing tags with optional spaces/attributes
    // - Handles case insensitivity and whitespace variations
    const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
    
    // Also check for script tags without proper closing (incomplete tags)
    const incompleteScriptRegex = /<script\b[^>]*>(?![\s\S]*<\/script\s*>)/gi;
    
    return !scriptRegex.test(input) && !incompleteScriptRegex.test(input);
  },
} as const;
