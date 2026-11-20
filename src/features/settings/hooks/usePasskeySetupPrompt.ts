import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { isWelcomeTourRole } from '../../../hooks/useWelcomeModal';
import { supabase } from '../../../lib/api/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';
import { browserSupportsPasskeys } from '../../../utils/passkeyErrors';

// Per user, so a shared workstation still prompts the next instructor who signs in.
const neverKey = (userId: string) => `haccare-passkey-prompt-never:${userId}`;
const notNowKey = (userId: string) => `haccare-passkey-prompt-not-now:${userId}`;

/**
 * Offers instructors and above a passkey after sign-in when they have none.
 * "Not now" lasts for this browser session (it returns at the next login);
 * "Don't ask again" is remembered on this browser.
 */
export function usePasskeySetupPrompt() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const eligible = isWelcomeTourRole(profile) && browserSupportsPasskeys();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!eligible || !userId) return;
    if (localStorage.getItem(neverKey(userId)) || sessionStorage.getItem(notNowKey(userId))) return;

    let cancelled = false;
    supabase.auth.passkey
      .list()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!cancelled && (data ?? []).length === 0) setIsOpen(true);
      })
      .catch((err) => secureLogger.warn('Could not check for existing passkeys:', err));

    return () => {
      cancelled = true;
    };
  }, [eligible, userId]);

  const notNow = useCallback(() => {
    if (userId) sessionStorage.setItem(notNowKey(userId), 'true');
    setIsOpen(false);
  }, [userId]);

  const neverAsk = useCallback(() => {
    if (userId) localStorage.setItem(neverKey(userId), 'true');
    setIsOpen(false);
  }, [userId]);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, notNow, neverAsk, close };
}
