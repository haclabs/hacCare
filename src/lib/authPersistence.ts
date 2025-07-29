/**
 * Enhanced Authentication Session Persistence Fix
 * 
 * This utility provides functions to ensure Supabase sessions persist correctly
 * and handles common authentication issues in React applications.
 */

import { supabase } from './supabase';

/**
 * Force session restoration from localStorage
 * This is a workaround for cases where Supabase doesn't automatically
 * restore sessions on page refresh.
 */
export const forceSessionRestore = async (): Promise<boolean> => {
  try {
    // Check if we have any auth data in localStorage
    const authKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));

    if (authKeys.length === 0) {
      return false;
    }

    // Try to get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // If we get a refresh token error, try to clear and restart
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('refresh_token_not_found')) {
        await supabase.auth.signOut();
        return false;
      }
      
      return false;
    }

    if (session?.user) {
      return true;
    } else {
      return false;
    }

  } catch (error) {
    console.error('Error during forced session restore:', error);
    return false;
  }
};

/**
 * Enhanced session check with retry logic
 * Attempts to restore session multiple times with backoff
 */
export const checkSessionWithRetry = async (maxRetries = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s delays
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return false;
      }

      if (session?.user) {
        return true;
      } else {
        if (attempt < maxRetries) {
          // Try to force restore
          const restored = await forceSessionRestore();
          if (restored) return true;
          
          const delay = attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Final session check failed:', error);
      }
    }
  }

  return false;
};

/**
 * Initialize session persistence
 * Call this early in your app initialization to ensure sessions persist correctly
 */
export const initializeSessionPersistence = async (): Promise<void> => {
  try {
    // Verify Supabase client configuration
    try {
      await supabase.auth.getSession();
    } catch (configError) {
      console.error('Supabase client configuration issue:', configError);
      return;
    }

    // Check for existing session
    await checkSessionWithRetry();

    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Session established
      } else if (event === 'SIGNED_OUT') {
        // Session ended
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed
      }
    });

  } catch (error) {
    console.error('Error initializing session persistence:', error);
  }
};

/**
 * Force logout and clear all auth data
 * Use this if the session gets into a bad state
 */
export const forceLogout = async (): Promise<void> => {
  try {
    // Sign out via Supabase
    await supabase.auth.signOut();
    
    // Clear any lingering auth data from localStorage
    const authKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
  } catch (error) {
    console.error('Error during force logout:', error);
  }
};
