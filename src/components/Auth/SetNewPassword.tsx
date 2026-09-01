import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '../../lib/api/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';
import { parseAuthError } from '../../utils/authErrorParser';
import { secureLogger } from '../../lib/security/secureLogger';
import { HacCareLogo } from '../Layout/HacCareLogo';

const MIN_PASSWORD_LENGTH = 8;

function getPasswordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one symbol';
  }
  return null;
}

/**
 * Landing page for invite/recovery links - lets a new or reset user pick a
 * password.
 *
 * The email link only carries a `token_hash` + `type` (not Supabase's
 * self-consuming verify URL) - email security scanners prefetch links, which
 * would otherwise burn the one-time token before the recipient ever clicks
 * it. We only redeem the token via `verifyOtp()` on an explicit button click.
 */
export const SetNewPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type') as EmailOtpType | null;

  const [checkingSession, setCheckingSession] = useState(!(tokenHash && otpType));
  const [hasSession, setHasSession] = useState(false);
  const [activating, setActivating] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // A token in the URL means the user still needs to click "Activate" -
    // don't auto-redeem it (checkingSession already initialized to false above).
    if (tokenHash && otpType) return;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setCheckingSession(false);
    };
    checkSession();
  }, [tokenHash, otpType]);

  const handleActivate = async () => {
    if (!tokenHash || !otpType) return;
    setError('');
    setActivating(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (verifyError) {
        setError(parseAuthError(verifyError));
        return;
      }
      setHasSession(true);
    } catch (err: any) {
      secureLogger.error('Error activating invite', err);
      setError(parseAuthError(err));
    } finally {
      setActivating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(parseAuthError(updateError));
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/app'), 1500);
    } catch (err: any) {
      secureLogger.error('Error setting password', err);
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!hasSession && tokenHash && otpType) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-5">
            <HacCareLogo variant="dark" size="38px" withBar />
          </div>
          <Mail className="h-10 w-10 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to hacCare</h2>
          <p className="text-slate-400 mb-6">
            Click below to activate your account and set your password.
          </p>
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4 text-left flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full text-white py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#19ADF2' }}
            onMouseEnter={(e) => !activating && (e.currentTarget.style.backgroundColor = '#1598D6')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
          >
            {activating ? 'Activating...' : 'Activate Account'}
          </button>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Invite link invalid or expired</h2>
          <p className="text-slate-400 mb-6">
            Please ask your administrator to resend the invitation email.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <HacCareLogo variant="dark" size="38px" withBar />
          </div>
          <p className="text-slate-400 text-sm">Set a password to finish creating your account</p>
        </div>

        {success ? (
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-green-300 text-sm">Password set! Redirecting you into hacCare...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters, 1 uppercase, 1 symbol`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#19ADF2' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1598D6')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
            >
              {loading ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
