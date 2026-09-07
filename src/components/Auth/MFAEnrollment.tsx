import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

interface MFAEnrollmentProps {
  onSuccess: () => void;
  onCancel: () => void;
  /** Override the modal's description text (defaults to the forced-enrollment copy). */
  description?: string;
  /** Override the cancel button label (defaults to "Sign out and return to login"). */
  cancelLabel?: string;
}

export const MFAEnrollment: React.FC<MFAEnrollmentProps> = ({ onSuccess, onCancel, description, cancelLabel }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  // Guard against React StrictMode double-invoking the effect, which would create
  // two enroll() calls back-to-back and trigger mfa_factor_name_conflict on the second.
  const hasStartedRef = useRef(false);

  /**
   * Attempts to enroll a new TOTP factor.
   * If a stale unverified factor already exists (mfa_factor_name_conflict), it is
   * unenrolled first and then enrollment is retried once.
   */
  const attemptEnroll = async () => {
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (!enrollError) return data;

    if (enrollError.code === 'mfa_factor_name_conflict') {
      secureLogger.warn('Stale unverified MFA factor detected — unenrolling and retrying...');

      // Find and remove the conflicting unverified factor
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = factors?.totp?.find((f) => f.status !== 'verified');
      if (stale) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      // Retry enrollment with a clean slate
      const { data: retryData, error: retryError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (retryError) throw retryError;
      return retryData;
    }

    throw enrollError;
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startEnrollment = async () => {
      try {
        let enrollData = await attemptEnroll();

        setFactorId(enrollData.id);
        setQrCode(enrollData.totp.qr_code);
        setSecret(enrollData.totp.secret);
      } catch (err: any) {
        secureLogger.error('MFA enroll init failed:', err);
        setError(err.message ?? 'Failed to start MFA enrollment. Please try again.');
      } finally {
        setInitialising(false);
      }
    };

    startEnrollment();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setError('');
    setLoading(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      secureLogger.warn('MFA enrollment verify failed:', verifyError.message);
      setError('Invalid code. Please try again.');
      setCode('');
      setLoading(false);
    } else {
      secureLogger.debug('✅ MFA enrolled and verified — session upgraded to AAL2');
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(63,191,154,0.15)' }}>
              <Shield className="h-8 w-8" style={{ color: '#3fbf9a' }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Set Up Two-Factor Authentication</h2>
          <p className="text-slate-400 text-sm mt-2">
            {description ?? 'Scan the QR code with an authenticator app such as Google Authenticator or Authy, then enter the code to confirm.'}
          </p>
        </div>

        {initialising ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#3fbf9a' }} />
          </div>
        ) : (
          <>
            {qrCode && (
              <div className="flex flex-col items-center mb-6">
                <div
                  className="p-3 bg-white border border-slate-700 rounded-lg"
                  /* qr_code is an SVG string generated by Supabase — safe to embed */
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
                {secret && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Or enter this setup key manually:</p>
                    <code className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded break-all select-all">
                      {secret}
                    </code>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="enroll-code"
                  className="block text-sm font-medium text-slate-400 mb-2"
                >
                  Verification Code
                </label>
                <input
                  id="enroll-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#3fbf9a] focus:ring-1 focus:ring-[#3fbf9a] transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6 || !factorId}
                className="w-full text-white py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#3fbf9a] focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3fbf9a' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#35a687')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3fbf9a'}
              >
                {loading ? 'Enabling 2FA…' : 'Enable Two-Factor Authentication'}
              </button>
            </form>
          </>
        )}

        <button
          onClick={onCancel}
          className="w-full mt-4 text-slate-400 text-sm hover:text-slate-200 transition-colors"
        >
          {cancelLabel ?? 'Sign out and return to login'}
        </button>
      </div>
    </div>
  );
};
