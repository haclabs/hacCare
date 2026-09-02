import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/api/supabase';
import { secureLogger } from '../lib/security/secureLogger';

const WELCOME_ROLES = ['instructor', 'coordinator', 'admin', 'super_admin'];

/** Lets the "Replay welcome tour" button reach the modal mounted up in App. */
export const OPEN_WELCOME_TOUR_EVENT = 'open-welcome-tour';

/**
 * Controls the first-login welcome tour.
 *
 * "Skip for now" only closes it locally, so it returns on the next login;
 * only the final "don't show again" writes `welcome_seen_at`.
 */
export function useWelcomeModal() {
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  const eligible =
    !!profile &&
    profile.simulation_only !== true &&
    WELCOME_ROLES.includes(profile.role) &&
    !profile.welcome_seen_at;

  const isOpen = forceOpen || (eligible && !dismissed && !skipped);

  useEffect(() => {
    const handleOpen = () => setForceOpen(true);
    window.addEventListener(OPEN_WELCOME_TOUR_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_WELCOME_TOUR_EVENT, handleOpen);
  }, []);

  const skip = useCallback(() => {
    setForceOpen(false);
    setSkipped(true);
  }, []);

  const dismissForever = useCallback(async () => {
    setForceOpen(false);
    setDismissed(true);
    const { error } = await supabase.rpc('mark_welcome_seen');
    if (error) {
      secureLogger.error('Failed to record welcome tour dismissal', error);
    }
  }, []);

  return { isOpen, skip, dismissForever };
}
