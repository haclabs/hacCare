/**
 * Secure Session Management for Healthcare Applications
 * 
 * This module provides:
 * - Automatic session timeout
 * - Idle detection and logout
 * - Session validation
 * - HIPAA-compliant session handling
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from './secureLogger';

export interface SessionConfig {
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  warningBeforeLogoutMinutes: number;
  enableIdleDetection: boolean;
  enableSessionValidation: boolean;
}

export class SecureSessionManager {
  private config: SessionConfig;
  private sessionTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isWarningShown: boolean = false;
  private eventListeners: Array<() => void> = [];

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      sessionTimeoutMinutes: 30,
      idleTimeoutMinutes: 15,
      warningBeforeLogoutMinutes: 2,
      enableIdleDetection: true,
      enableSessionValidation: true,
      ...config
    };

    this.initializeSessionManagement();
  }

  /**
   * Initialize session management
   */
  private initializeSessionManagement(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Start session monitoring
    this.startSessionTimeout();
    
    if (this.config.enableIdleDetection) {
      this.startIdleDetection();
    }

    if (this.config.enableSessionValidation) {
      this.startSessionValidation();
    }

    secureLogger.info('Secure session management initialized', {
      sessionTimeout: this.config.sessionTimeoutMinutes,
      idleTimeout: this.config.idleTimeoutMinutes
    });
  }

  /**
   * Start session timeout timer
   */
  private startSessionTimeout(): void {
    this.clearTimer(this.sessionTimer);
    
    const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;
    
    this.sessionTimer = setTimeout(() => {
      secureLogger.security('Session timeout reached - forcing logout');
      this.forceLogout('Session timeout');
    }, timeoutMs);
  }

  /**
   * Start idle detection
   */
  private startIdleDetection(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetIdleTimer = () => {
      this.lastActivity = Date.now();
      this.clearTimer(this.idleTimer);
      this.clearTimer(this.warningTimer);
      this.isWarningShown = false;
      
      const idleTimeoutMs = this.config.idleTimeoutMinutes * 60 * 1000;
      const warningTimeoutMs = (this.config.idleTimeoutMinutes - this.config.warningBeforeLogoutMinutes) * 60 * 1000;
      
      // Set warning timer
      this.warningTimer = setTimeout(() => {
        this.showIdleWarning();
      }, warningTimeoutMs);
      
      // Set idle logout timer
      this.idleTimer = setTimeout(() => {
        secureLogger.security('Idle timeout reached - forcing logout');
        this.forceLogout('Idle timeout');
      }, idleTimeoutMs);
    };

    // Add event listeners
    events.forEach(event => {
      const listener = resetIdleTimer;
      document.addEventListener(event, listener, true);
      this.eventListeners.push(() => {
        document.removeEventListener(event, listener, true);
      });
    });

    // Initialize timers
    resetIdleTimer();
  }

  /**
   * Show idle warning to user
   */
  private showIdleWarning(): void {
    if (this.isWarningShown) return;
    
    this.isWarningShown = true;
    const remainingMinutes = this.config.warningBeforeLogoutMinutes;
    
    const warningMessage = `Your session will expire in ${remainingMinutes} minute(s) due to inactivity. Click anywhere to continue your session.`;
    
    // Create warning modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        text-align: center;
      ">
        <h3 style="color: #dc2626; margin-top: 0;">⚠️ Session Expiring</h3>
        <p style="color: #374151; margin: 1rem 0;">${warningMessage}</p>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #2563eb;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        ">Continue Session</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove modal if user clicks anywhere
    modal.addEventListener('click', () => {
      modal.remove();
      this.isWarningShown = false;
    });
    
    secureLogger.audit('Idle warning shown to user', 'session');
  }

  /**
   * Start periodic session validation
   */
  private startSessionValidation(): void {
    // Validate session every 5 minutes
    setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          secureLogger.security('Invalid session detected - forcing logout');
          this.forceLogout('Invalid session');
          return;
        }

        // Check if session is expired
        if (session.expires_at && session.expires_at * 1000 < Date.now()) {
          secureLogger.security('Expired session detected - forcing logout');
          this.forceLogout('Expired session');
          return;
        }

        // Validate user still exists and is active
        const { data: user, error } = await supabase.auth.getUser();
        
        if (error || !user.user) {
          secureLogger.security('User validation failed - forcing logout', { error: error?.message });
          this.forceLogout('User validation failed');
          return;
        }

      } catch (error) {
        secureLogger.error('Session validation error', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Force user logout
   */
  private async forceLogout(reason: string): Promise<void> {
    try {
      // Clean up timers
      this.cleanup();
      
      // Log the logout event
      secureLogger.audit('Forced logout', 'session', { reason });
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any local storage (if used)
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Show logout message
      alert(`You have been logged out due to: ${reason}`);
      
      // Redirect to login page
      window.location.href = '/login';
      
    } catch (error) {
      secureLogger.error('Error during forced logout', error);
      // Still redirect even if logout failed
      window.location.href = '/login';
    }
  }

  /**
   * Extend current session
   */
  public extendSession(): void {
    secureLogger.audit('Session extended by user', 'session');
    
    // Restart session timeout
    this.startSessionTimeout();
    
    // Reset idle detection
    this.lastActivity = Date.now();
  }

  /**
   * Manually logout user
   */
  public async logout(): Promise<void> {
    secureLogger.audit('Manual logout initiated', 'session');
    await this.forceLogout('Manual logout');
  }

  /**
   * Get session status
   */
  public getSessionStatus(): {
    isActive: boolean;
    timeUntilExpiry: number;
    lastActivity: number;
  } {
    const sessionTimeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;
    const timeUntilExpiry = sessionTimeoutMs - (Date.now() - this.lastActivity);
    
    return {
      isActive: timeUntilExpiry > 0,
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
      lastActivity: this.lastActivity
    };
  }

  /**
   * Clean up timers and event listeners
   */
  private cleanup(): void {
    this.clearTimer(this.sessionTimer);
    this.clearTimer(this.idleTimer);
    this.clearTimer(this.warningTimer);
    
    // Remove event listeners
    this.eventListeners.forEach(removeListener => removeListener());
    this.eventListeners = [];
  }

  private clearTimer(timer: NodeJS.Timeout | null): void {
    if (timer) {
      clearTimeout(timer);
    }
  }

  /**
   * Destroy session manager
   */
  public destroy(): void {
    this.cleanup();
  }
}

// Default configuration for healthcare applications
export const defaultSessionConfig: SessionConfig = {
  sessionTimeoutMinutes: 30,
  idleTimeoutMinutes: 15,
  warningBeforeLogoutMinutes: 2,
  enableIdleDetection: true,
  enableSessionValidation: true
};

// Singleton instance
export const sessionManager = new SecureSessionManager(defaultSessionConfig);
