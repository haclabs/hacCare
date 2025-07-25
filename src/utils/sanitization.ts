import DOMPurify from 'dompurify';

/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user inputs and prevent XSS attacks
 * while maintaining functionality for the healthcare application.
 */

// Types for the AI-powered system
interface ContentClassification {
  type: 'medical-note' | 'patient-data' | 'general' | 'sensitive' | 'phi-containing';
  confidence: number;
  detectedElements: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface SmartSanitizationResult {
  sanitized: string;
  classification: ContentClassification;
  appliedRules: string[];
  phiDetected: PHIMatch[];
  threatScore: number;
  recommendations: string[];
}

interface PHIMatch {
  type: 'ssn' | 'mrn' | 'dob' | 'phone' | 'email' | 'address' | 'insurance';
  value: string;
  redacted: string;
  position: number;
  confidence: number;
}

/**
 * 🤖 AI-Powered Smart Sanitization Engine
 * 
 * Automatically classifies content and applies appropriate sanitization rules
 * with advanced threat detection and PHI handling for healthcare applications.
 */
export class SmartSanitizationEngine {
  private medicalTerms: Set<string> = new Set();
  private phiPatterns: Map<string, RegExp> = new Map();
  private threatPatterns: Map<string, RegExp> = new Map();

  constructor() {
    this.initializePatterns();
    this.loadMedicalTerms();
  }

  /**
   * 🚀 Main smart sanitization function
   * Analyzes content and applies intelligent sanitization
   */
  async smartSanitize(input: string, context?: {
    userRole?: 'doctor' | 'nurse' | 'admin' | 'patient';
    department?: string;
    urgency?: 'low' | 'medium' | 'high';
  }): Promise<SmartSanitizationResult> {
    // Step 1: Classify the content using AI-like analysis
    const classification = await this.classifyContent(input);
    
    // Step 2: Detect PHI (Protected Health Information)
    const phiMatches = this.detectPHI(input);
    
    // Step 3: Calculate threat score
    const threatScore = this.calculateThreatScore(input, classification);
    
    // Step 4: Apply intelligent sanitization based on classification
    const sanitized = this.applySanitization(input, classification, phiMatches, context);
    
    // Step 5: Generate recommendations
    const recommendations = this.generateRecommendations(classification, phiMatches, threatScore);

    return {
      sanitized,
      classification,
      appliedRules: this.getAppliedRules(classification, phiMatches),
      phiDetected: phiMatches,
      threatScore,
      recommendations
    };
  }

  /**
   * 🧠 Content Classification Engine
   * Uses pattern matching and medical context to classify content
   */
  private async classifyContent(input: string): Promise<ContentClassification> {
    const features = this.extractFeatures(input);
    let type: ContentClassification['type'] = 'general';
    let confidence = 0;
    let riskLevel: ContentClassification['riskLevel'] = 'low';
    const detectedElements: string[] = [];

    // Medical note detection
    if (features.medicalTermCount > 3 && features.hasStructuredFormat) {
      type = 'medical-note';
      confidence = Math.min(0.9, 0.6 + (features.medicalTermCount * 0.05));
      detectedElements.push('medical-terminology', 'clinical-structure');
    }

    // Patient data detection
    if (features.hasPersonalIdentifiers || features.hasDemographicInfo) {
      type = 'patient-data';
      confidence = Math.max(confidence, 0.8);
      riskLevel = 'high';
      detectedElements.push('personal-identifiers');
    }

    // PHI detection
    if (features.phiIndicators > 0) {
      type = 'phi-containing';
      confidence = 0.95;
      riskLevel = 'critical';
      detectedElements.push('protected-health-information');
    }

    // Sensitive data detection
    if (features.hasSensitiveKeywords) {
      if (type === 'general') type = 'sensitive';
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      detectedElements.push('sensitive-keywords');
    }

    return {
      type,
      confidence,
      detectedElements,
      riskLevel
    };
  }

  /**
   * 🔍 Advanced PHI Detection
   * Detects and catalogs Protected Health Information
   */
  private detectPHI(input: string): PHIMatch[] {
    const matches: PHIMatch[] = [];

    this.phiPatterns.forEach((pattern, type) => {
      const found = Array.from(input.matchAll(pattern));
      found.forEach(match => {
        const confidence = this.calculatePHIConfidence(type, match[0]);
        if (confidence > 0.7) { // Only high-confidence matches
          matches.push({
            type: type as PHIMatch['type'],
            value: match[0],
            redacted: this.generateRedaction(type, match[0]),
            position: match.index!,
            confidence
          });
        }
      });
    });

    return matches;
  }

