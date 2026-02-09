import { supabase } from '../../lib/api/supabase';

/**
 * SYSTEM LOGGING SERVICE
 * 
 * Comprehensive logging system for super admin monitoring
 * Captures errors, user actions, navigation, and system events
 * 
 * Usage:
 *   systemLogger.error('Failed to load patient', error, { patientId: '123' });
 *   systemLogger.action('medication_administered', { medicationId: '456' });
 *   systemLogger.navigation('/app/patient/123');
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';
export type LogType = 
  | 'error' 
  | 'action' 
  | 'navigation' 
  | 'api_call' 
  | 'auth' 
  | 'permission_denied'
  | 'validation_error'
  | 'performance'
  | 'system_event';

export interface SystemLogEntry {
  log_level: LogLevel;
  log_type: LogType;
  component?: string;
  action?: string;
  error_message?: string;
  error_stack?: string;
  request_data?: any;
  response_data?: any;
  current_url?: string;
  previous_url?: string;
  metadata?: any;
}

class SystemLogger {
  private isDevelopment = import.meta.env.DEV;
  private user_id?: string;
  private tenant_id?: string;
  private session_id: string;

  constructor() {
    this.session_id = this.generateSessionId();
    this.initializeUser();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Initialize user context
   */
  private async initializeUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.user_id = user?.id;

      // Get tenant from tenant_users table (not user_profiles)
      if (user) {
        const { data: tenantUser, error } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.warn('System logger: Could not fetch user tenant_id:', error.message);
          return;
        }
        
        this.tenant_id = tenantUser?.tenant_id;
      }
    } catch (error) {
      console.error('Failed to initialize system logger user context:', error);
    }
  }

  /**
   * Generate unique session ID using cryptographically secure random values
   */
  private generateSessionId(): string {
    // Use crypto.randomUUID() for cryptographically secure session IDs
    return `${Date.now()}-${crypto.randomUUID()}`;
  }

  /**
   * Get browser information
   */
  private getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
      version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return { browser, version, os };
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        'Unhandled Promise Rejection',
        event.reason,
        {
          promise: event.promise,
          component: 'GlobalErrorHandler'
        }
      );
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.error(
        'Global Error',
        new Error(event.message),
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          component: 'GlobalErrorHandler'
        }
      );
    });
  }

  /**
   * Write log entry to database
   */
  private async writeLog(entry: SystemLogEntry) {
    try {
      // Always log to console in development
      if (this.isDevelopment) {
        const emoji = {
          debug: '🔍',
          info: 'ℹ️',
          warn: '⚠️',
          error: '❌',
          security: '🔒'
        }[entry.log_level];

        console.log(`${emoji} [${entry.log_type}]`, entry.action || entry.error_message, entry.metadata);
      }

      // Write to database
      const { error } = await supabase
        .from('system_logs')
        .insert({
          ...entry,
          user_id: this.user_id,
          tenant_id: this.tenant_id,
          session_id: this.session_id,
          user_agent: navigator.userAgent,
          browser_info: this.getBrowserInfo(),
          current_url: window.location.href,
          previous_url: document.referrer,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to write system log:', error);
      }
    } catch (error) {
      console.error('System logger error:', error);
    }
  }

  /**
   * Log an error
   */
  error(message: string, error?: any, metadata?: any) {
    this.writeLog({
      log_level: 'error',
      log_type: 'error',
      error_message: message,
      error_stack: error?.stack || (error instanceof Error ? error.toString() : JSON.stringify(error)),
      component: metadata?.component,
      action: metadata?.action,
      metadata: {
        ...metadata,
        error_name: error?.name,
        error_code: error?.code,
      },
      request_data: metadata?.request,
      response_data: metadata?.response
    });
  }

  /**
   * Log a user action
   */
  action(action: string, metadata?: any) {
    this.writeLog({
      log_level: 'info',
      log_type: 'action',
      action,
      component: metadata?.component,
      metadata,
      request_data: metadata?.data
    });
  }

  /**
   * Log navigation
   */
  navigation(to: string, from?: string) {
    this.writeLog({
      log_level: 'debug',
      log_type: 'navigation',
      action: 'navigate',
      current_url: to,
      previous_url: from,
    });
  }

  /**
   * Log API call
   */
  apiCall(endpoint: string, method: string, request?: any, response?: any, error?: any) {
    this.writeLog({
      log_level: error ? 'error' : 'debug',
      log_type: 'api_call',
      action: `${method} ${endpoint}`,
      error_message: error?.message,
      error_stack: error?.stack,
      request_data: request,
      response_data: response,
      metadata: {
        endpoint,
        method,
        status: response?.status
      }
    });
  }

  /**
   * Log authentication events
   */
  auth(event: string, metadata?: any) {
    this.writeLog({
      log_level: 'info',
      log_type: 'auth',
      action: event,
      metadata
    });
  }

  /**
   * Log permission denied
   */
  permissionDenied(resource: string, action: string, metadata?: any) {
    this.writeLog({
      log_level: 'warn',
      log_type: 'permission_denied',
      action: `${action} on ${resource}`,
      metadata
    });
  }

  /**
   * Log validation errors
   */
  validationError(field: string, message: string, metadata?: any) {
    this.writeLog({
      log_level: 'warn',
      log_type: 'validation_error',
      action: `validation_failed_${field}`,
      error_message: message,
      metadata
    });
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, duration: number, metadata?: any) {
    this.writeLog({
      log_level: 'info',
      log_type: 'performance',
      action: metric,
      metadata: {
        ...metadata,
        duration_ms: duration
      }
    });
  }

  /**
   * Log security events
   */
  security(event: string, metadata?: any) {
    this.writeLog({
      log_level: 'security',
      log_type: 'auth',
      action: event,
      metadata
    });
  }

  /**
   * Update user context (call after login/tenant switch)
   */
  async updateContext() {
    await this.initializeUser();
  }
}

// Export singleton instance
export const systemLogger = new SystemLogger();
