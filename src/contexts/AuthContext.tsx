// High-Security Auth Context - No Loading Hangs
// Maintains security features while preventing infinite loading

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured, checkDatabaseHealth } from '../lib/api/supabase';
import { initializeSessionTracking, endUserSession } from '../services/admin/adminService';
import { secureLogger } from '../lib/security/secureLogger';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; profile: UserProfile | null }>;
  signOut: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  createProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(true);

  // Security: Auto-logout after 8 hours of inactivity
  const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

  const fetchUserProfile = async (userId: string): Promise<void> => {
    if (!userId || !mounted.current) {
      setProfile(null);
      return;
    }

    try {
      // Security: Check database health before fetching profile
      const dbHealthy = await checkDatabaseHealth();
      if (!dbHealthy) {
        secureLogger.debug('⚠️ Database not healthy, skipping profile fetch');
        setIsOffline(true);
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mounted.current) return;

      if (error) {
        if (error.code === 'PGRST116') {
          secureLogger.debug('👤 No profile found for user');
          setProfile(null);
        } else {
          secureLogger.error('Error fetching user profile:', error);
          setIsOffline(true);
          setProfile(null);
        }
      } else {
        setProfile(data);
        setIsOffline(false);
      }
    } catch (error) {
      secureLogger.error('Error in fetchUserProfile:', error);
      if (mounted.current) {
        setIsOffline(true);
        setProfile(null);
      }
    }
  };

  const validateSession = async (session: any): Promise<boolean> => {
    if (!session?.user) return false;

    try {
      // Security: Validate session by making an authenticated request
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        secureLogger.debug('🔍 Session validation failed, attempting refresh...');
        
        // Security: Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          secureLogger.debug('❌ Session refresh failed, signing out');
          await supabase.auth.signOut();
          return false;
        }
        
        secureLogger.debug('✅ Session refreshed successfully');
        return true;
      }
      
      return true;
    } catch (error) {
      secureLogger.error('Session validation error:', error);
      return false;
    }
  };

  useEffect(() => {
    mounted.current = true;

    const initializeAuth = async () => {
      try {
        secureLogger.debug('🔄 Starting secure auth initialization...');
        
        if (!isSupabaseConfigured) {
          secureLogger.debug('⚠️ Supabase not configured, using offline mode');
          if (mounted.current) {
            setLoading(false);
            setIsOffline(true);
          }
          return;
        }

        // Security: Set maximum initialization time (prevents infinite loading)
        initializationTimeoutRef.current = setTimeout(() => {
          secureLogger.debug('⏰ Auth initialization timeout - proceeding with current state');
          if (mounted.current) {
            setLoading(false);
          }
        }, 5000); // 5 second maximum

        secureLogger.debug('🔍 Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        // Clear timeout since we got a response
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }

        if (error) {
          secureLogger.error('❌ Error getting session:', error);
          if (mounted.current) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session && mounted.current) {
          // Security: Validate the session before using it
          const isValidSession = await validateSession(session);
          
          if (isValidSession && mounted.current) {
            secureLogger.debug('✅ Valid session found:', session.user.email);
            setUser(session.user);
            
            // Fetch profile in background, don't block loading
            fetchUserProfile(session.user.id).catch(err => 
              secureLogger.error('Background profile fetch failed:', err)
            );
          } else if (mounted.current) {
            secureLogger.debug('❌ Invalid session, clearing auth state');
            setUser(null);
            setProfile(null);
          }
        } else {
          secureLogger.debug('👤 No session found');
          if (mounted.current) {
            setUser(null);
            setProfile(null);
          }
        }

        if (mounted.current) {
          setLoading(false);
        }

      } catch (error: any) {
        secureLogger.error('💥 Error in initializeAuth:', error);
        
        // Clear timeout on error
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }
        
        if (mounted.current) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Security: Enhanced auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;

        secureLogger.debug('🔄 Auth state changed:', event, session?.user?.email || 'no user');

        // Clear any initialization timeout
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              secureLogger.debug('👤 User signed in:', session.user.email);
              setUser(session.user);
              fetchUserProfile(session.user.id).catch(err => 
                secureLogger.error('Profile fetch failed:', err)
              );
              
              // Initialize session tracking for admin dashboard
              initializeSessionTracking().catch(err =>
                secureLogger.error('Session tracking failed:', err)
              );
            }
            break;
            
          case 'SIGNED_OUT':
            secureLogger.debug('👋 User signed out');
            
            // End session tracking
            endUserSession().catch(err =>
              secureLogger.error('Failed to end session:', err)
            );
            
            setUser(null);
            setProfile(null);
            setIsOffline(false);
            break;
            
          case 'TOKEN_REFRESHED':
            secureLogger.debug('🔄 Token refreshed');
            if (session?.user) {
              setUser(session.user);
            }
            break;
            
          case 'USER_UPDATED':
            secureLogger.debug('👤 User updated');
            if (session?.user) {
              setUser(session.user);
              fetchUserProfile(session.user.id).catch(err => 
                secureLogger.error('Profile fetch after update failed:', err)
              );
            }
            break;
            
          default:
            // Handle other events
            if (session?.user) {
              setUser(session.user);
            } else {
              setUser(null);
              setProfile(null);
            }
        }
        
        // Always ensure loading is false after auth state change
        setLoading(false);
      }
    );

    return () => {
      mounted.current = false;
      
      // Security: Clean up timeouts on unmount
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      
      subscription.unsubscribe();
    };
  }, []);

  // Security: Inactivity timeout - auto-logout after 8 hours of no activity
  useEffect(() => {
    if (!user) {
      // Clear timeout if user is not logged in
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      return;
    }

    secureLogger.debug('⏱️ Starting 8-hour inactivity monitor');

    const resetInactivityTimer = () => {
      // Clear existing timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      // Set new timeout for 8 hours
      inactivityTimeoutRef.current = setTimeout(async () => {
        secureLogger.debug('⏰ 8-hour inactivity timeout reached - auto-logging out');
        await signOut();
        // Optional: Show a message to the user
        if (mounted.current) {
          secureLogger.debug('👋 Session expired due to inactivity');
        }
      }, INACTIVITY_TIMEOUT);
    };

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      
      secureLogger.debug('🧹 Inactivity monitor cleaned up');
    };
  }, [user]); // Re-run when user changes (login/logout)

  const signIn = async (email: string, password: string) => {
    try {
      secureLogger.debug('🔐 Starting secure sign in...');
      setLoading(true);
      
      // Security: Validate input
      if (!email || !password) {
        setLoading(false);
        return { error: new Error('Email and password are required'), profile: null };
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), // Security: Normalize email
        password,
      });
      
      if (error) {
        secureLogger.error('❌ Sign in failed:', error.message);
        setLoading(false);
        return { error, profile: null };
      }
      
      // Fetch the profile immediately so the caller can make role-based decisions
      // (e.g. whether to show MFA challenge) without waiting for the async
      // onAuthStateChange → fetchUserProfile cycle to complete.
      // NOTE: We intentionally do NOT call setProfile() here. Storing the profile
      // in context at this point would trigger LoginForm's useEffect (which depends
      // on profile?.role) while handleSubmit is still mid-execution awaiting the AAL
      // check. That creates two concurrent getAuthenticatorAssuranceLevel() calls
      // which contend on Supabase's internal _useSession lock and cause a hang.
      // The onAuthStateChange → fetchUserProfile pipeline sets profile in context
      // after the form-submit MFA flow is already in motion.
      let signedInProfile: UserProfile | null = null;
      if (signInData?.user) {
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', signInData.user.id)
            .single();
          signedInProfile = profileData ?? null;
        } catch (profileErr) {
          secureLogger.error('Profile fetch after sign in failed:', profileErr);
        }
      }

      secureLogger.debug('✅ Sign in successful, profile fetched:', signedInProfile?.role ?? 'none');
      // Don't set loading to false here - let auth state change handle it
      return { error: null, profile: signedInProfile };
    } catch (error) {
      secureLogger.error('💥 Exception during sign in:', error);
      setLoading(false);
      return { error, profile: null };
    }
  };

  async function signOut() {
    try {
      secureLogger.debug('🚪 Signing out...');
      
      // Clear inactivity timeout on manual logout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      
      await supabase.auth.signOut();
      
      // Security: Explicitly clear all state
      setUser(null);
      setProfile(null);
      setIsOffline(false);
    } catch (error) {
      secureLogger.error('Error signing out:', error);
      // Security: Clear state even if sign out fails
      setUser(null);
      setProfile(null);
      setIsOffline(false);
    }
  }

  const hasRole = (roles: string | string[]): boolean => {
    if (!profile?.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      // Security: Validate user exists before creating profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        secureLogger.debug('Profile already exists, fetching...');
        await fetchUserProfile(user.id);
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            role: 'user', // Security: Default to lowest privilege role
            first_name: '',
            last_name: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      await fetchUserProfile(user.id);
    } catch (error) {
      secureLogger.error('Error creating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isOffline,
        signIn,
        signOut,
        hasRole,
        createProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
