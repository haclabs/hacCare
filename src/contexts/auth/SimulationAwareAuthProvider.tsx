import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider as StandardAuthProvider } from './AuthContext';
import { useAuth as useStandardAuth } from './useAuth';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

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
      secureLogger.debug('🔍 Using standard auth for all users');
      setIsSimulationUser(false);
      setSimulationContext({});
    };

    detectUserType();
    
    // Listen for auth state changes to re-detect context
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      secureLogger.debug('🔄 Auth state changed in SimulationAwareAuthProvider:', event);
      
      if (event === 'SIGNED_IN') {
        detectUserType();
      } else if (event === 'SIGNED_OUT') {
        detectUserType();
        
        // Clear template editing state on logout
        sessionStorage.removeItem('editing_template');
        sessionStorage.removeItem('current_template_tenant');
        secureLogger.debug('🧹 Cleared template editing state on logout');
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

// Enhanced useAuth hook that automatically uses the right auth context.
// Kept as a re-export here for backwards compatibility — any file that imports
// useAuth from SimulationAwareAuthProvider will still work.
// NOTE: Vite Fast Refresh requires hook exports to live in a separate file from
// component exports; the actual implementation lives in useSimAwareAuth.ts.
export { useAuth } from './useSimAwareAuth';