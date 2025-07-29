import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured, checkDatabaseHealth } from '../../lib/supabase';

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

  const fetchUserProfile = async (userId: string): Promise<void> => {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
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
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setIsOffline(true);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Starting basic auth initialization...');
        
        if (!isSupabaseConfigured) {
          console.log('⚠️ Supabase not configured, using mock data mode');
          if (mounted) {
            setLoading(false);
            setIsOffline(true);
          }
          return;
        }

        // Set a shorter timeout to prevent hanging
        timeoutId = setTimeout(() => {
          console.log('⏰ Auth initialization timeout reached - forcing login page');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }, 3000); // Reduced to 3 seconds

        console.log('🔍 Checking session...');
        
        // Wrap the session check in a Promise.race with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        // Clear timeout since we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (error) {
          console.error('❌ Error getting session:', error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('✅ Session found:', session.user.email);
          setUser(session.user);
          // Don't wait for profile fetch - do it in background
          fetchUserProfile(session.user.id).catch(err => 
            console.error('Background profile fetch failed:', err)
          );
        } else {
          console.log('👤 No session found, user needs to log in');
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }

        if (mounted) {
          setLoading(false);
        }

      } catch (error: any) {
        console.error('💥 Error in initializeAuth:', error);
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    // Start initialization immediately
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');

        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (session?.user) {
          console.log('👤 User signed in:', session.user.email);
          setUser(session.user);
          // Don't wait for profile fetch
          fetchUserProfile(session.user.id).catch(err => 
            console.error('Profile fetch failed in auth change:', err)
          );
        } else {
          console.log('👋 User signed out or no session');
          setUser(null);
          setProfile(null);
        }
        
        // Always set loading to false after auth state change
        console.log('✅ Setting loading to false after auth state change');
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting sign in process...');
      setLoading(true); // Set loading while signing in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ AuthContext: Sign in failed:', error.message);
        setLoading(false); // Set loading to false on error
        return { error };
      }
      
      console.log('✅ AuthContext: Sign in request successful, waiting for auth state change...');
      // Don't set loading to false here - let the auth state change handle it
      return { error: null };
    } catch (error) {
      console.error('💥 AuthContext: Exception during sign in:', error);
      setLoading(false); // Only set loading to false on error
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
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
      const { error } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            role: 'nurse',
            created_at: new Date().toISOString(),
          }
        ]);

      if (error) throw error;
      await fetchUserProfile(user.id);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isOffline,
    signIn,
    signOut,
    hasRole,
    createProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
