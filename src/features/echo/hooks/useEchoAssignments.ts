import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { useAuth } from '../../../hooks/useAuth';

export interface EchoAssignment {
  id: string;
  simulation_id: string;
  role: string;
  simulation: {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    tenant_id: string;
  };
}

/** Simulations the signed-in user may enter — same RPC as the Simulation Portal. */
export function useEchoAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['echo', 'assignments', user?.id],
    queryFn: async (): Promise<EchoAssignment[]> => {
      const { data, error } = await supabase.rpc('get_user_simulation_assignments', {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return (data ?? []) as EchoAssignment[];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
