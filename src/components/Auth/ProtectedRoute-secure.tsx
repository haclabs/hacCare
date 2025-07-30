import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import LoadingSpinner from '../UI/LoadingSpinner';
import { isSupabaseConfigured } from '../../lib/supabase';
import { parseAuthError } from '../../utils/authErrorParser';
import { User, AlertCircle, CheckCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = []
}) => {
  const { user, profile, loading, hasRole, createProfile, signOut } = useAuth();
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    // Security: Log auth state for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ ProtectedRoute - Auth state:', { 
        hasUser: !!user, 
        hasProfile: !!profile,
        userRole: profile?.role,
        requiredRoles,
        isSupabaseConfigured,
        loading
      });
    }
  }, [user, profile, requiredRoles, loading]);

  // Security: Show loading only briefly during initialization
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">
            Initializing secure session...
          </p>
        </div>
      </div>
    );
  }

  // Security: If Supabase is not configured, show login with warning
  if (!isSupabaseConfigured) {
    return <LoginForm />;
  }

  // Security: If no user, show login
  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ ProtectedRoute - No user found, showing login');
    }
    return <LoginForm />;
  }

  // Security: If user exists but no profile, show secure profile creation
  if (user && !profile) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ User exists but no profile found');
    }
    
    const handleCreateProfile = async () => {
      setCreatingProfile(true);
      setProfileError('');
      
      try {
        await createProfile();
      } catch (error: any) {
        console.error('Failed to create profile:', error);
        setProfileError(parseAuthError(error));
      } finally {
        setCreatingProfile(false);
      }
    };

    const handleSignOut = async () => {
      await signOut();
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center">
                <div className="text-left">
                  <h1 className="text-3xl font-bold text-gray-800 leading-none">
                    haccare
                  </h1>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    patient record system
                  </p>
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Secure Profile Setup</h1>
            <p className="text-gray-600 mt-2">Complete your profile to continue</p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <p className="text-blue-800 text-sm font-medium">Account Verified</p>
              </div>
              <p className="text-blue-700 text-sm">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Setting up your secure hospital profile...
              </p>
            </div>

            {profileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 text-sm font-medium">Profile Setup Failed</p>
                </div>
                <p className="text-red-700 text-sm mt-1">{profileError}</p>
              </div>
            )}

            <button
              onClick={handleCreateProfile}
              disabled={creatingProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {creatingProfile ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Profile...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Create Hospital Profile</span>
                </div>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Security: Check role permissions if required
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have the required permissions to access this page.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>Required roles:</strong> {requiredRoles.join(', ')}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Your role:</strong> {profile?.role || 'None'}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Security: All checks passed - render the protected content
  return <>{children}</>;
};
