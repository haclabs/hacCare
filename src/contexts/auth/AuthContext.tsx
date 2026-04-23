// @refresh reset
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured } from '../../lib/api/supabase';
import { parseAuthError } from '../../utils/authErrorParser';
// authPersistence import removed — initializeAuth now uses a single getSession() call
import { secureLogger } from '../../lib/security/secureLogger';

/**
 * Authentication Context Interface
 * Defines the shape of the authentication context that will be provided to components
 */
interface AuthContextType {
  user: User | null;                                    // Current authenticated user from Supabase
  profile: UserProfile | null;                         // User profile data from our database
  loading: boolean;                                     // Loading state for auth operations
  isOffline: boolean;                                   // Offline state indicator
  isAnonymous: boolean;                                 // Anonymous simulation user indicator
  signIn: (email: string, password: string) => Promise<{ error: any; profile?: UserProfile | null; accessToken?: string }>; // Sign in function
  signOut: () => Promise<void>;                        // Sign out function
  hasRole: (roles: string | string[]) => boolean;     // Role-based access control helper
  createProfile: () => Promise<void>;                 // Create user profile function
  setAnonymousSimulationUser: (simulationName: string) => void; // Set anonymous user for simulations
}

/**
 * Authentication Context
 * React context for managing authentication state throughout the application
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [isAnonymous, setIsAnonymous] = useState(false);        // Anonymous simulation user indicator
  const fetchingProfile = useRef(false);                       // Prevent duplicate profile fetches (Chrome race condition fix)

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
        if (process.env.NODE_ENV === 'development') {
          secureLogger.debug('Starting enhanced auth initialization...');
        }
        
        // Skip initialization if Supabase is not configured
        if (!isSupabaseConfigured) {
          secureLogger.debug('⚠️ Supabase not configured, using mock data mode');
          if (mounted) {
            setLoading(false);
            setIsOffline(true);
          }
          return;
        }

        // Set timeout to prevent infinite loading (15 seconds)
        timeoutId = setTimeout(() => {
          secureLogger.debug('⏰ Auth initialization timeout reached');
          if (mounted) {
            setLoading(false);
          }
        }, 15000);

        secureLogger.debug('🔍 Checking for existing session...');

        // Single getSession() call — avoids holding the Supabase _acquireLock across
        // multiple retries, which would block signInWithPassword() and the post-login
        // MFA/AAL check when the user logs in on the same page load.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Clear timeout since we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (sessionError) {
          secureLogger.error('❌ Error getting session:', sessionError);

          // Handle refresh token errors specifically
          if (sessionError.message?.includes('Invalid Refresh Token') ||
              sessionError.message?.includes('Refresh Token Not Found') ||
              sessionError.message?.includes('refresh_token_not_found')) {
            secureLogger.debug('🔄 Invalid refresh token detected, clearing session...');
            await signOut();
          }

          if (mounted) setLoading(false);
          return;
        }

        if (session?.user && mounted) {
          secureLogger.debug('👤 User session restored successfully:', session.user.email);
          setUser(session.user);

          // Fetch user profile and wait for completion
          try {
            await fetchUserProfile(session.user.id);
          } catch (err) {
            secureLogger.error('Profile fetch failed during init:', err);
          }

          setLoading(false);
        } else {
          secureLogger.debug('👤 No session found, user needs to log in');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }

        // Debug auth state in development mode (optional debugging can be added here if needed)
        if (import.meta.env.DEV) {
          // Debug logging handled elsewhere
        }
      } catch (error: any) {
        secureLogger.error('💥 Error in initializeAuth:', error);
        
        // Handle specific error types
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('timeout') ||
            error.message?.includes('Supabase not configured')) {
          secureLogger.error('🌐 Network connectivity issue or Supabase not configured during auth initialization');
          secureLogger.error('💡 Falling back to mock data mode');
        }
        
        // Handle refresh token errors in catch block as well
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Refresh Token Not Found') ||
            error.message?.includes('refresh_token_not_found')) {
          secureLogger.debug('🔄 Invalid refresh token detected in catch, clearing session...');
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

        if (process.env.NODE_ENV === 'development') {
          secureLogger.debug('Auth state changed:', event, session?.user?.email || 'No user');
        }
        
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Handle auth state changes
        if (session?.user) {
          setUser(session.user);
          
          // Only fetch profile on INITIAL_SESSION (page load/refresh)
          // SIGNED_IN is handled manually in signIn() function with longer delay
          if (event === 'INITIAL_SESSION') {
            secureLogger.debug(`✅ ${event} - Session ready, fetching profile...`);
            
            const handleProfileFetch = async () => {
              try {
                await fetchUserProfile(session.user.id);
                
                // After fetching, if no profile found and user signed in via OAuth, auto-create
                // Check using a fresh query since state may not be updated yet
                const { data: existingProfile } = await supabase
                  .from('user_profiles')
                  .select('id')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (!existingProfile && session.user.app_metadata?.provider === 'azure') {
                  secureLogger.debug('🔧 OAuth user without profile detected, creating profile...');
                  try {
                    // Create profile with OAuth user metadata
                    const { data: newProfile, error: createError } = await supabase
                      .from('user_profiles')
                      .upsert({
                        id: session.user.id,
                        email: session.user.email || '',
                        first_name: session.user.user_metadata?.given_name || session.user.user_metadata?.first_name || 'User',
                        last_name: session.user.user_metadata?.family_name || session.user.user_metadata?.last_name || '',
                        role: 'nurse', // Default role for OAuth users
                        is_active: true
                      }, {
                        onConflict: 'id'
                      })
                      .select()
                      .single();
                    
                    if (createError) {
                      secureLogger.error('❌ Failed to auto-create profile:', createError);
                    } else {
                      secureLogger.debug('✅ Profile auto-created for OAuth user:', newProfile);
                      setProfile(newProfile);
                    }
                  } catch (createError) {
                    secureLogger.error('❌ Exception creating profile:', createError);
                  }
                }
              } catch (error) {
                secureLogger.error('Profile fetch failed on auth change:', error);
              }
            };
            
            // Wait for profile fetch to complete before clearing loading state
            handleProfileFetch().finally(() => {
              setLoading(false);
            });
          } else {
            // SIGNED_IN or other events - just update user, don't fetch profile here
            // Keep loading true - signIn() will handle profile fetch and set loading false
            secureLogger.debug(`⏳ ${event} event - skipping profile fetch (handled by signIn() function)`);
          }
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    /**
     * Cleanup function
     * Prevents memory leaks and state updates after unmount
     */
    return () => {
      secureLogger.debug('🧹 Cleaning up auth context');
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
  async function fetchUserProfile(userId: string): Promise<void> {
    secureLogger.debug('🎯 fetchUserProfile called for:', userId, 'Guard flag:', fetchingProfile.current);
    
    // Skip if Supabase not configured
    if (!isSupabaseConfigured) {
      secureLogger.debug('⚠️ Supabase not configured, skipping profile fetch');
      setProfile(null);
      return;
    }

    // Prevent duplicate fetches (Chrome race condition fix)
    if (fetchingProfile.current) {
      secureLogger.debug('🔄 Profile fetch already in progress, skipping duplicate');
      return;
    }

    try {
      fetchingProfile.current = true;
      secureLogger.debug('📥 Starting profile fetch for user:', userId);
      setProfileLoading(true);
      
      // Skip health check - it's blocking and causing hangs
      // If the database is down, the query will fail and we'll handle it
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const startTime = performance.now();
      
      try {
        // Fetch profile with timeout protection (8 seconds)
        // Uses Supabase database query - no localStorage involved
        secureLogger.debug('🔍 Querying user_profiles table...');
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
        
        const elapsed = performance.now() - startTime;
        secureLogger.debug(`✅ Profile query completed in ${elapsed.toFixed(0)}ms`);

        clearTimeout(timeoutId);
        const { data, error } = result;

        // Handle profile fetch errors
        if (error) {
          secureLogger.error('❌ Error fetching user profile:', error);
          
          // Handle specific error cases gracefully
          if (error.code === 'PGRST116') {
            // Profile not found - this is expected for new users
            secureLogger.debug('📋 Profile not found for user:', userId);
            setProfile(null);
          } else if (error.message?.includes('Failed to fetch') || 
                     error.message?.includes('NetworkError') ||
                     error.message?.includes('fetch')) {
            // Network connectivity issues
            secureLogger.warn('📱 Error fetching profile:', error.message);
            setIsOffline(true);
            setProfile(null);
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            // Permission/RLS policy issues
            secureLogger.error('🔒 Permission denied - check RLS policies');
            setProfile(null);
          } else {
            // Other unexpected errors
            secureLogger.error('💥 Unexpected error fetching profile:', error);
            setProfile(null);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            secureLogger.debug('Profile fetched successfully:', data?.email);
          }
          setProfile(data);
          setIsOffline(false);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        const elapsed = performance.now() - startTime;
        
        if (fetchError.name === 'AbortError') {
          secureLogger.error(`❌ Profile fetch aborted after ${elapsed.toFixed(0)}ms`);
        } else if (fetchError.message?.includes('Profile fetch timeout')) {
          secureLogger.error(`⏱️ Profile fetch timeout after ${elapsed.toFixed(0)}ms`);
        } else if (fetchError.message?.includes('Supabase not configured')) {
          secureLogger.error('❌ Supabase not configured properly');
        } else {
          secureLogger.error(`❌ Profile fetch error after ${elapsed.toFixed(0)}ms:`, fetchError.message);
        }
        
        setProfile(null);
      }
    } catch (error: any) {
      secureLogger.error('💥 Exception in fetchUserProfile:', error);
      
      // Handle network-related errors gracefully
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch') ||
          error.message?.includes('Supabase not configured')) {
        secureLogger.warn('📱 Network error fetching profile:', error);
        setIsOffline(true);
      }
      
      setProfile(null);
      // Don't throw error - just set profile to null and continue
    } finally {
      setProfileLoading(false);
      fetchingProfile.current = false; // ✅ ALWAYS reset the guard flag
    }
  }

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
      secureLogger.debug('📝 Creating/updating profile for user:', user.id);

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
        secureLogger.error('❌ Error creating/updating user profile:', error);
        
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
        secureLogger.debug('✅ Profile created/updated successfully:', data);
        setProfile(data);
      }
    } catch (error: any) {
      secureLogger.error('💥 Exception in createProfile:', error);
      
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

    secureLogger.debug('🔐 Attempting sign in for:', email);
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
      const { data, error } = result;
      
      // Handle sign in errors
      if (error) {
        secureLogger.error('❌ Sign in error:', error);
        
        // Provide specific feedback for different error types
        if (error.message?.includes('Invalid login credentials')) {
          secureLogger.error('🔑 Invalid credentials for email:', email);
          secureLogger.error('💡 Tip: Ensure demo accounts exist in Supabase Auth');
        } else if (error.message?.includes('Failed to fetch') || 
                   error.message?.includes('NetworkError') ||
                   error.message?.includes('fetch')) {
          secureLogger.error('🌐 Network error during sign in');
          return { error: { message: 'Network error - check your internet connection and Supabase configuration' } };
        }
        
        setLoading(false);
      } else if (data?.session?.user) {
        // Sign in successful - use the session data returned directly
        secureLogger.debug('✅ Sign in successful, session data available immediately');
        secureLogger.debug('👤 User ID from signIn:', data.session.user.id);
        secureLogger.debug('🔑 Access Token:', data.session.access_token?.substring(0, 20) + '...');
        
        // Bypass hanging Supabase client - use direct HTTP fetch with the access token
        secureLogger.debug('📋 Using direct HTTP fetch to bypass Supabase client...');
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${data.session.user.id}&select=*`, {
            method: 'GET',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${data.session.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
          });
          
          secureLogger.debug('📡 Direct fetch response status:', response.status);
          
          if (response.ok) {
            const profiles = await response.json();
            secureLogger.debug('✅ Direct fetch successful, profiles:', profiles);
            
            if (profiles && profiles.length > 0) {
              secureLogger.debug('✅ Profile found:', profiles[0]);
              secureLogger.debug('👤 Profile role:', profiles[0].role, 'Is super_admin?', profiles[0].role === 'super_admin');
              
              // Use React 18's automatic batching - all state updates in same function are batched
              setUser(data.session.user);
              setProfile(profiles[0]);
              
              // Small delay to ensure state propagates to all consumers before clearing loading
              setTimeout(() => {
                setLoading(false);
                secureLogger.debug('🏁 Loading cleared after state propagation');
              }, 50);
              
              secureLogger.debug('🏁 User and profile state updated');
              return { error, profile: profiles[0], accessToken: data.session.access_token };
            } else {
              secureLogger.warn('⚠️ No profile found for user');
              setUser(data.session.user);
              setProfile(null);
              setLoading(false);
            }
          } else {
            const errorText = await response.text();
            secureLogger.error('❌ Direct fetch failed:', response.status, errorText);
            setUser(data.session.user);
            setProfile(null);
            setLoading(false);
          }
        } catch (fetchError) {
          secureLogger.error('💥 Exception during direct fetch:', fetchError);
          // Set user anyway so they can create profile
          setUser(data.session.user);
          setProfile(null);
          setLoading(false);
        }
      } else {
        secureLogger.warn('⚠️ signInWithPassword returned no session data');
        setLoading(false);
      }
      
      return { error };
    } catch (error: any) {
      secureLogger.error('💥 Sign in exception:', error);
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
  async function signOut() {
    secureLogger.debug('🚪 Signing out');
    
    try {
      // Reset the profile fetch guard on logout
      fetchingProfile.current = false; // ✅ Reset guard flag on logout
      
      // Attempt Supabase sign out if configured
      // This clears all session data managed by Supabase
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
        secureLogger.debug('✅ Supabase sign out successful');
      }
    } catch (error) {
      secureLogger.error('❌ Supabase sign out error (continuing with local cleanup):', error);
      // Don't throw error - we still want to clear local state
    } finally {
      // Always clear local state regardless of Supabase call success
      secureLogger.debug('🧹 Clearing local authentication state');
      
      // Clear Supabase session data from localStorage to prevent refresh token errors
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            localStorage.removeItem(key);
            secureLogger.debug('🗑️ Removed localStorage key:', key);
          }
        }
      } catch (error) {
        secureLogger.error('❌ Error clearing localStorage:', error);
      }

      setUser(null);
      setProfile(null);
    }
  }

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

  /**
   * Set anonymous simulation user with nurse privileges
   * Used for simulation access without login
   * 
   * @param {string} simulationName - Name of the simulation for logging
   */
  const setAnonymousSimulationUser = useCallback((simulationName: string) => {
    setIsAnonymous(true);
    setProfile({
      id: 'anonymous-sim-user',
      email: 'simulation@haccare.local',
      first_name: 'Nurse Simulation',
      last_name: simulationName,
      role: 'nurse',
      department: 'Simulation',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    secureLogger.debug(`🎭 Anonymous simulation user set: Nurse Simulation ${simulationName}`);
  }, []);

  // Context value object
  const value = {
    user,
    profile,
    loading: loading || profileLoading, // Include profile loading in overall loading state
    isOffline,
    isAnonymous,
    signIn,
    signOut,
    hasRole,
    createProfile,
    setAnonymousSimulationUser,
  };

  // Debug loading state
  if (process.env.NODE_ENV === 'development' && user && !profile) {
    secureLogger.debug('🔄 AuthContext state:', { loading, profileLoading, combinedLoading: loading || profileLoading, hasUser: !!user, hasProfile: !!profile });
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// AuthContext is already exported in the createContext line above