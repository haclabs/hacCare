// Utility to clear patient cache and force refetch
// This ensures we get the latest data including avatar_id

import { queryClient } from '../lib/api/queryClient';

export function clearPatientCache() {
  console.log('🧹 Clearing patient cache...');
  
  // Clear all patient-related queries
  queryClient.removeQueries({ queryKey: ['patients'] });
  queryClient.removeQueries({ queryKey: ['patient'] });
  
  // Invalidate to trigger refetch
  queryClient.invalidateQueries({ queryKey: ['patients'] });
  
  console.log('✅ Patient cache cleared. Refetching...');
}

// Auto-run on import in dev mode
if (import.meta.env.DEV) {
  console.log('🔄 Auto-clearing patient cache in dev mode...');
  setTimeout(() => {
    clearPatientCache();
  }, 1000);
}
