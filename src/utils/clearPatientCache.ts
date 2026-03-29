// Utility to clear patient cache and force refetch
// This ensures we get the latest data including avatar_id

import { queryClient } from '../lib/api/queryClient';
import { secureLogger } from '../lib/security/secureLogger';

export function clearPatientCache() {
  secureLogger.debug('🧹 Clearing patient cache...');
  
  // Clear all patient-related queries
  queryClient.removeQueries({ queryKey: ['patients'] });
  queryClient.removeQueries({ queryKey: ['patient'] });
  
  // Invalidate to trigger refetch
  queryClient.invalidateQueries({ queryKey: ['patients'] });
  
  secureLogger.debug('✅ Patient cache cleared. Refetching...');
}

// Auto-run on import in dev mode
if (import.meta.env.DEV) {
  secureLogger.debug('🔄 Auto-clearing patient cache in dev mode...');
  setTimeout(() => {
    clearPatientCache();
  }, 1000);
}
