/**
 * Browser-Specific Session Restoration
 * 
 * This module provides browser-specific session restoration that should work
 * more reliably than the previous approach.
 */

import { supabase } from './supabase';

/**
 * Initialize session restoration with browser-specific logic
 */
export const initializeBrowserAuth = async (): Promise<void> => {
  // Check if we have any auth data in localStorage
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') && key.includes('auth')
  );

  try {
    // Force Supabase to check for stored sessions
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // If refresh token is invalid, clear it
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('refresh_token_not_found')) {
        authKeys.forEach(key => localStorage.removeItem(key));
        await supabase.auth.signOut();
      }
      return;
    }

    if (session) {
      // Validate the session by making a test query
      const { error: testError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', session.user.id)
        .limit(1);
      
      if (testError) {
        await supabase.auth.signOut();
      } else {
        // Dispatch a custom event to notify the app that auth is ready
        window.dispatchEvent(new CustomEvent('authSessionRestored', {
          detail: { user: session.user }
        }));
      }
    }
    
  } catch (error) {
    console.error('Browser auth initialization error:', error);
  }
};

/**
 * Set up auth state monitoring specifically for browser environment
 */
export const setupBrowserAuthMonitoring = (): void => {
  // Monitor auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // User signed in
    } else if (event === 'SIGNED_OUT') {
      // User signed out
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Token refreshed
    }
  });
  
  // Monitor storage changes (for cross-tab auth)
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.includes('supabase') && e.key.includes('auth')) {
      // Trigger a session check
      setTimeout(() => {
        initializeBrowserAuth();
      }, 100);
    }
  });
};

/**
 * Manual session refresh for troubleshooting
 */
export const manualSessionRefresh = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      return false;
    }
    
    if (data.session) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error during manual refresh:', error);
    return false;
  }
};

/**
 * Check if we're in a browser environment and initialize accordingly
 */
export const initializeAuth = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Set up monitoring first
  setupBrowserAuthMonitoring();
  
  // Then attempt session restoration
  await initializeBrowserAuth();
};
