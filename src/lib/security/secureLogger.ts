/**
 * Secure Logging Service for Healthcare Applications
 * 
 * This service provides HIPAA-compliant logging that:
 * - Redacts sensitive patient information
 * - Controls log levels based on environment
 * - Provides structured logging for audit trails
 * - Sanitizes data before logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type SensitiveFields = 'patient_id' | 'medication_id' | 'administered_by' | 'notes' | 'user_id' | 'email';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  operation?: string;
}

class SecureLogger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: LogLevel = import.meta.env.PROD ? 'warn' : 'debug';

  // List of fields that should be redacted for privacy
  private sensitiveFields: SensitiveFields[] = [
    'patient_id', 
    'medication_id', 
    'administered_by', 
    'notes', 
    'user_id', 
    'email'
  ];

  /**
   * Sanitize object by redacting sensitive fields
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.includes(key as SensitiveFields)) {
        // Redact sensitive fields but preserve data type info
        if (typeof value === 'string' && value.length > 0) {
          sanitized[key] = `[REDACTED_${value.length}_chars]`;
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel, 
    message: string, 
    data?: any, 
    operation?: string
  ): LogEntry {
    return {
      level,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      timestamp: new Date().toISOString(),
      operation,
      // Add session info for audit trails (implement as needed)
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId()
    };
  }

  private getSessionId(): string | undefined {
    // Implement session tracking
    return undefined;
  }

  private getCurrentUserId(): string | undefined {
    // Get current user ID without logging sensitive data
    return undefined;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, data?: any, operation?: string): void {
    if (!this.isDevelopment || this.logLevel !== 'debug') return;
    
    const entry = this.createLogEntry('debug', message, data, operation);
    console.log(`🔍 [DEBUG] ${entry.message}`, entry.data ? entry.data : '');
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any, operation?: string): void {
    const entry = this.createLogEntry('info', message, data, operation);
    console.log(`ℹ️ [INFO] ${entry.message}`, entry.data ? entry.data : '');
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any, operation?: string): void {
    const entry = this.createLogEntry('warn', message, data, operation);
    console.warn(`⚠️ [WARN] ${entry.message}`, entry.data ? entry.data : '');
  }

  /**
   * Log errors
   */
  error(message: string, error?: any, operation?: string): void {
    const entry = this.createLogEntry('error', message, error, operation);
    console.error(`❌ [ERROR] ${entry.message}`, entry.data ? entry.data : '');
  }

  /**
   * Log security events (always logged regardless of level)
   */
  security(message: string, data?: any, operation?: string): void {
    const entry = this.createLogEntry('error', `SECURITY: ${message}`, data, operation);
    console.error(`🔒 [SECURITY] ${entry.message}`, entry.data ? entry.data : '');
    
    // In production, you would send this to your security monitoring system
    if (import.meta.env.PROD) {
      this.sendToSecurityMonitoring(entry);
    }
  }

  /**
   * Log audit events for compliance
   */
  audit(action: string, resource: string, data?: any): void {
    const entry = this.createLogEntry('info', `AUDIT: ${action} on ${resource}`, data, action);
    console.log(`📋 [AUDIT] ${entry.message}`, entry.data ? entry.data : '');
    
    // In production, send to audit log system
    if (import.meta.env.PROD) {
      this.sendToAuditSystem(entry);
    }
  }

  private sendToSecurityMonitoring(_entry: LogEntry): void {
    // Implement integration with security monitoring service
    // e.g., Datadog, Splunk, etc.
  }

  private sendToAuditSystem(_entry: LogEntry): void {
    // Implement integration with audit logging system
    // Required for HIPAA compliance
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger();

// Convenience exports
export const { debug, info, warn, error, security, audit } = secureLogger;
