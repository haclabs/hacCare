/**
 * Direct Session Restoration Fix
 * 
 * This utility provides a more direct approach to ensuring authentication
 * sessions are properly restored after page refresh.
 */

import { supabase } from './supabase';

/**
 * Initialize session restoration immediately on app load
 * This runs before React components mount to ensure auth context is ready
 */
export const initializeAuthSession = async (): Promise<boolean> => {
  try {
    // First, let the client attempt to restore any persisted session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // If we have a refresh token error, clean up and start fresh
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('refresh_token_not_found')) {
        await supabase.auth.signOut();
      }
      
      return false;
    }
    
    if (session) {
      // Verify the session is actually valid by making a test call
      try {
        const { error: testError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', session.user.id)
          .limit(1);
          
        if (testError) {
          await supabase.auth.signOut();
          return false;
        }
        
        return true;
      } catch (validationError) {
        console.error('Session validation error:', validationError);
        await supabase.auth.signOut();
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Auth session initialization error:', error);
    return false;
  }
};

/**
 * Enhanced auth state listener that handles all edge cases
 */
export const setupAuthStateListener = () => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      switch (event) {
        case 'INITIAL_SESSION':
          // Initial session handled
          break;
          
        case 'SIGNED_IN':
          // User signed in
          break;
          
        case 'SIGNED_OUT':
          // User signed out
          break;
          
        case 'TOKEN_REFRESHED':
          // Token refreshed
          break;
          
        default:
          // Other auth events
          break;
      }
    }
  );
  
  return subscription;
};

/**
 * Force immediate session check and restoration
 * Use this if you suspect the session might not have been restored properly
 */
export const forceSessionCheck = async (): Promise<boolean> => {
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return false;
    }
    
    if (session) {
      // Test if we can actually use this session
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          await supabase.auth.signOut();
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error during force session check:', error);
    return false;
  }
};

/**
 * Initialize everything needed for proper auth persistence
 */
export const initializeAuthPersistence = async (): Promise<boolean> => {
  // Set up the auth state listener first
  const subscription = setupAuthStateListener();
  
  // Then attempt to restore/validate any existing session
  const sessionRestored = await initializeAuthSession();
  
  // Store the subscription so it can be cleaned up later if needed
  (window as any).authSubscription = subscription;
  
  return sessionRestored;
};
