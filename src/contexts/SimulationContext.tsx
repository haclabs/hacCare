import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ActiveSimulation, SimulationPatient } from '../types';
import { getActiveSimulationByToken, getSimulationPatients } from '../lib/simulationService';
import { useAuth } from '../hooks/useAuth';

interface SimulationContextType {
  // Simulation state
  isSimulationMode: boolean;
  currentSimulation: ActiveSimulation | null;
  simulationPatients: SimulationPatient[];
  
  // Actions
  enterSimulationMode: (token: string) => Promise<boolean>;
  exitSimulationMode: () => void;
  refreshSimulationData: () => Promise<void>;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

interface SimulationProviderProps {
  children: ReactNode;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children }) => {
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [currentSimulation, setCurrentSimulation] = useState<ActiveSimulation | null>(null);
  const [simulationPatients, setSimulationPatients] = useState<SimulationPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get auth context for setting anonymous user
  const { setAnonymousSimulationUser, isAnonymous } = useAuth();

  // Restore anonymous user state on page refresh (only once on mount)
  useEffect(() => {
    const savedIsAnonymous = sessionStorage.getItem('simulation_anonymous');
    const simulationName = sessionStorage.getItem('simulation_name');
    
    // Only restore if we're not already anonymous and we have saved state
    if (savedIsAnonymous === 'true' && simulationName && !isAnonymous) {
      setAnonymousSimulationUser(simulationName);
    }
  }, []); // Empty dependency array - only run once on mount

  // Check for simulation token in URL on mount
  useEffect(() => {
    const checkForSimulationToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('sim');
      
      console.log('🎯 SimulationContext: Checking for simulation token');
      console.log('🎯 URL params:', urlParams.toString());
      console.log('🎯 Simulation token from URL:', token);
      
      // If no token in URL, check session storage for persistence
      if (!token) {
        token = sessionStorage.getItem('simulation_token');
        console.log('🎯 Simulation token from session storage:', token);
      }
      
      if (token) {
        console.log('🎯 Attempting to enter simulation mode with token:', token);
        const success = await enterSimulationMode(token);
        console.log('🎯 Enter simulation mode result:', success);
        if (success) {
          // Clean URL if we loaded from session storage
          if (!urlParams.get('sim')) {
            const url = new URL(window.location.href);
            url.searchParams.set('sim', token);
            window.history.replaceState({}, '', url.toString());
            console.log('🎯 Updated URL with simulation token');
          }
        }
      } else {
        console.log('🎯 No simulation token found in SimulationContext');
      }
    };

    checkForSimulationToken();
  }, []);

  const enterSimulationMode = useCallback(async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Get simulation by token
      const simulation = await getActiveSimulationByToken(token);
      if (!simulation) {
        setError('Invalid simulation link or simulation not found');
        return false;
      }

      // Check if simulation is running
      if (simulation.status !== 'running') {
        setError('This simulation is not currently active');
        return false;
      }

      // Load simulation patients
      const patients = await getSimulationPatients(undefined, false, simulation.id);

      // Set anonymous user if simulation allows anonymous access
      if (simulation.allow_anonymous_access) {
        setAnonymousSimulationUser(simulation.session_name);
        // Store anonymous state for persistence
        sessionStorage.setItem('simulation_anonymous', 'true');
        sessionStorage.setItem('simulation_name', simulation.session_name);
      }

      // Set simulation state
      setCurrentSimulation(simulation);
      setSimulationPatients(patients);
      setIsSimulationMode(true);

      // Store simulation token in session for persistence
      sessionStorage.setItem('simulation_token', token);

      return true;
    } catch (err) {
      console.error('Error entering simulation mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to load simulation');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setAnonymousSimulationUser]);

  const exitSimulationMode = useCallback(() => {
    setIsSimulationMode(false);
    setCurrentSimulation(null);
    setSimulationPatients([]);
    setError(null);
    
    // Clear all simulation-related session storage
    sessionStorage.removeItem('simulation_token');
    sessionStorage.removeItem('simulation_anonymous');
    sessionStorage.removeItem('simulation_name');
    
    // Remove simulation token from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('sim');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const refreshSimulationData = useCallback(async () => {
    if (!currentSimulation) return;

    try {
      setLoading(true);
      const patients = await getSimulationPatients(undefined, false, currentSimulation.id);
      setSimulationPatients(patients);
    } catch (err) {
      console.error('Error refreshing simulation data:', err);
      setError('Failed to refresh simulation data');
    } finally {
      setLoading(false);
    }
  }, [currentSimulation]);

  const value: SimulationContextType = {
    isSimulationMode,
    currentSimulation,
    simulationPatients,
    enterSimulationMode,
    exitSimulationMode,
    refreshSimulationData,
    loading,
    error
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

export default SimulationContext;