  /**
   * 🛡️ Intelligent Sanitization Application
   * Applies different sanitization strategies based on content type
   */
  private applySanitization(
    input: string, 
    classification: ContentClassification, 
    phiMatches: PHIMatch[],
    context?: any
  ): string {
    let sanitized = input;

    // First, redact any PHI
    phiMatches.forEach(phi => {
      sanitized = sanitized.replace(phi.value, phi.redacted);
    });

    // Apply classification-specific sanitization
    switch (classification.type) {
      case 'medical-note':
        // Preserve medical formatting but sanitize dangerous content
        sanitized = this.sanitizeMedicalNote(sanitized);
        break;
        
      case 'patient-data':
        // Strict sanitization for patient data
        sanitized = sanitizeHtmlStrict(sanitized);
        break;
        
      case 'phi-containing':
        // Ultra-strict sanitization for PHI
        sanitized = this.sanitizePHIContent(sanitized);
        break;
        
      case 'sensitive':
        // Moderate sanitization preserving some formatting
        sanitized = sanitizeHtmlStrict(sanitized);
        break;
        
      default:
        // Standard sanitization for general content
        sanitized = sanitizeHtml(sanitized);
    }

    // Apply threat-specific sanitization
    if (classification.riskLevel === 'critical') {
      sanitized = this.applyCriticalSanitization(sanitized);
    }

    return sanitized;
  }

