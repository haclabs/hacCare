// Ultra-Simple Auth Context - No Loading States
// This completely bypasses loading to see what's happening

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, isSupabaseConfigured } from '../lib/supabase';

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
  const [loading, setLoading] = useState(false); // FORCE FALSE - no loading ever
  const [isOffline, setIsOffline] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<void> => {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
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
          setProfile(null);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 ULTRA-SIMPLE auth - no loading states');
        
        if (!isSupabaseConfigured) {
          console.log('⚠️ Supabase not configured');
          if (mounted) {
            setIsOffline(true);
          }
          return;
        }

        // Just try to get session, no loading states
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          console.log('✅ Session found:', session.user.email);
          setUser(session.user);
          fetchUserProfile(session.user.id); // Don't await - let it run async
        } else {
          console.log('👤 No session found - should show login');
          setUser(null);
          setProfile(null);
        }

      } catch (error: any) {
        console.error('💥 Error in initializeAuth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event);

        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id); // Don't await
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in...');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in failed:', error.message);
        return { error };
      }
      
      console.log('✅ Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('💥 Exception during sign in:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
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
            role: 'user',
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
        loading, // Always false
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
