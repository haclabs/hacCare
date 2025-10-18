/**
 * Input Validation and Sanitization for Healthcare Applications
 * 
 * This module provides comprehensive input validation to prevent:
 * - SQL injection attacks
 * - XSS attacks
 * - Data integrity issues
 * - Invalid healthcare data entry
 */

import DOMPurify from 'dompurify';
import { secureLogger } from './secureLogger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export class InputValidator {
  
  /**
   * Validate and sanitize patient ID
   */
  static validatePatientId(patientId: string): ValidationResult {
    const errors: string[] = [];
    
    if (!patientId || typeof patientId !== 'string') {
      errors.push('Patient ID is required and must be a string');
      return { isValid: false, errors };
    }
    
    // Remove any potential script tags or HTML
    const sanitized = DOMPurify.sanitize(patientId.trim());
    
    // Validate format (adjust regex based on your ID format)
    const patientIdRegex = /^[A-Z]{2}\d{5}$/; // e.g., PT12345
    if (!patientIdRegex.test(sanitized)) {
      errors.push('Patient ID must be in format: PT12345');
      secureLogger.security('Invalid patient ID format attempted', { attempted: '[REDACTED]' });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  /**
   * Validate medication name
   */
  static validateMedicationName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Medication name is required');
      return { isValid: false, errors };
    }
    
    const sanitized = DOMPurify.sanitize(name.trim());
    
    // Validate length
    if (sanitized.length < 2 || sanitized.length > 100) {
      errors.push('Medication name must be between 2 and 100 characters');
    }
    
    // Only allow letters, numbers, spaces, hyphens, and parentheses
    const medicationRegex = /^[a-zA-Z0-9\s\-\(\)\.]+$/;
    if (!medicationRegex.test(sanitized)) {
      errors.push('Medication name contains invalid characters');
      secureLogger.security('Invalid characters in medication name', { name: '[REDACTED]' });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  /**
   * Validate dosage
   */
  static validateDosage(dosage: string): ValidationResult {
    const errors: string[] = [];
    
    if (!dosage || typeof dosage !== 'string') {
      errors.push('Dosage is required');
      return { isValid: false, errors };
    }
    
    const sanitized = DOMPurify.sanitize(dosage.trim());
    
    // Validate dosage format (number followed by unit)
    const dosageRegex = /^\d+(\.\d+)?\s*(mg|mcg|g|mL|L|units?|IU|tablets?|capsules?)$/i;
    if (!dosageRegex.test(sanitized)) {
      errors.push('Dosage must be in format: "10 mg", "0.5 mL", etc.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  /**
   * Validate medication frequency
   */
  static validateFrequency(frequency: string): ValidationResult {
    const errors: string[] = [];
    
    const validFrequencies = [
      'Once daily',
      'Twice daily',
      'Three times daily',
      'Every 4 hours',
      'Every 6 hours',
      'Every 8 hours',
      'Every 12 hours',
      'As needed (PRN)'
    ];
    
    if (!validFrequencies.includes(frequency)) {
      errors.push('Invalid frequency selected');
      secureLogger.security('Invalid frequency attempted', { frequency: '[REDACTED]' });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: frequency
    };
  }

  /**
   * Validate administration notes
   */
  static validateNotes(notes: string): ValidationResult {
    const errors: string[] = [];
    
    if (!notes) {
      return { isValid: true, errors: [], sanitizedValue: '' };
    }
    
    if (typeof notes !== 'string') {
      errors.push('Notes must be text');
      return { isValid: false, errors };
    }
    
    // Sanitize HTML and scripts
    const sanitized = DOMPurify.sanitize(notes.trim());
    
    // Check length
    if (sanitized.length > 1000) {
      errors.push('Notes cannot exceed 1000 characters');
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(notes)) {
        errors.push('Notes contain invalid content');
        secureLogger.security('Suspicious pattern detected in notes', { pattern: pattern.toString() });
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  /**
   * Validate user ID (UUID format)
   */
  static validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];
    
    if (!userId || typeof userId !== 'string') {
      errors.push('User ID is required');
      return { isValid: false, errors };
    }
    
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      errors.push('Invalid user ID format');
      secureLogger.security('Invalid user ID format attempted');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: userId
    };
  }

  /**
   * Validate timestamp
   */
  static validateTimestamp(timestamp: string): ValidationResult {
    const errors: string[] = [];
    
    if (!timestamp || typeof timestamp !== 'string') {
      errors.push('Timestamp is required');
      return { isValid: false, errors };
    }
    
    // Try to parse as ISO date
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      errors.push('Invalid timestamp format');
      return { isValid: false, errors };
    }
    
    // Check if timestamp is reasonable (not too far in past or future)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);
    
    if (date < oneDayAgo || date > oneHourAhead) {
      errors.push('Timestamp must be within the last 24 hours or up to 1 hour in the future');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: date.toISOString()
    };
  }

  /**
   * Comprehensive validation for medication administration
   */
  static validateMedicationAdministration(data: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};
    
    // Validate each field
    const patientIdResult = this.validatePatientId(data.patient_id);
    if (!patientIdResult.isValid) {
      errors.push(...patientIdResult.errors);
    } else {
      sanitizedData.patient_id = patientIdResult.sanitizedValue;
    }
    
    const medicationIdResult = this.validatePatientId(data.medication_id); // Same format as patient ID
    if (!medicationIdResult.isValid) {
      errors.push(...medicationIdResult.errors.map(e => e.replace('Patient', 'Medication')));
    } else {
      sanitizedData.medication_id = medicationIdResult.sanitizedValue;
    }
    
    if (data.administered_by) {
      const nameResult = this.validateMedicationName(data.administered_by); // Reuse name validation
      if (!nameResult.isValid) {
        errors.push('Invalid administrator name');
      } else {
        sanitizedData.administered_by = nameResult.sanitizedValue;
      }
    }
    
    if (data.timestamp) {
      const timestampResult = this.validateTimestamp(data.timestamp);
      if (!timestampResult.isValid) {
        errors.push(...timestampResult.errors);
      } else {
        sanitizedData.timestamp = timestampResult.sanitizedValue;
      }
    }
    
    if (data.notes) {
      const notesResult = this.validateNotes(data.notes);
      if (!notesResult.isValid) {
        errors.push(...notesResult.errors);
      } else {
        sanitizedData.notes = notesResult.sanitizedValue;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitizedData
    };
  }
}

// Convenience exports
export const {
  validatePatientId,
  validateMedicationName,
  validateDosage,
  validateFrequency,
  validateNotes,
  validateUserId,
  validateTimestamp,
  validateMedicationAdministration
} = InputValidator;
