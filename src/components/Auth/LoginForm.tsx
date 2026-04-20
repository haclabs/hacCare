import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { parseAuthError } from '../../utils/authErrorParser';
import { isSupabaseConfigured, supabase } from '../../lib/api/supabase';
import logo from '../../images/logo.png';
import { secureLogger } from '../../lib/security/secureLogger';
import { PrivacyNoticeModal } from './PrivacyNoticeModal';
import { MFAChallenge } from './MFAChallenge';
import { MFAEnrollment } from './MFAEnrollment';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [mfaMode, setMfaMode] = useState<'challenge' | 'enroll' | null>(null);
  const mfaChecked = useRef(false);
  const { signIn, signOut, user, profile } = useAuth();

  const doRedirect = () => {
    if (profile?.simulation_only) {
      secureLogger.debug('🎯 Simulation-only user detected, redirecting to lobby...');
      localStorage.removeItem('current_simulation_tenant');
      setTimeout(() => {
        window.location.href = '/app/simulation-portal';
      }, 100);
    } else {
      secureLogger.debug('🎯 Regular user detected, redirecting to app...');
      setTimeout(() => {
        window.location.href = '/app';
      }, 100);
    }
  };

  // Redirect based on user type after login, with MFA gate for super_admin
  useEffect(() => {
    if (!user || !profile) return;
    if (mfaChecked.current) return;
    mfaChecked.current = true;

    if (profile.role !== 'super_admin') {
      doRedirect();
      return;
    }

    // Super admin: check MFA assurance level before allowing redirect
    const checkMFA = async () => {
      try {
        const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) throw aalError;

        if (data.currentLevel === 'aal2') {
          // Already fully verified (e.g., session restored)
          secureLogger.debug('✅ Super admin already at AAL2, proceeding');
          doRedirect();
        } else if (data.nextLevel === 'aal2') {
          // Has enrolled factors but hasn't verified this session
          secureLogger.debug('🔐 Super admin has MFA enrolled — showing challenge');
          setMfaMode('challenge');
        } else {
          // No factors enrolled yet — force enrollment
          secureLogger.debug('🔐 Super admin has no MFA factors — showing enrollment');
          setMfaMode('enroll');
        }
      } catch (err: any) {
        secureLogger.error('MFA AAL check failed, allowing login:', err);
        // Fail open rather than locking out the admin
        doRedirect();
      }
    };

    checkMFA();
  }, [user, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMFASuccess = () => {
    setMfaMode(null);
    doRedirect();
  };

  const handleMFACancel = async () => {
    setMfaMode(null);
    mfaChecked.current = false;
    await signOut();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError('Database connection not configured. Please set up Supabase.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      secureLogger.debug('🔐 Attempting to sign in user...');
      const { error } = await signIn(email, password);
      
      if (error) {
        secureLogger.error('❌ Sign in error:', error);
        setError(parseAuthError(error));
        setLoading(false); // Only set loading to false on error
      } else {
        secureLogger.debug('✅ Sign in successful, useEffect will handle redirect based on user type...');
        // Navigation handled by useEffect above based on simulation_only flag
      }
    } catch (error: unknown) {
      secureLogger.error('Login error:', error);
      setError(parseAuthError(error));
      setLoading(false); // Only set loading to false on error
    }
    // Removed finally block - let AuthContext manage loading state on success
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          {/* HacCare Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="HacCare Logo" 
              className="h-25 w-auto"
              style={{ height: '100px' }}
            />
          </div>
          <p className="text-gray-500 text-sm">Secure Portal Access</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 text-sm font-medium">Database Not Connected</p>
                <p className="text-yellow-700 text-xs mt-1">
                  Please click "Connect to Supabase" in the top right to set up the database connection.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isSupabaseConfigured}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!isSupabaseConfigured}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || oauthLoading || !isSupabaseConfigured}
            className="w-full text-white py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#19ADF2' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1598D6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19ADF2'}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 mb-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Microsoft Sign In Button */}
        <button
          onClick={handleMicrosoftSignIn}
          disabled={loading || oauthLoading || !isSupabaseConfigured}
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Security Recommendations</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Use a strong, unique password</li>
            <li>• Enable multi-factor authentication when available</li>
            <li>• Never share your login credentials</li>
            <li>• Log out when using shared devices</li>
          </ul>
        </div>

        {/* Privacy Notice link */}
        <p className="mt-4 text-center text-xs text-gray-400">
          By signing in you acknowledge our{' '}
          <button
            type="button"
            onClick={() => setShowPrivacyNotice(true)}
            className="text-blue-500 hover:underline"
          >
            Privacy Notice
          </button>
        </p>
      </div>

      {showPrivacyNotice && (
        <PrivacyNoticeModal onClose={() => setShowPrivacyNotice(false)} />
      )}

      {mfaMode === 'challenge' && (
        <MFAChallenge onSuccess={handleMFASuccess} onCancel={handleMFACancel} />
      )}

      {mfaMode === 'enroll' && (
        <MFAEnrollment onSuccess={handleMFASuccess} onCancel={handleMFACancel} />
      )}
    </div>
  );
};