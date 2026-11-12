import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { secureLogger } from '../../lib/security/secureLogger';
import { getIdlePhase, getIdleTimeoutMs, type IdlePhase } from '../../lib/security/idleTimeout';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

/**
 * Signs the user out after a period of inactivity, with a countdown warning first.
 * Renders nothing until the warning phase, so it can sit at the root of the app
 * without re-rendering anything else.
 */
export const IdleLogout: React.FC = () => {
  const { user, profile, isAnonymous, signOut } = useAuth();
  const enabled = !!user && !isAnonymous;
  const timeoutMs = getIdleTimeoutMs(profile?.role);

  const [phase, setPhase] = useState<IdlePhase>('active');
  const [remainingMs, setRemainingMs] = useState(0);
  const lastActivity = useRef(0);
  const phaseRef = useRef<IdlePhase>('active');
  const signOutRef = useRef(signOut);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  useEffect(() => {
    if (!enabled) return;

    lastActivity.current = Date.now();
    phaseRef.current = 'active';
    let signingOut = false;

    // Once the warning is up, only the button keeps the session alive, so a
    // stray mouse nudge doesn't silently dismiss it.
    const onActivity = () => {
      if (phaseRef.current === 'active') lastActivity.current = Date.now();
    };

    const check = () => {
      const idleMs = Date.now() - lastActivity.current;
      const next = getIdlePhase(idleMs, timeoutMs);
      phaseRef.current = next;
      setPhase(next);
      if (next === 'warning') setRemainingMs(timeoutMs - idleMs);

      if (next === 'expired' && !signingOut) {
        signingOut = true;
        secureLogger.debug('⏱️ Signing out after inactivity');
        signOutRef.current().finally(() => {
          window.location.href = '/login?reason=idle';
        });
      }
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    // Timers are throttled in background tabs and stop while a device sleeps, so
    // re-check as soon as the tab is visible again.
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs]);

  if (!enabled || phase !== 'warning') return null;

  const staySignedIn = () => {
    lastActivity.current = Date.now();
    phaseRef.current = 'active';
    setPhase('active');
  };

  const seconds = Math.ceil(remainingMs / 1000);
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-logout-title">
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 id="idle-logout-title" className="text-lg font-semibold text-gray-900 dark:text-white">Still there?</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          You'll be signed out in <span className="font-semibold tabular-nums">{countdown}</span> because there
          hasn't been any activity. Unsaved changes will be lost.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => signOutRef.current().finally(() => { window.location.href = '/login'; })}
            className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Sign out now
          </button>
          <button
            type="button"
            autoFocus
            onClick={staySignedIn}
            className="px-4 py-2 bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg text-sm"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
};
