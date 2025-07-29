import React, { createContext, useContext, useEffect, useState } from 'react';
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

        console.log('🔍 Checking session with retry logic...');
        
        const { data: { session }, error } = await supabase.auth.getSession();

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
          await fetchUserProfile(session.user.id);
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
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event);

        if (session?.user) {
          console.log('👤 User signed in:', session.user.email);
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          console.log('👋 User signed out');
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
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
