import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

/**
 * OAuth Callback Handler
 * Handles the redirect from Microsoft OAuth login
 */
export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        secureLogger.debug('🔄 Processing OAuth callback...');
        
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          secureLogger.error('❌ OAuth callback error:', error);
          navigate('/login?error=oauth_failed');
          return;
        }

        if (data.session) {
          secureLogger.debug('✅ OAuth session established:', data.session.user.email);
          // The AuthContext will handle the rest, redirect to app
          navigate('/app');
        } else {
          secureLogger.warn('⚠️ No session found in callback');
          navigate('/login?error=no_session');
        }
      } catch (error) {
        secureLogger.error('❌ Unexpected error in OAuth callback:', error);
        navigate('/login?error=unexpected');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Sign In...</h2>
        <p className="text-gray-600">Please wait while we finish signing you in.</p>
      </div>
    </div>
  );
};