  /**
   * 🏥 Medical Note Sanitization
   * Preserves medical terminology while ensuring security
   */
  private sanitizeMedicalNote(input: string): string {
    // Use DOMPurify with medical-specific configuration
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'pre', 'code'
      ],
      ALLOWED_ATTR: ['class', 'id', 'title'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'a', 'img'],
      FORBID_ATTR: ['onclick', 'onerror', 'onload', 'href', 'src']
    });
  }

  /**
   * 🔒 PHI Content Sanitization
   * Ultra-strict sanitization for PHI-containing content
   */
  private sanitizePHIContent(input: string): string {
    // Strip all HTML and apply aggressive text sanitization
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // Additional PHI-specific cleaning
    sanitized = sanitized.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[REDACTED_SSN]');
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED_PHONE]');
    
    return sanitized;
  }

  /**
   * ⚠️ Critical Threat Sanitization
   * Applied when high-risk patterns are detected
   */
  private applyCriticalSanitization(input: string): string {
    // Remove all potentially dangerous patterns
    let sanitized = input;
    
    this.threatPatterns.forEach((pattern, threatType) => {
      sanitized = sanitized.replace(pattern, `[REMOVED_${threatType.toUpperCase()}]`);
    });

    return sanitized;
  }

  /**
   * 📊 Feature Extraction for Classification
   */
  private extractFeatures(input: string) {
    return {
      length: input.length,
      medicalTermCount: this.countMedicalTerms(input),
      hasStructuredFormat: /^(SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN|CHIEF COMPLAINT)/im.test(input),
      hasPersonalIdentifiers: /\b(patient|dob|ssn|mrn|insurance)\b/gi.test(input),
      hasDemographicInfo: /\b(male|female|age|years old|\d{1,2}\/\d{1,2}\/\d{4})\b/gi.test(input),
      phiIndicators: (input.match(/\b(\d{3}-?\d{2}-?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})\b/g) || []).length,
      hasSensitiveKeywords: /\b(confidential|private|restricted|diagnosis|treatment|medication)\b/gi.test(input),
      threatLevel: this.calculateBasicThreatLevel(input)
    };
  }

  /**
   * 🔢 Threat Score Calculation
   */
  private calculateThreatScore(input: string, classification: ContentClassification): number {
    let score = 0;

    // Base score from classification
    const baseScores = {
      'general': 10,
      'sensitive': 30,
      'patient-data': 50,
      'medical-note': 40,
      'phi-containing': 90
    };
    score += baseScores[classification.type];

    // Add points for detected threats
    this.threatPatterns.forEach((pattern) => {
      if (pattern.test(input)) score += 20;
    });

    // Add points for PHI
    const phiCount = (input.match(/\b\d{3}-?\d{2}-?\d{4}\b/g) || []).length;
    score += phiCount * 25;

    return Math.min(100, score);
  }

  /**
   * 💡 Recommendation Generation
   */
  private generateRecommendations(
    classification: ContentClassification,
    phiMatches: PHIMatch[],
    threatScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (phiMatches.length > 0) {
      recommendations.push(`🚨 ${phiMatches.length} PHI elements detected and redacted. Review HIPAA compliance.`);
    }

    if (threatScore > 70) {
      recommendations.push('⚠️ High threat score detected. Consider additional security review.');
    }

    if (classification.type === 'medical-note' && classification.confidence < 0.8) {
      recommendations.push('📝 Medical note classification uncertain. Verify medical terminology.');
    }

    if (classification.riskLevel === 'critical') {
      recommendations.push('🔴 Critical risk level. Immediate security review recommended.');
    }

    return recommendations;
  }

  /**
   * 🔧 Helper Methods
   */
  private initializePatterns(): void {
    // PHI Patterns
    this.phiPatterns.set('ssn', /\b\d{3}-?\d{2}-?\d{4}\b/g);
    this.phiPatterns.set('phone', /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g);
    this.phiPatterns.set('dob', /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/g);
    this.phiPatterns.set('mrn', /\b(MRN|MR#?)\s*:?\s*([A-Z0-9]{6,12})\b/gi);
    this.phiPatterns.set('email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);

    // Threat Patterns - More robust XSS detection
    this.threatPatterns.set('xss', /<script\b[^>]*>[\s\S]*?<\/script\s*[^>]*>/gi);
    this.threatPatterns.set('javascript_protocol', /javascript\s*:/gi);
    this.threatPatterns.set('event_handlers', /\bon\w+\s*=/gi);
    this.threatPatterns.set('sql_injection', /(\bUNION\b.*\bSELECT\b|\bDROP\s+TABLE\b)/gi);
    this.threatPatterns.set('command_injection', /(\||;|`|\$\(|\${)/g);
  }

  private loadMedicalTerms(): void {
    // Load common medical terms (in real implementation, this would come from a medical dictionary)
    const terms = [
      'diagnosis', 'prognosis', 'symptom', 'treatment', 'medication', 'prescription',
      'patient', 'hypertension', 'diabetes', 'infection', 'surgery', 'therapy',
      'blood pressure', 'heart rate', 'temperature', 'respiratory', 'cardiovascular',
      'neurological', 'gastrointestinal', 'dermatological', 'orthopedic', 'oncology'
    ];
    this.medicalTerms = new Set(terms);
  }

  private countMedicalTerms(input: string): number {
    const words = input.toLowerCase().split(/\s+/);
    return words.filter(word => this.medicalTerms.has(word)).length;
  }


  private calculatePHIConfidence(type: string, value: string): number {
    // Simple confidence calculation - in real implementation, this would be more sophisticated
    const patterns = {
      'ssn': /^\d{3}-?\d{2}-?\d{4}$/,
      'phone': /^\d{3}[-.]?\d{3}[-.]?\d{4}$/,
      'dob': /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
      'mrn': /^[A-Z0-9]{6,12}$/i,
      'email': /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/
    };
    
    const pattern = patterns[type as keyof typeof patterns];
    return pattern && pattern.test(value) ? 0.9 : 0.6;
  }

  private generateRedaction(type: string, value: string): string {
    const hash = btoa(value).substring(0, 6);
    return `[REDACTED_${type.toUpperCase()}_${hash}]`;
  }

  private calculateBasicThreatLevel(input: string): number {
    let level = 0;
    if (/<script/i.test(input)) level += 3;
    if (/javascript:/i.test(input)) level += 2;
    if (/on\w+\s*=/i.test(input)) level += 2;
    return level;
  }

  private getAppliedRules(classification: ContentClassification, phiMatches: PHIMatch[]): string[] {
    const rules = [`classification-${classification.type}`];
    if (phiMatches.length > 0) rules.push('phi-redaction');
    if (classification.riskLevel === 'critical') rules.push('critical-sanitization');
    return rules;
  }
}

// Export a singleton instance for easy use
export const smartSanitizer = new SmartSanitizationEngine();

/**
 * 🚀 Quick Smart Sanitization Function
 * Convenient wrapper for the most common use case
 */
export const smartSanitize = async (
  input: string, 
  context?: { 
    userRole?: 'doctor' | 'nurse' | 'admin' | 'patient'; 
    department?: string; 
    urgency?: 'low' | 'medium' | 'high';
  }
): Promise<SmartSanitizationResult> => {
  return smartSanitizer.smartSanitize(input, context);
};

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

  // ⚠️ SECURITY NOTE: For proper SQL injection prevention, use parameterized queries at the database level
  // This basic sanitization is just a supplementary measure and should NOT be relied upon for security
  
  // Remove dangerous SQL characters (basic client-side filtering only)
  const dangerousChars = /['";]|--|\*|\/\*|\*\//g;
  sanitized = sanitized.replace(dangerousChars, '');
  
  // Remove common SQL injection keywords (case insensitive) - supplementary protection only
  const sqlKeywords = /\b(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|SELECT)\s+/gi;
  sanitized = sanitized.replace(sqlKeywords, '');
  
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
    // WARNING: This function is for validation purposes only
    // For actual HTML sanitization, always use sanitizeHtml() which uses DOMPurify
    
    // Robust regex that properly handles script tags with various whitespace patterns:
    // - Matches <script> opening tags (case insensitive)
    // - Handles any attributes in opening tag
    // - Matches content between opening and closing tags
    // - Properly matches </script> closing tags with optional whitespace/attributes
    const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script\s*[^>]*>/gi;
    
    // Also check for incomplete script tags (potential XSS attempts)
    const incompleteScriptRegex = /<script\b[^>]*>(?![\s\S]*<\/script\s*[^>]*>)/gi;
    
    // Check for javascript: protocol URLs
    const javascriptProtocolRegex = /javascript\s*:/gi;
    
    // Check for event handlers
    const eventHandlerRegex = /\bon\w+\s*=/gi;
    
    return !scriptRegex.test(input) && 
           !incompleteScriptRegex.test(input) && 
           !javascriptProtocolRegex.test(input) && 
           !eventHandlerRegex.test(input);
  },
} as const;
