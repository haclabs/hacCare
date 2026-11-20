import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import { getMfaRequirement, mfaEnrollmentCopy } from '../../lib/security/mfaPolicy';
import { MFAEnrollment } from './MFAEnrollment';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * Blocks the app for users whose 2FA grace period is over and who still have no
 * verified factor. The login form handles this too, but Microsoft sign-in and
 * restored sessions reach /app without passing through it.
 */
export const MfaRequirementGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const requirement = getMfaRequirement(profile);
  const sessionHasFactor = user?.factors?.some(f => f.status === 'verified') ?? false;
  const mustCheck = requirement.status === 'required' && !sessionHasFactor;
  const [factorCheck, setFactorCheck] = useState<'pending' | 'enrolled' | 'missing'>('pending');

  useEffect(() => {
    if (!mustCheck) return;
    let cancelled = false;
    // The session's user can be stale (factor added on another device), so confirm with the server.
    supabase.auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (error) throw error;
        const enrolled = data.all.some(f => f.status === 'verified');
        if (!cancelled) setFactorCheck(enrolled ? 'enrolled' : 'missing');
      })
      .catch((err) => {
        secureLogger.error('Could not list MFA factors, requiring enrollment:', err);
        if (!cancelled) setFactorCheck('missing');
      });
    return () => { cancelled = true; };
  }, [mustCheck, user?.id]);

  if (!mustCheck || factorCheck === 'enrolled') return <>{children}</>;

  if (factorCheck === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <MFAEnrollment
        onSuccess={() => window.location.reload()}
        onCancel={signOut}
        {...mfaEnrollmentCopy(requirement)}
      />
    </div>
  );
};
