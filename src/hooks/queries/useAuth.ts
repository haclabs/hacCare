import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, UserProfile, isSupabaseConfigured, checkDatabaseHealth } from '../../lib/api/supabase';
import { queryKeys } from '../../lib/api/queryClient';

// ========================================
// 🔐 AUTHENTICATION QUERY HOOKS
// ========================================

/**
 * Get current user session and profile data
 * Replaces manual session management from AuthContext
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return { user: null, profile: null, isOffline: true };
      }

      try {
        // Get current session with timeout protection
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 10000)
          )
        ]);

        if (error) {
          // Handle refresh token errors
          if (error.message?.includes('Invalid Refresh Token') || 
              error.message?.includes('Refresh Token Not Found') ||
              error.message?.includes('refresh_token_not_found')) {
            console.log('🔄 Invalid refresh token detected, clearing session...');
            await supabase.auth.signOut();
            return { user: null, profile: null, isOffline: false };
          }
          throw error;
        }

        const user = session?.user || null;
        let profile: UserProfile | null = null;

        // Fetch user profile if user exists
        if (user) {
          const isHealthy = await checkDatabaseHealth();
          if (isHealthy) {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            profile = profileData || null;
          }
        }

        return { user, profile, isOffline: false };
      } catch (error) {
        console.error('❌ Error fetching user session:', error);
        return { user: null, profile: null, isOffline: true };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - auth state stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    retry: (failureCount, error) => {
      // Don't retry auth errors, but retry network errors
      if (error?.message?.includes('Invalid Refresh Token')) return false;
      if (error?.message?.includes('unauthorized')) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Monitor auth state changes in real-time
 * Automatically updates user data when auth state changes
 */
export function useAuthStateListener() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.auth.listener,
    queryFn: () => {
      if (!isSupabaseConfigured) return null;

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 Auth state change:', event, session?.user?.id);
          
          // Invalidate user queries to refetch fresh data
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
          
          // Handle specific auth events
          if (event === 'SIGNED_OUT') {
            // Clear all cached data on sign out
            queryClient.clear();
          } else if (event === 'SIGNED_IN' && session?.user) {
            // Prefetch user profile on sign in
            queryClient.prefetchQuery({
              queryKey: queryKeys.auth.user,
              queryFn: async () => {
                const user = session.user;
                let profile: UserProfile | null = null;

                try {
                  const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                  
                  profile = profileData || null;
                } catch (error) {
                  console.error('Error fetching profile on sign in:', error);
                }

                return { user, profile, isOffline: false };
              },
            });
          }
        }
      );

      return subscription;
    },
    staleTime: Infinity, // Never refetch this query
    gcTime: Infinity,    // Keep listener alive
    enabled: isSupabaseConfigured,
  });
}

// ========================================
// 🔐 AUTHENTICATION MUTATIONS
// ========================================

/**
 * Sign in mutation with error handling
 * Replaces manual signIn function from AuthContext
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!isSupabaseConfigured) {
        throw new Error('Authentication not configured');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate user queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
      console.log('✅ Sign in successful:', data.user?.email);
    },
    onError: (error) => {
      console.error('❌ Sign in failed:', error);
    },
  });
}

/**
 * Sign out mutation
 * Replaces manual signOut function from AuthContext
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) {
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Clear all cached data on sign out
      queryClient.clear();
      console.log('✅ Sign out successful');
    },
    onError: (error) => {
      console.error('❌ Sign out failed:', error);
      // Even if sign out fails, clear local cache
      queryClient.clear();
    },
  });
}

/**
 * Create user profile mutation
 * Replaces manual createProfile function from AuthContext
 */
export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      if (!isSupabaseConfigured) {
        throw new Error('Database not configured');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          ...profileData,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (newProfile) => {
      // Update user query with new profile
      queryClient.setQueryData(queryKeys.auth.user, (old: any) => ({
        ...old,
        profile: newProfile,
      }));
      console.log('✅ Profile created successfully');
    },
    onError: (error) => {
      console.error('❌ Profile creation failed:', error);
    },
  });
}

// ========================================
// 🛡️ HELPER HOOKS
// ========================================

/**
 * Check if user has specific role(s)
 * Replaces hasRole function from AuthContext
 */
export function useHasRole() {
  const { data } = useCurrentUser();
  
  return (roles: string | string[]): boolean => {
    if (!data?.profile?.role) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(data.profile.role);
  };
}

/**
 * Get authentication status
 * Convenient hook for loading and auth states
 */
export function useAuthStatus() {
  const { data, isLoading, error } = useCurrentUser();
  
  return {
    isAuthenticated: !!data?.user,
    isLoading,
    isOffline: data?.isOffline || false,
    user: data?.user || null,
    profile: data?.profile || null,
    error,
  };
}
