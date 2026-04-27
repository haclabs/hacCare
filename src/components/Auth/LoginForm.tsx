import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Shield, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { parseAuthError } from '../../utils/authErrorParser';
import { isSupabaseConfigured, supabase } from '../../lib/api/supabase';
const logo = '/images/logo.svg';
import { secureLogger } from '../../lib/security/secureLogger';
import { PrivacyNoticeModal } from './PrivacyNoticeModal';
import { MFAChallenge } from './MFAChallenge';
import { MFAEnrollment } from './MFAEnrollment';

const doRedirect = (simulationOnly?: boolean) => {
  if (simulationOnly) {
    localStorage.removeItem('current_simulation_tenant');
    window.location.href = '/app/simulation-portal';
  } else {
    window.location.href = '/app';
  }
};

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [mfaMode, setMfaMode] = useState<'challenge' | 'enroll' | null>(null);
  // Access token stored so MFAChallenge can call listFactors/challenge via
  // direct fetch (no Supabase lock) to avoid contention with TenantContext.
  const [mfaAccessToken, setMfaAccessToken] = useState<string | undefined>(undefined);
  // Tracks whether a form submit is in progress. Prevents the useEffect below
  // from firing checkRestoredSession() concurrently with handleSubmit's own AAL
  // check — two simultaneous getAuthenticatorAssuranceLevel() calls contend on
  // Supabase's internal _useSession lock and cause an indefinite hang.
  const submitActiveRef = React.useRef(false);
  const navigate = useNavigate();
  const { signIn, signOut, user, profile } = useAuth();

  // Redirect effect — covers two cases:
  // 1. Non-super_admin: redirect immediately once user+profile are available
  //    (OAuth sign-in or restored session — handleSubmit handles the direct path).
  // 2. Super_admin with a RESTORED session (page reload / INITIAL_SESSION):
  //    handleSubmit won't have been called, so we still need to gate on MFA here.
  //
  // IMPORTANT: submitActiveRef guards against this effect firing while handleSubmit
  // is already executing the AAL check — that would create two concurrent
  // getAuthenticatorAssuranceLevel() calls and hang due to _useSession lock.
  useEffect(() => {
    if (!user || !profile) return;
    if (mfaMode !== null) return; // MFA modal already open
    if (submitActiveRef.current) return; // handleSubmit is driving the MFA flow

    if (profile.role !== 'super_admin') {
      doRedirect(profile.simulation_only ?? undefined);
      return;
    }

    // Super admin with a restored session — check AAL level now.
    const checkRestoredSession = async () => {
      try {
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) throw aalError;

        if (aal.currentLevel === 'aal2') {
          secureLogger.debug('✅ Restored super admin session already at AAL2 — redirecting');
          doRedirect(profile.simulation_only ?? undefined);
        } else if (aal.nextLevel === 'aal2') {
          secureLogger.debug('🔐 Restored super admin session needs MFA challenge');
          setMfaMode('challenge');
        } else {
          secureLogger.debug('🔐 Restored super admin session — no factor enrolled, showing enrollment');
          setMfaMode('enroll');
        }
      } catch (err: unknown) {
        secureLogger.error('AAL check on restored session failed, signing out:', err);
        await signOut();
      }
    };

    checkRestoredSession();
  }, [user?.id, profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMFASuccess = () => {
    submitActiveRef.current = false;
    setMfaMode(null);
    window.location.href = '/app';
  };

  const handleMFACancel = async () => {
    submitActiveRef.current = false;
    setMfaMode(null);
    await signOut();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setError('Database connection not configured. Please set up Supabase.');
      return;
    }

    // Mark a form submit as active so the useEffect above won't fire
    // checkRestoredSession() concurrently with our own AAL check below.
    submitActiveRef.current = true;

    setError('');
    setLoading(true);

    try {
      secureLogger.debug('🔐 Attempting to sign in user...');
      const { error: signInError, profile: signedInProfile, accessToken } = await signIn(email, password);

      if (signInError) {
        secureLogger.error('❌ Sign in error:', signInError);
        setError(parseAuthError(signInError));
        submitActiveRef.current = false;
        setLoading(false);
        return;
      }

      // Non-super_admin: redirect immediately — no MFA required
      if (!signedInProfile || signedInProfile.role !== 'super_admin') {
        secureLogger.debug('✅ Non-admin sign in, redirecting...');
        doRedirect(signedInProfile?.simulation_only ?? undefined);
        return;
      }

      // Super admin: check MFA using the access_token directly to bypass getSession() → _acquireLock.
      // Passing the token makes getAuthenticatorAssuranceLevel() decode the JWT synchronously
      // instead of calling getSession() which contends with any concurrent background lock acquisition.
      secureLogger.debug('🔐 Super admin — checking MFA assurance level...');
      try {
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
        if (aalError) throw aalError;

        if (aal.currentLevel === 'aal2') {
          secureLogger.debug('✅ Super admin already at AAL2');
          doRedirect(signedInProfile.simulation_only ?? undefined);
        } else if (aal.nextLevel === 'aal2') {
          secureLogger.debug('🔐 Showing MFA challenge');
          setMfaAccessToken(accessToken);
          setLoading(false);
          setMfaMode('challenge');
        } else {
          secureLogger.debug('🔐 No factors enrolled — showing enrollment');
          setLoading(false);
          setMfaMode('enroll');
        }
      } catch (aalErr: unknown) {
        // Fail CLOSED — sign out rather than silently letting the admin through
        secureLogger.error('MFA AAL check failed, signing out for safety:', aalErr);
        submitActiveRef.current = false;
        setLoading(false);
        await signOut();
      }
    } catch (err: unknown) {
      secureLogger.error('Login error:', err);
      setError(parseAuthError(err));
      submitActiveRef.current = false;
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!isSupabaseConfigured) {
      setError('Database connection not configured. Please set up Supabase.');
      return;
    }

    setError('');
    setOauthLoading(true);

    try {
      secureLogger.debug('🔐 Initiating Microsoft OAuth sign in...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid',
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        secureLogger.error('❌ Microsoft OAuth error:', error);
        setError(parseAuthError(error));
        setOauthLoading(false);
      }
      // If successful, user will be redirected to Microsoft login
    } catch (error: unknown) {
      secureLogger.error('Microsoft OAuth error:', error);
      setError(parseAuthError(error));
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Back to home breadcrumb */}
      <div className="w-full max-w-md mb-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="bg-white rounded-2xl px-10 py-5 shadow-[0_0_40px_rgba(25,173,242,0.2)]">
              <img
                src={logo}
                alt="hacCare"
                className="w-auto"
                style={{ height: '90px' }}
              />
            </div>
          </div>
          <p className="text-slate-400 text-sm">Secure Portal Access</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-300 text-sm font-medium">Database Not Connected</p>
                <p className="text-amber-400/70 text-xs mt-1">
                  Please click "Connect to Supabase" in the top right to set up the database connection.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isSupabaseConfigured}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!isSupabaseConfigured}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!isSupabaseConfigured}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || oauthLoading || !isSupabaseConfigured}
            className="w-full text-white py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#19ADF2' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1598D6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 mb-6 flex items-center">
          <div className="flex-1 border-t border-slate-700"></div>
          <span className="px-4 text-sm text-slate-500">or</span>
          <div className="flex-1 border-t border-slate-700"></div>
        </div>

        {/* Microsoft Sign In Button */}
        <button
          onClick={handleMicrosoftSignIn}
          disabled={loading || oauthLoading || !isSupabaseConfigured}
          className="w-full bg-slate-800 border border-slate-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-700 hover:border-slate-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          <span>{oauthLoading ? 'Redirecting...' : 'Sign in with Microsoft'}</span>
        </button>

        {/* Security Notice */}
        <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">Security Recommendations</h3>
          </div>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Use a strong, unique password</li>
            <li>• Enable multi-factor authentication when available</li>
            <li>• Never share your login credentials</li>
            <li>• Log out when using shared devices</li>
          </ul>
        </div>

        {/* Privacy Notice link */}
        <p className="mt-4 text-center text-xs text-slate-500">
          By signing in you acknowledge our{' '}
          <button
            type="button"
            onClick={() => setShowPrivacyNotice(true)}
            className="text-cyan-400 hover:underline"
          >
            Privacy Notice
          </button>
        </p>
      </div>

      {showPrivacyNotice && (
        <PrivacyNoticeModal onClose={() => setShowPrivacyNotice(false)} />
      )}

      {mfaMode === 'challenge' && (
        <MFAChallenge
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
          accessToken={mfaAccessToken}
        />
      )}

      {mfaMode === 'enroll' && (
        <MFAEnrollment onSuccess={handleMFASuccess} onCancel={handleMFACancel} />
      )}
    </div>
  );
};