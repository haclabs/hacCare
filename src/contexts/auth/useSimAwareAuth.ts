// Separated from SimulationAwareAuthProvider.tsx to satisfy Vite Fast Refresh
// (files must export only components OR only hooks/utilities, not both).
import { useAuth as useStandardAuth } from './useAuth';

/**
 * useAuth re-export. All users use the standard auth context — the simulation
 * user path was removed when the simulation system was unified.
 */
export const useAuth = useStandardAuth;
