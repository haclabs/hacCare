import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, UserProfile } from '../../lib/api/supabase';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';

interface SimulationContext {
  isInSimulation: boolean;
  simulationTenantId?: string;
  simulationName?: string;
  simulationId?: string;
  role?: string;
  simulationStatus?: 'lobby' | 'running' | 'paused' | 'completed';
}

interface AuthContextType {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  simulationContext: SimulationContext;
  login: (email: string, password: string) => Promise<{ error?: { message: string } }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  joinSimulationLobby: () => Promise<any>;
  startSimulation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationContext, setSimulationContext] = useState<SimulationContext>({
    isInSimulation: false,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await Promise.all([
            fetchUserProfile(session.user.id),
            checkSimulationContext()
          ]);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (session?.user) {
          setUser(session.user);
          await Promise.all([
            fetchUserProfile(session.user.id),
            checkSimulationContext()
          ]);
        } else {
          setUser(null);
          setUserProfile(null);
          setSimulationContext({ isInSimulation: false });
        }
        
        if (event === 'SIGNED_OUT') {
          setError(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserProfile(data || null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't set error for profile fetch failures - user can still use the app
    }
  };

  const checkSimulationContext = async () => {
    try {
      const context = await SimulationSubTenantService.getCurrentUserSimulationContext();
      setSimulationContext(context);
      
      // If user is in simulation lobby, they need to be redirected to lobby
      if (context.isInSimulation && context.simulationStatus === 'lobby') {
        console.log('User is in simulation lobby, context ready');
      }
    } catch (error) {
      console.error('Error checking simulation context:', error);
      // Reset to non-simulation context on error
      setSimulationContext({ isInSimulation: false });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { error: { message: error.message } };
      }

      // Auth state change handler will handle the rest
      return {};
    } catch (error) {
      const errorMessage = 'An unexpected error occurred during login';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // Auth state change handler will clear the state
    } catch (error) {
      console.error('Error during logout:', error);
      setError('Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([
        fetchUserProfile(user.id),
        checkSimulationContext()
      ]);
    }
  };

  const joinSimulationLobby = async () => {
    if (!simulationContext.simulationId) {
      throw new Error('No simulation ID available');
    }

    try {
      const lobbyData = await SimulationSubTenantService.joinSimulationLobby(
        simulationContext.simulationId
      );
      
      // Update local context
      setSimulationContext(prev => ({
        ...prev,
        simulationStatus: lobbyData.simulation_status as any,
      }));
      
      return lobbyData;
    } catch (error) {
      console.error('Error joining simulation lobby:', error);
      throw error;
    }
  };

  const startSimulation = async () => {
    if (!simulationContext.simulationId) {
      throw new Error('No simulation ID available');
    }

    try {
      await SimulationSubTenantService.startSimulation(simulationContext.simulationId);
      
      // Update local context
      setSimulationContext(prev => ({
        ...prev,
        simulationStatus: 'running',
      }));
    } catch (error) {
      console.error('Error starting simulation:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error,
    simulationContext,
    login,
    logout,
    refreshProfile,
    joinSimulationLobby,
    startSimulation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};