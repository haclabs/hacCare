import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider as StandardAuthProvider } from './AuthContext';
import { useAuth as useStandardAuth } from './useAuth';
import { supabase } from '../../lib/api/supabase';
import { initializeSessionTracking, endUserSession } from '../../services/admin/adminService';

interface SimulationAwareContextType {
  isSimulationUser: boolean;
  simulationId?: string;
  simulationTenantId?: string;
  authHook: () => any; // Dynamic hook based on user type
}

const SimulationAwareContext = createContext<SimulationAwareContextType | undefined>(undefined);

export const useSimulationAwareAuth = () => {
  const context = useContext(SimulationAwareContext);
  if (!context) {
    throw new Error('useSimulationAwareAuth must be used within SimulationAwareAuthProvider');
  }
  return context;
};

interface SimulationAwareAuthProviderProps {
  children: React.ReactNode;
}

export const SimulationAwareAuthProvider: React.FC<SimulationAwareAuthProviderProps> = ({ children }) => {
  const [isSimulationUser, setIsSimulationUser] = useState<boolean>(false);
  const [simulationContext, setSimulationContext] = useState<{
    simulationId?: string;
    simulationTenantId?: string;
  }>({});

  useEffect(() => {
    const detectUserType = async () => {
      // With new simulation system, all users use standard auth
      // Simulation users are just regular users assigned to simulation tenants
      console.log('🔍 Using standard auth for all users');
      setIsSimulationUser(false);
      setSimulationContext({});
    };

    detectUserType();
    
    // Listen for auth state changes to re-detect context and handle session tracking
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed in SimulationAwareAuthProvider:', event);
      
      if (event === 'SIGNED_IN') {
        detectUserType();
        
        // Initialize session tracking for all logins (non-blocking)
        if (session?.user) {
          console.log('👤 User signed in, initializing session tracking for:', session.user.email);
          
          // Start session tracking in background without blocking auth
          initializeSessionTracking()
            .then(() => {
              console.log('✅ Background session tracking completed');
            })
            .catch(error => {
              console.warn('⚠️ Background session tracking failed (non-critical):', error);
            });
        }
      } else if (event === 'SIGNED_OUT') {
        detectUserType();
        
        // Clear template editing state on logout
        sessionStorage.removeItem('editing_template');
        sessionStorage.removeItem('current_template_tenant');
        console.log('🧹 Cleared template editing state on logout');
        
        // End session tracking on logout
        try {
          await endUserSession();
        } catch (error) {
          console.error('Failed to end session tracking:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: SimulationAwareContextType = {
    isSimulationUser,
    simulationId: simulationContext.simulationId,
    simulationTenantId: simulationContext.simulationTenantId,
    authHook: useStandardAuth // Always use standard auth with new system
  };

  // With new simulation system, all users use standard auth
  return (
    <StandardAuthProvider>
      <SimulationAwareContext.Provider value={contextValue}>
        {children}
      </SimulationAwareContext.Provider>
    </StandardAuthProvider>
  );
};

// Enhanced useAuth hook that automatically uses the right auth context
export const useAuth = () => {
  const { authHook, isSimulationUser } = useSimulationAwareAuth();
  const authContext = authHook();
  
  // Always ensure createProfile function exists
  const ensureCreateProfile = (context: any) => {
    if (typeof context.createProfile === 'function') {
      return context.createProfile;
    }
    // Fallback createProfile function
    return async () => {
      console.log('Using fallback createProfile');
      // Import and use the standard auth context's createProfile
      const { supabase } = await import('../../lib/api/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      // Basic profile creation logic
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      return Promise.resolve();
    };
  };
  
  // Normalize the function names and add missing functions between standard and simulation auth
  if (isSimulationUser) {
    console.log('🔄 Using simulation auth context');
    // Simulation auth uses 'login', standardize to 'signIn' and add missing functions
    return {
      ...authContext,
      signIn: authContext.login,
      signOut: authContext.logout,
      profile: authContext.userProfile, // Normalize profile property name
      // Add missing functions for simulation context
      createProfile: ensureCreateProfile(authContext),
      hasRole: (roles: string | string[]) => {
        // Check role based on simulation context
        const userRole = authContext.simulationContext?.role || '';
        if (Array.isArray(roles)) {
          return roles.includes(userRole);
        }
        return userRole === roles;
      }
    };
  } else {
    // Standard auth already uses 'signIn' and 'signOut' and has all required functions
    return {
      ...authContext,
      createProfile: ensureCreateProfile(authContext)
    };
  }
};