import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured } from '../lib/supabase';

/**
 * Authentication Context Interface
 * Defines the shape of the authentication context that will be provided to components
 */
interface AuthContextType {
  user: User | null;                                    // Current authenticated user from Supabase
  profile: UserProfile | null;                         // User profile data from our database
  loading: boolean;                                     // Loading state for auth operations
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
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state management
  const [user, setUser] = useState<User | null>(null);           // Supabase user object
  const [profile, setProfile] = useState<UserProfile | null>(null); // User profile from database
  const [loading, setLoading] = useState(true);                 // Overall loading state
  const [profileLoading, setProfileLoading] = useState(false);  // Profile-specific loading state

  /**
   * Initialize authentication on component mount
   * Handles session restoration, auth state changes, and cleanup
   */
  useEffect(() => {
    let mounted = true;        // Flag to prevent state updates after unmount
    let timeoutId: NodeJS.Timeout; // Timeout for preventing infinite loading

    /**
     * Initialize authentication system
     * - Restores existing session if available
     * - Fetches user profile data
     * - Sets up auth state listeners
     * - Handles various error conditions gracefully
     */
    const initializeAuth = async () => {
      try {
        console.log('🔄 Starting auth initialization...');
        
        // Skip initialization if Supabase is not configured
        if (!isSupabaseConfigured) {
          console.log('⚠️ Supabase not configured, skipping auth');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Set timeout to prevent infinite loading (30 seconds)
        timeoutId = setTimeout(() => {
          console.log('⏰ Auth initialization timeout reached');
          if (mounted) {
            setLoading(false);
          }
        }, 30000);

        console.log('🔍 Getting initial session...');
        
        // Attempt to get current session with timeout protection
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 15000)
          )
        ]);
        
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
            await signOut(); // Clear invalid session data
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
   * Fetch user profile from database
   * Retrieves additional user information beyond basic auth data
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
      
      // First, test if we can reach Supabase at all
      try {
        const healthCheck = await Promise.race([
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }),
          new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        if (!healthCheck.ok && healthCheck.status !== 404) {
          throw new Error(`Supabase health check failed: ${healthCheck.status}`);
        }
        
        console.log('✅ Supabase connectivity confirmed');
      } catch (healthError: any) {
        console.error('❌ Supabase health check failed:', healthError.message);
        
        if (healthError.message?.includes('Failed to fetch') || 
            healthError.message?.includes('NetworkError') ||
            healthError.message?.includes('timeout')) {
          console.error('🌐 Cannot reach Supabase - check your internet connection and Supabase URL');
          console.error('💡 Current Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
          console.error('💡 Verify this URL is correct in your Supabase project settings');
          setProfile(null);
          return;
        }
        
        // Continue with profile fetch if it's just a different error
      }
      
      // Fetch profile with timeout protection (15 seconds)
      const result = await Promise.race([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
        )
      ]);

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
          console.error('🌐 Network error fetching profile');
          console.error('💡 Check your internet connection and Supabase configuration');
          console.error('💡 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
          console.error('💡 Make sure your Supabase project is active and accessible');
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
      }
    } catch (error: any) {
      console.error('💥 Exception in fetchUserProfile:', error);
      
      // Handle network-related errors gracefully
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch')) {
        console.error('🌐 Network connectivity issue - check your Supabase configuration');
        console.error('💡 Current Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
        console.error('💡 Current API Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
        console.error('💡 Verify these values in your Supabase project settings');
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

      // Create/update profile with timeout protection (20 seconds)
      const result = await Promise.race([
        supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || 'User',
            last_name: user.user_metadata?.last_name || '',
            role: 'nurse', // Default role for new users
            is_active: true
          }, {
            onConflict: 'id' // Update if exists, insert if new
          })
          .select()
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile creation timeout')), 20000)
        )
      ]);

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
          error.message?.includes('fetch')) {
        throw new Error('Unable to connect to database. Please check your internet connection and try again.');
      }
      
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Sign in user with email and password
   * Handles authentication and provides detailed error feedback
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{error: any}>} Sign in result with error if any
   */
  const signIn = async (email: string, password: string) => {
    // Check if database is configured
    if (!isSupabaseConfigured) {
      return { error: { message: 'Database connection not configured' } };
    }

    console.log('🔐 Attempting sign in for:', email);
    setLoading(true);
    
    try {
      // Attempt sign in with timeout protection (20 seconds)
      const result = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Sign in timeout')), 20000)
        )
      ]);
      
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
          return { error: { message: 'Network error - check your internet connection' } };
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
          error.message?.includes('fetch')) {
        return { error: { message: 'Connection timeout - please check your internet connection and try again' } };
      }
      
      return { error };
    }
  };

  /**
   * Sign out current user
   * Clears both Supabase session and local state
   * 
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    console.log('🚪 Signing out');
    
    try {
      // Attempt Supabase sign out if configured
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
    signIn,
    signOut,
    hasRole,
    createProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};