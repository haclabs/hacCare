/**
 * Security Headers Configuration for Healthcare Applications
 * 
 * This module implements comprehensive security headers including:
 * - Content Security Policy (CSP)
 * - HTTP Security Headers
 * - HIPAA-compliant security measures
 */

export interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXFrameOptions: boolean;
  enableXContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
}

export class SecurityHeaders {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableCSP: true,
      enableHSTS: true,
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      ...config
    };
  }

  /**
   * Generate Content Security Policy for healthcare app
   */
  generateCSP(): string {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://*.supabase.co blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://ipapi.co https://api64.ipify.org",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];

    // Add report-uri in production for CSP violation monitoring
    if (import.meta.env.PROD) {
      cspDirectives.push("report-uri /api/csp-violation-report");
    }

    return cspDirectives.join('; ');
  }

  /**
   * Apply security headers to the application
   */
  applySecurityHeaders(): void {
    // Only apply in browser environment
    if (typeof window === 'undefined') return;

    // Content Security Policy
    if (this.config.enableCSP) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = this.generateCSP();
      document.head.appendChild(meta);
    }

    // X-Frame-Options (prevent clickjacking)
    if (this.config.enableXFrameOptions) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Frame-Options';
      meta.content = 'DENY';
      document.head.appendChild(meta);
    }

    // X-Content-Type-Options (prevent MIME sniffing)
    if (this.config.enableXContentTypeOptions) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Content-Type-Options';
      meta.content = 'nosniff';
      document.head.appendChild(meta);
    }

    // Referrer Policy (limit referrer information)
    if (this.config.enableReferrerPolicy) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(meta);
    }

    // Permissions Policy (restrict browser features)
    if (this.config.enablePermissionsPolicy) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Permissions-Policy';
      meta.content = [
        'camera=(),',
        'microphone=(),',
        'geolocation=(),',
        'payment=(),',
        'usb=(),',
        'interest-cohort=()' // Disable FLoC
      ].join(' ');
      document.head.appendChild(meta);
    }

    console.log('🔒 Security headers applied successfully');
  }

  /**
   * Validate current page security
   */
  validateSecurity(): { isSecure: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if HTTPS is enabled (required for healthcare)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('Application must use HTTPS in production');
    }

    // Check for mixed content
    if (location.protocol === 'https:') {
      const insecureResources = document.querySelectorAll('[src^="http:"], [href^="http:"]');
      if (insecureResources.length > 0) {
        issues.push('Mixed content detected - some resources loaded over HTTP');
      }
    }

    // Check for CSP header
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta && this.config.enableCSP) {
      issues.push('Content Security Policy not found');
    }

    // Check for X-Frame-Options
    const frameOptions = document.querySelector('meta[http-equiv="X-Frame-Options"]');
    if (!frameOptions && this.config.enableXFrameOptions) {
      issues.push('X-Frame-Options header not found');
    }

    return {
      isSecure: issues.length === 0,
      issues
    };
  }

  /**
   * Monitor for security violations
   */
  monitorSecurityViolations(): void {
    // CSP Violation Reporting
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error('🚨 CSP Violation:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        lineNumber: event.lineNumber,
        sourceFile: event.sourceFile
      });

      // In production, send to monitoring service
      if (import.meta.env.PROD) {
        this.reportSecurityViolation({
          type: 'csp_violation',
          directive: event.violatedDirective,
          uri: event.blockedURI,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor for suspicious DOM manipulation
    if (window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                
                // Check for suspicious script injection
                if (element.tagName === 'SCRIPT') {
                  const scriptElement = element as HTMLScriptElement;
                  console.warn('🚨 Script element added to DOM:', scriptElement.src || element.textContent?.substring(0, 100));
                }
                
                // Check for suspicious iframe injection
                if (element.tagName === 'IFRAME') {
                  const iframeElement = element as HTMLIFrameElement;
                  console.warn('🚨 Iframe element added to DOM:', iframeElement.src);
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  private reportSecurityViolation(violation: any): void {
    // Send to your security monitoring service
    fetch('/api/security-violation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(violation)
    }).catch(err => {
      console.error('Failed to report security violation:', err);
    });
  }
}

// Default security configuration for healthcare applications
export const defaultSecurityConfig: SecurityConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true
};

// Initialize security headers
export const securityHeaders = new SecurityHeaders(defaultSecurityConfig);
