import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import { getMfaRequirement, mfaEnrollmentCopy, mfaGateStep } from '../../lib/security/mfaPolicy';
import { MFAChallenge } from './MFAChallenge';
import { MFAEnrollment } from './MFAEnrollment';
import LoadingSpinner from '../UI/LoadingSpinner';

type GateState = 'checking' | 'allow' | 'challenge' | 'enroll';

/**
 * Applies the 2FA rules on /app, not just on /login: a password session that never
 * entered its code (e.g. by typing /app after the password step) gets the code
 * screen, and a user whose grace period is over with no factor must enroll.
 * Microsoft sign-in and restored sessions also reach /app this way.
 */
export const MfaRequirementGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const requirement = getMfaRequirement(profile);
  // A result only counts for the user and requirement it was computed for.
  const checkKey = `${user?.id}:${requirement.status}`;
  const [result, setResult] = useState<{ key: string; state: GateState } | null>(null);
  const state: GateState = result?.key === checkKey ? result.state : 'checking';

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;

      const step = mfaGateStep(aal, requirement);
      if (step !== 'check-factors') return step;

      // The session's user can be stale (factor added on another device), so confirm with the server.
      try {
        const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        return data.all.some(f => f.status === 'verified') ? 'challenge' : 'enroll';
      } catch (err) {
        secureLogger.error('Could not list MFA factors, requiring enrollment:', err);
        return 'enroll';
      }
    };

    check()
      .then((next) => { if (!cancelled) setResult({ key: checkKey, state: next }); })
      .catch(async (err) => {
        // Fail closed, as the login form does
        secureLogger.error('MFA assurance check failed, signing out:', err);
        if (!cancelled) await signOut();
      });

    return () => { cancelled = true; };
  }, [checkKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'allow') return <>{children}</>;

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {state === 'challenge' ? (
        <MFAChallenge onSuccess={() => window.location.reload()} onCancel={signOut} />
      ) : (
        <MFAEnrollment
          onSuccess={() => window.location.reload()}
          onCancel={signOut}
          {...mfaEnrollmentCopy(requirement)}
        />
      )}
    </div>
  );
};
