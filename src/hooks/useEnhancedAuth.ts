/**
 * Enhanced Authentication Hook
 * 
 * This hook provides additional session restoration capabilities
 * and ensures components always have the latest auth state.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth/useAuth';
import { forceSessionCheck } from '../lib/directAuthFix';

export const useEnhancedAuth = () => {
  const auth = useAuth();
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [forceRefreshTrigger, setForceRefreshTrigger] = useState(0);

  // Additional session check when component mounts
  useEffect(() => {
    let mounted = true;

    const performSessionCheck = async () => {
      if (!auth.user && !auth.loading && !isSessionChecked) {
        console.log('🔍 Enhanced auth: Performing additional session check...');
        
        try {
          const sessionFound = await forceSessionCheck();
          
          if (mounted) {
            setIsSessionChecked(true);
            
            if (sessionFound) {
              console.log('✅ Enhanced auth: Session found during additional check');
              // Trigger a small delay to allow auth context to update
              setTimeout(() => {
                if (mounted && !auth.user) {
                  console.log('🔄 Enhanced auth: Triggering force refresh');
                  setForceRefreshTrigger(prev => prev + 1);
                }
              }, 500);
            } else {
              console.log('⚠️ Enhanced auth: No session found during additional check');
            }
          }
        } catch (error) {
          console.error('❌ Enhanced auth: Error during additional session check:', error);
          if (mounted) {
            setIsSessionChecked(true);
          }
        }
      } else if (auth.user || isSessionChecked) {
        setIsSessionChecked(true);
      }
    };

    performSessionCheck();

    return () => {
      mounted = false;
    };
  }, [auth.user, auth.loading, isSessionChecked]);

  // Reset session check flag when auth state changes
  useEffect(() => {
    if (auth.user) {
      setIsSessionChecked(true);
    }
  }, [auth.user]);

  return {
    ...auth,
    isSessionChecked,
    forceRefreshTrigger,
    // Add a manual trigger to force session refresh
    triggerSessionRefresh: () => {
      setIsSessionChecked(false);
      setForceRefreshTrigger(prev => prev + 1);
    }
  };
};
