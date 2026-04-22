import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

interface MFAChallengeProps {
  onSuccess: () => void;
  onCancel: () => void;
  /**
   * Access token from the fresh login session. When provided, listFactors and
   * challenge are called via direct fetch (no Supabase _acquireLock), avoiding
   * contention with TenantContext queries that fire at the same moment.
   */
  accessToken?: string;
}

export const MFAChallenge: React.FC<MFAChallengeProps> = ({ onSuccess, onCancel, accessToken }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);
  // Guard against React StrictMode double-invoking the effect (would create two
  // challenges for the same factor; only the last one is valid causing verify to fail).
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const initChallenge = async () => {
      try {
        let totpFactorId: string | null = null;

        if (accessToken) {
          // Use direct fetch with the access token so we never acquire
          // Supabase's _acquireLock. This avoids the race with TenantContext
          // which fires supabase.rpc() (via getSession → _acquireLock) at the
          // same moment this component mounts after a fresh login.
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const headers = {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          };

          // listFactors() internally calls getUser() which returns user.factors.
          // Replicate that with a direct fetch to avoid the lock.
          const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers });
          if (!userRes.ok) throw new Error(`Failed to get user: ${userRes.status}`);
          const userData: { factors?: Array<{ id: string; factor_type: string; status: string }> } =
            await userRes.json();

          const totpFactor = (userData.factors ?? []).find(
            (f) => f.factor_type === 'totp' && f.status === 'verified'
          );
          if (!totpFactor) {
            setError('No verified authenticator found. Please contact your administrator.');
            return;
          }
          totpFactorId = totpFactor.id;
          setFactorId(totpFactorId);

          const challengeRes = await fetch(
            `${supabaseUrl}/auth/v1/factors/${totpFactorId}/challenge`,
            { method: 'POST', headers, body: JSON.stringify({}) }
          );
          if (!challengeRes.ok) throw new Error(`Failed to create challenge: ${challengeRes.status}`);
          const challengeData: { id: string } = await challengeRes.json();
          setChallengeId(challengeData.id);
        } else {
          // Fallback: restored session path (no fresh token available) — use Supabase client.
          const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
          if (listError) throw listError;

          const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
          if (!totpFactor) {
            setError('No verified authenticator found. Please contact your administrator.');
            return;
          }
          totpFactorId = totpFactor.id;
          setFactorId(totpFactorId);

          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: totpFactorId,
          });
          if (challengeError) throw challengeError;
          setChallengeId(challenge.id);
        }
      } catch (err: unknown) {
        secureLogger.error('MFA challenge init failed:', err);
        const msg = err instanceof Error ? err.message : 'Failed to start authentication challenge.';
        setError(msg);
      } finally {
        setInitialising(false);
      }
    };

    initChallenge();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId) return;

    setError('');
    setLoading(true);

    if (accessToken) {
      // Direct fetch — bypasses supabase.auth.mfa.verify() → _acquireLock entirely.
      // TenantContext is still running Supabase queries (which hold the lock) at this
      // point on a fresh login. Using the Supabase client here would block until
      // TenantContext's queries finish (same race that caused all the earlier hangs).
      // After verify succeeds, we write the returned AAL2 session directly to
      // localStorage using Supabase's own storage key so the client reads it on redirect.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/factors/${factorId}/verify`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ challenge_id: challengeId, code }),
        });

        if (!res.ok) {
          secureLogger.warn('MFA verify failed:', res.status);
          setError('Invalid code. Please try again.');
          setCode('');
          setLoading(false);
          return;
        }

        const session = await res.json();
        // Persist the AAL2 session so Supabase reads it correctly on next page load.
        // Mirrors what GoTrueClient._saveSession does: add expires_at then store as JSON.
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        const sessionToStore = {
          ...session,
          expires_at: Math.round(Date.now() / 1000) + session.expires_in,
        };
        localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(sessionToStore));

        secureLogger.debug('✅ MFA verified via direct fetch — session upgraded to AAL2');
        onSuccess();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Verification failed.';
        setError(msg);
        setLoading(false);
      }
      return;
    }

    // Fallback: restored-session path (no fresh accessToken) — Supabase client.
    // TenantContext has already finished loading in this case so no lock contention.
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (verifyError) {
      secureLogger.warn('MFA verify failed:', verifyError.message);
      setError('Invalid code. Please try again.');
      setCode('');
      setLoading(false);
    } else {
      secureLogger.debug('✅ MFA verified — session upgraded to AAL2');
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-gray-500 text-sm mt-2">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>

        {initialising ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6 || !factorId}
              className="w-full text-white py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#19ADF2' }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        <button
          onClick={onCancel}
          className="w-full mt-4 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          Sign out and return to login
        </button>
      </div>
    </div>
  );
};
