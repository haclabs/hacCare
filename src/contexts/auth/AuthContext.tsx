import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured, checkDatabaseHealth } from '../../lib/supabase';
import { parseAuthError } from '../../utils/authErrorParser';

/**
 * Authentication Context Interface
 * Defines the shape of the authentication context that will be provided to components
 */
interface AuthContextType {
  user: User | null;                                    // Current authenticated user from Supabase
  profile: UserProfile | null;                         // User profile data from our database
  loading: boolean;                                     // Loading state for auth operations
  isOffline: boolean;                                   // Offline state indicator
  signIn: (email: string, password: string) => Promise<{ error: any }>; // Sign in function
  signOut: () => Promise<void>;                        // Sign out function
  hasRole: (roles: string | string[]) => boolean;     // Role-based access control helper
  createProfile: () => Promise<void>;                 // Create user profile function
}

/**
 * Authentication Context
 * React context for managing authentication state throughout the application
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to access authentication context
 * Throws an error if used outside of AuthProvider
 * 
 * @returns {AuthContextType} Authentication context value
 * @throws {Error} If used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Manages authentication state and provides auth functions to child components
 * 
 * Features:
 * - Automatic session restoration on app load
 * - Real-time auth state synchronization
 * - User profile management
 * - Role-based access control
 * - Comprehensive error handling
 * - Network timeout protection
 * - NO localStorage usage - all data managed by Supabase
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state management - all handled by Supabase, no localStorage
  const [user, setUser] = useState<User | null>(null);           // Supabase user object
  const [profile, setProfile] = useState<UserProfile | null>(null); // User profile from database
  const [loading, setLoading] = useState(true);                 // Overall loading state
  const [profileLoading, setProfileLoading] = useState(false);  // Profile-specific loading state
  const [isOffline, setIsOffline] = useState(false);            // Offline state indicator

  /**
   * Initialize authentication on component mount
   * Handles session restoration, auth state changes, and cleanup
   * Uses only Supabase session management - no localStorage access
   */
  useEffect(() => {
    let mounted = true;        // Flag to prevent state updates after unmount
    let timeoutId: NodeJS.Timeout; // Timeout for preventing infinite loading

    /**
     * Initialize authentication system
     * - Restores existing session if available (via Supabase, not localStorage)
     * - Fetches user profile data
     * - Sets up auth state listeners
     * - Handles various error conditions gracefully
     */
    const initializeAuth = async () => {
      try {
        console.log('🔄 Starting auth initialization...');
        
        // Skip initialization if Supabase is not configured
        if (!isSupabaseConfigured) {
          console.log('⚠️ Supabase not configured, using mock data mode');
          if (mounted) {
            setLoading(false);
            setIsOffline(true);
          }
          return;
        }

        // Set timeout to prevent infinite loading (15 seconds)
        timeoutId = setTimeout(() => {
          console.log('⏰ Auth initialization timeout reached');
          if (mounted) {
            setLoading(false);
          }
        }, 15000);

        console.log('🔍 Getting initial session from Supabase...');
        
        // Create abort controller for timeout handling
        const controller = new AbortController();
        const sessionTimeoutId = setTimeout(() => controller.abort(), 10000);
        
        // Attempt to get current session with timeout protection
        // This uses Supabase's internal session management, not localStorage
        const sessionPromise = supabase.auth.getSession();
        
        let sessionResult;
        try {
          sessionResult = await Promise.race([
            sessionPromise,
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), 10000)
            )
          ]);
          clearTimeout(sessionTimeoutId);
        } catch (timeoutError) {
          clearTimeout(sessionTimeoutId);
          controller.abort();
          throw timeoutError;
        }
        
        const { data: { session }, error } = sessionResult;
        
        // Clear timeout since we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Handle session retrieval errors
        if (error) {
          console.error('❌ Error getting session:', error);
          
          // Handle refresh token errors specifically
          // These occur when stored tokens are invalid or expired
          if (error.message?.includes('Invalid Refresh Token') || 
              error.message?.includes('Refresh Token Not Found') ||
              error.message?.includes('refresh_token_not_found')) {
            console.log('🔄 Invalid refresh token detected, clearing session...');
            await signOut(); // Clear invalid session data via Supabase
          }
          
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        console.log('✅ Session result:', session?.user?.email || 'No session');

        // Process successful session
        if (mounted) {
          if (session?.user) {
            console.log('👤 User found, fetching profile...');
            setUser(session.user);
            
            // Fetch user profile and wait for completion
            // This prevents UI flash between user existing and profile loading
            try {
              await fetchUserProfile(session.user.id);
            } catch (error) {
              console.error('Profile fetch failed during init:', error);
              // Don't fail entire auth process if profile fetch fails
            }
            
            if (mounted) {
              setLoading(false);
            }
          } else {
            console.log('👤 No user, stopping loading');
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (error: any) {
        console.error('💥 Error in initializeAuth:', error);
        
        // Handle specific error types
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('timeout') ||
            error.message?.includes('Supabase not configured')) {
          console.error('🌐 Network connectivity issue or Supabase not configured during auth initialization');
          console.error('💡 Falling back to mock data mode');
        }
        
        // Handle refresh token errors in catch block as well
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Refresh Token Not Found') ||
            error.message?.includes('refresh_token_not_found')) {
          console.log('🔄 Invalid refresh token detected in catch, clearing session...');
          await signOut();
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Start initialization
    initializeAuth();

    /**
     * Set up auth state change listener
     * Responds to login, logout, and token refresh events
     * Uses Supabase's built-in auth state management
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
        
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Handle auth state changes
        if (session?.user) {
          setUser(session.user);
          // Fetch profile for auth state changes (non-blocking)
          fetchUserProfile(session.user.id).catch(error => {
            console.error('Profile fetch failed on auth change:', error);
          });
        } else {
          setUser(null);
          setProfile(null);
        }
        
        // Always stop loading for auth state changes
        setLoading(false);
      }
    );

    /**
     * Cleanup function
     * Prevents memory leaks and state updates after unmount
     */
    return () => {
      console.log('🧹 Cleaning up auth context');
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch user profile from database with enhanced error handling
   * Retrieves additional user information beyond basic auth data
   * Uses only Supabase database queries - no localStorage
   * 
   * @param {string} userId - The user ID to fetch profile for
   * @returns {Promise<void>}
   */
  const fetchUserProfile = async (userId: string): Promise<void> => {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase not configured, skipping profile fetch');
      setProfile(null);
      return;
    }

    try {
      console.log('📋 Fetching profile for user:', userId);
      setProfileLoading(true);
      
      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('📱 Database unavailable - cannot fetch user profile');
        setIsOffline(true);
        return;
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        // Fetch profile with timeout protection (8 seconds)
        // Uses Supabase database query - no localStorage involved
        const result = await Promise.race([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
          )
        ]);

        clearTimeout(timeoutId);
        const { data, error } = result;

        // Handle profile fetch errors
        if (error) {
          console.error('❌ Error fetching user profile:', error);
          
          // Handle specific error cases gracefully
          if (error.code === 'PGRST116') {
            // Profile not found - this is expected for new users
            console.log('📋 Profile not found for user:', userId);
            setProfile(null);
          } else if (error.message?.includes('Failed to fetch') || 
                     error.message?.includes('NetworkError') ||
                     error.message?.includes('fetch')) {
            // Network connectivity issues
            console.warn('📱 Error fetching profile:', error.message);
            setIsOffline(true);
            setProfile(null);
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            // Permission/RLS policy issues
            console.error('🔒 Permission denied - check RLS policies');
            setProfile(null);
          } else {
            // Other unexpected errors
            console.error('💥 Unexpected error fetching profile:', error);
            setProfile(null);
          }
        } else {
          console.log('✅ Profile fetched successfully:', data?.email);
          setProfile(data);
          setIsOffline(false);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('❌ Profile fetch timeout');
        } else if (fetchError.message?.includes('Supabase not configured')) {
          console.error('❌ Supabase not configured properly');
        } else {
          console.error('❌ Profile fetch error:', fetchError.message);
        }
        
        setProfile(null);
      }
    } catch (error: any) {
      console.error('💥 Exception in fetchUserProfile:', error);
      
      // Handle network-related errors gracefully
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch') ||
          error.message?.includes('Supabase not configured')) {
        console.warn('📱 Network error fetching profile:', error);
        setIsOffline(true);
      }
      
      setProfile(null);
      // Don't throw error - just set profile to null and continue
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Create or update user profile
   * Called when a user needs a profile created (typically after first login)
   * Uses Supabase database operations - no localStorage
   * 
   * @returns {Promise<void>}
   * @throws {Error} If user not found or database not configured
   */
  const createProfile = async () => {
    if (!user) {
      throw new Error('No user found');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Database connection not configured');
    }

    try {
      setProfileLoading(true);
      console.log('📝 Creating/updating profile for user:', user.id);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      // Create/update profile with timeout protection (15 seconds)
      // Uses Supabase upsert operation - no localStorage involved
      const result = await Promise.race([
        supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || 'User',
            last_name: user.user_metadata?.last_name || '',
            is_active: true
          }, {
            onConflict: 'id' // Update if exists, insert if new
          })
          .select()
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile creation timeout')), 15000)
        )
      ]);

      clearTimeout(timeoutId);
      const { data, error } = result;

      // Handle profile creation errors
      if (error) {
        console.error('❌ Error creating/updating user profile:', error);
        
        // Provide specific error messages for different failure types
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('fetch')) {
          throw new Error('Network error - check your internet connection and Supabase configuration');
        } else if (error.code === '42501' || error.message?.includes('permission denied')) {
          throw new Error('Permission denied - check database permissions');
        } else {
          throw error;
        }
      } else {
        console.log('✅ Profile created/updated successfully:', data);
        setProfile(data);
      }
    } catch (error: any) {
      console.error('💥 Exception in createProfile:', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch') ||
          error.message?.includes('Supabase not configured')) {
        throw new Error(parseAuthError(error));
      }
      
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Sign in user with email and password
   * Handles authentication and provides detailed error feedback
   * Uses only Supabase auth - no localStorage manipulation
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{error: any}>} Sign in result with error if any
   */
  const signIn = async (email: string, password: string) => {
    // Check if database is configured
    if (!isSupabaseConfigured) {
      return { error: { message: 'Database connection not configured. Please check your .env file.' } };
    }

    console.log('🔐 Attempting sign in for:', email);
    setLoading(true);
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Attempt sign in with timeout protection (15 seconds)
      // Supabase handles all session management internally
      const result = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Sign in timeout')), 15000)
        )
      ]);
      
      clearTimeout(timeoutId);
      const { error } = result;
      
      // Handle sign in errors
      if (error) {
        console.error('❌ Sign in error:', error);
        
        // Provide specific feedback for different error types
        if (error.message?.includes('Invalid login credentials')) {
          console.error('🔑 Invalid credentials for email:', email);
          console.error('💡 Tip: Ensure demo accounts exist in Supabase Auth');
        } else if (error.message?.includes('Failed to fetch') || 
                   error.message?.includes('NetworkError') ||
                   error.message?.includes('fetch')) {
          console.error('🌐 Network error during sign in');
          return { error: { message: 'Network error - check your internet connection and Supabase configuration' } };
        }
        
        setLoading(false);
      }
      
      return { error };
    } catch (error: any) {
      console.error('💥 Sign in exception:', error);
      setLoading(false);
      
      // Handle timeout and network errors
      if (error.message?.includes('timeout') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('fetch') ||
          error.message?.includes('Supabase not configured')) {
        return { error: { message: parseAuthError(error) } };
      }
      
      return { error };
    }
  };

  /**
   * Sign out current user
   * Clears both Supabase session and local state
   * Uses only Supabase signOut - no localStorage clearing needed
   * 
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    console.log('🚪 Signing out');
    
    try {
      // Attempt Supabase sign out if configured
      // This clears all session data managed by Supabase
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
        console.log('✅ Supabase sign out successful');
      }
    } catch (error) {
      console.error('❌ Supabase sign out error (continuing with local cleanup):', error);
      // Don't throw error - we still want to clear local state
    } finally {
      // Always clear local state regardless of Supabase call success
      console.log('🧹 Clearing local authentication state');
      
      // Clear Supabase session data from localStorage to prevent refresh token errors
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            localStorage.removeItem(key);
            console.log('🗑️ Removed localStorage key:', key);
          }
        }
      } catch (error) {
        console.error('❌ Error clearing localStorage:', error);
      }
      
      setUser(null);
      setProfile(null);
    }
  };

  /**
   * Check if current user has specific role(s)
   * Used for role-based access control throughout the application
   * 
   * @param {string | string[]} roles - Role or array of roles to check
   * @returns {boolean} True if user has any of the specified roles
   */
  const hasRole = (roles: string | string[]) => {
    if (!profile) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  };

  // Context value object
  const value = {
    user,
    profile,
    loading: loading || profileLoading, // Include profile loading in overall loading state
    isOffline,
    signIn,
    signOut,
    hasRole,
    createProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext }