import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider as StandardAuthProvider, useAuth as useStandardAuth } from './AuthContext';
import { AuthProvider as SimulationAuthProvider, useAuth as useSimulationAuth } from './AuthContext-simulation';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';
import { supabase } from '../../lib/supabase';

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
      try {
        // Only check simulation context if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // No user logged in, default to standard auth
          console.log('🔍 No user logged in, using standard auth');
          setIsSimulationUser(false);
          setSimulationContext({});
          return;
        }

        console.log('🔍 Checking simulation context for user:', user.email);

        // Check if current user is in a simulation context
        const context = await SimulationSubTenantService.getCurrentUserSimulationContext();
        
        console.log('🔍 Simulation context result:', context);

        if (context && context.isInSimulation) {
          console.log('✅ User is in simulation context, using simulation auth');
          setIsSimulationUser(true);
          setSimulationContext({
            simulationId: context.simulationId,
            simulationTenantId: context.simulationTenantId
          });
        } else {
          console.log('✅ User is NOT in simulation context, using standard auth');
          setIsSimulationUser(false);
          setSimulationContext({});
        }
      } catch (error) {
        console.log('⚠️ Error checking simulation context, defaulting to standard auth:', error);
        setIsSimulationUser(false);
        setSimulationContext({});
      }
    };

    detectUserType();
    
    // Listen for auth state changes to re-detect context
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        detectUserType();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: SimulationAwareContextType = {
    isSimulationUser,
    simulationId: simulationContext.simulationId,
    simulationTenantId: simulationContext.simulationTenantId,
    authHook: isSimulationUser ? useSimulationAuth : useStandardAuth
  };

  // Provide the appropriate auth context based on user type
  if (isSimulationUser) {
    return (
      <SimulationAuthProvider>
        <SimulationAwareContext.Provider value={contextValue}>
          {children}
        </SimulationAwareContext.Provider>
      </SimulationAuthProvider>
    );
  } else {
    return (
      <StandardAuthProvider>
        <SimulationAwareContext.Provider value={contextValue}>
          {children}
        </SimulationAwareContext.Provider>
      </StandardAuthProvider>
    );
  }
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
      const { supabase } = await import('../../lib/supabase');
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