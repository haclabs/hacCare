/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user inputs and prevent XSS attacks
 * while maintaining functionality for the healthcare application.
 */

/**
 * Sanitize HTML content by removing potentially dangerous elements and attributes.
 * This uses DOMParser to safely parse the HTML and then removes dangerous parts.
 */
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string' || !input) return '';

  // Use DOMParser to safely parse the string into a document
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');

  // Remove script and style elements
  doc.querySelectorAll('script, style').forEach(elem => elem.remove());

  // Remove all attributes starting with 'on' (e.g., onclick, onmouseover)
  doc.querySelectorAll('*').forEach(elem => {
    for (const attr of [...elem.attributes]) {
      if (attr.name.startsWith('on')) {
        elem.removeAttribute(attr.name);
      }
      // Remove links with dangerous schemes
      if ((attr.name === 'href' || attr.name === 'src') && /^(javascript|data|vbscript):/i.test(attr.value)) {
        elem.removeAttribute(attr.name);
      }
    }
  });

  // Return the sanitized HTML from the body
  return doc.body.innerHTML;
};

/**
 * Sanitize user input for database storage. This is a stricter version of sanitizeHtml.
 */
export const sanitizeUserInput = (input: string): string => {
  if (typeof input !== 'string' || !input) return '';

  // For general user input, it's often safest to treat it as text.
  // The sanitizeHtml function above can be used if some HTML is desired.
  // For many inputs, simply escaping HTML is the goal.
  const temp = document.createElement('div');
  temp.textContent = input;
  let sanitized = temp.innerHTML;

  // Additionally, remove potential SQL injection patterns
  sanitized = sanitized.replace(/(['";]|--|\*|\/\*|\*\/)/g, '');
  
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
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    return !scriptRegex.test(input);
  },
} as const;
