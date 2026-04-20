import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

interface MFAChallengeProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const MFAChallenge: React.FC<MFAChallengeProps> = ({ onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const initChallenge = async () => {
      try {
        const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) throw listError;

        const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
        if (!totpFactor) {
          setError('No verified authenticator found. Please contact your administrator.');
          return;
        }

        setFactorId(totpFactor.id);

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id,
        });
        if (challengeError) throw challengeError;
        setChallengeId(challenge.id);
      } catch (err: any) {
        secureLogger.error('MFA challenge init failed:', err);
        setError(err.message ?? 'Failed to start authentication challenge.');
      } finally {
        setInitialising(false);
      }
    };

    initChallenge();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId) return;

    setError('');
    setLoading(true);

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
