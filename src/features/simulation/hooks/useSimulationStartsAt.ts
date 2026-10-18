import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { useTenant } from '../../../contexts/TenantContext';

/**
 * When the current simulation tenant's session was started (Play), or null if it hasn't been
 * started / was reset. Disabled outside simulation tenants, where `data` stays undefined.
 */
export function useSimulationStartsAt() {
  const { currentTenant } = useTenant();
  const isSimulationTenant =
    currentTenant?.tenant_type === 'simulation_active' || !!currentTenant?.is_simulation;

  const query = useQuery({
    queryKey: ['simulation-starts-at', currentTenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('simulation_active')
        .select('starts_at')
        .eq('tenant_id', currentTenant!.id)
        .maybeSingle();
      // No row (or RLS hides it) is treated the same as "not started" — the safe default.
      return (data?.starts_at as string | null | undefined) ?? null;
    },
    enabled: isSimulationTenant && !!currentTenant?.id,
    staleTime: 30 * 1000, // refresh soon after the instructor clicks Play
  });

  return { ...query, isSimulationTenant };
}
