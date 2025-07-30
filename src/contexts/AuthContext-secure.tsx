// High-Security Auth Context - No Loading Hangs
// Maintains security features while preventing infinite loading

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured, checkDatabaseHealth } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
  const mounted = useRef(true);

  const fetchUserProfile = async (userId: string): Promise<void> => {
    if (!userId || !mounted.current) {
      setProfile(null);
      return;
    }

    try {
      // Security: Check database health before fetching profile
      const dbHealthy = await checkDatabaseHealth();
      if (!dbHealthy) {
        console.log('⚠️ Database not healthy, skipping profile fetch');
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
          console.log('👤 No profile found for user');
          setProfile(null);
        } else {
          console.error('Error fetching user profile:', error);
          setIsOffline(true);
          setProfile(null);
        }
      } else {
        setProfile(data);
        setIsOffline(false);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
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
        console.log('🔍 Session validation failed, attempting refresh...');
        
        // Security: Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.log('❌ Session refresh failed, signing out');
          await supabase.auth.signOut();
          return false;
        }
        
        console.log('✅ Session refreshed successfully');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  useEffect(() => {
    mounted.current = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Starting secure auth initialization...');
        
        if (!isSupabaseConfigured) {
          console.log('⚠️ Supabase not configured, using offline mode');
          if (mounted.current) {
            setLoading(false);
            setIsOffline(true);
          }
          return;
        }

        // Security: Set maximum initialization time (prevents infinite loading)
        initializationTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Auth initialization timeout - proceeding with current state');
          if (mounted.current) {
            setLoading(false);
          }
        }, 5000); // 5 second maximum

        console.log('🔍 Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        // Clear timeout since we got a response
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }

        if (error) {
          console.error('❌ Error getting session:', error);
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
            console.log('✅ Valid session found:', session.user.email);
            setUser(session.user);
            
            // Fetch profile in background, don't block loading
            fetchUserProfile(session.user.id).catch(err => 
              console.error('Background profile fetch failed:', err)
            );
          } else if (mounted.current) {
            console.log('❌ Invalid session, clearing auth state');
            setUser(null);
            setProfile(null);
          }
        } else {
          console.log('👤 No session found');
          if (mounted.current) {
            setUser(null);
            setProfile(null);
          }
        }

        if (mounted.current) {
          setLoading(false);
        }

      } catch (error: any) {
        console.error('💥 Error in initializeAuth:', error);
        
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

        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');

        // Clear any initialization timeout
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              console.log('👤 User signed in:', session.user.email);
              setUser(session.user);
              fetchUserProfile(session.user.id).catch(err => 
                console.error('Profile fetch failed:', err)
              );
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            setUser(null);
            setProfile(null);
            setIsOffline(false);
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            if (session?.user) {
              setUser(session.user);
            }
            break;
            
          case 'USER_UPDATED':
            console.log('👤 User updated');
            if (session?.user) {
              setUser(session.user);
              fetchUserProfile(session.user.id).catch(err => 
                console.error('Profile fetch after update failed:', err)
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
      
      // Security: Clean up timeout on unmount
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting secure sign in...');
      setLoading(true);
      
      // Security: Validate input
      if (!email || !password) {
        setLoading(false);
        return { error: new Error('Email and password are required') };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), // Security: Normalize email
        password,
      });
      
      if (error) {
        console.error('❌ Sign in failed:', error.message);
        setLoading(false);
        return { error };
      }
      
      console.log('✅ Sign in successful, waiting for auth state change...');
      // Don't set loading to false here - let auth state change handle it
      return { error: null };
    } catch (error) {
      console.error('💥 Exception during sign in:', error);
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      
      // Security: Explicitly clear all state
      setUser(null);
      setProfile(null);
      setIsOffline(false);
    } catch (error) {
      console.error('Error signing out:', error);
      // Security: Clear state even if sign out fails
      setUser(null);
      setProfile(null);
      setIsOffline(false);
    }
  };

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
        console.log('Profile already exists, fetching...');
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
      console.error('Error creating profile:', error);
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
