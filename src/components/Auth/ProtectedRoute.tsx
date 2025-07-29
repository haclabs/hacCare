import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import LoadingSpinner from '../UI/LoadingSpinner';
import { OfflineMode } from '../OfflineMode';
import { isSupabaseConfigured } from '../../lib/supabase';
import { parseAuthError } from '../../utils/authErrorParser';
import { forceSessionCheck } from '../../lib/directAuthFix';
import { User, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [],
  redirectTo
}) => {
  const { user, profile, loading, hasRole, createProfile, signOut, isOffline } = useAuth();
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  useEffect(() => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('ProtectedRoute - Auth state:', { 
        hasUser: !!user, 
        hasProfile: !!profile,
        userRole: profile?.role,
        requiredRoles,
        isSupabaseConfigured,
        sessionCheckComplete,
        loading
      });
    }
  }, [user, profile, requiredRoles, sessionCheckComplete, loading]);

  // Enhanced session check when no user is found
  useEffect(() => {
    let mounted = true;

    const performEnhancedSessionCheck = async () => {
      // Only perform additional check if:
      // 1. Auth context is not loading
      // 2. No user is found
      // 3. Session check hasn't been completed yet
      // 4. Not already checking
      if (loading || user || sessionCheckComplete || isCheckingSession) {
        return;
      }

      setIsCheckingSession(true);

      try {
        const sessionFound = await forceSessionCheck();
        
        if (mounted) {
          setSessionCheckComplete(true);
          
          if (sessionFound) {
            // Give AuthContext a moment to update
            setTimeout(() => {
              if (mounted && !user) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('Session found but user context not updated');
                }
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Enhanced session check failed:', error);
        if (mounted) {
          setSessionCheckComplete(true);
        }
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    };

    performEnhancedSessionCheck();

    return () => {
      mounted = false;
    };
  }, [loading, user, sessionCheckComplete, isCheckingSession]);

  // Mark session check complete if user is found
  useEffect(() => {
    if (user && !sessionCheckComplete) {
      setSessionCheckComplete(true);
    }
  }, [user, sessionCheckComplete]);

  // Show loading spinner while auth is initializing OR while checking session
  if (loading || isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">
            {loading ? 'Initializing authentication...' : 'Checking session...'}
          </p>
        </div>
      </div>
    );
  }

  // Show offline mode if the app is offline (e.g., missing environment variables)
  if (isOffline && !isSupabaseConfigured) {
    return <OfflineMode message="Database connection not configured. Please contact your administrator to set up the application." />;
  }

  // If Supabase is not configured, show login form with warning
  if (!isSupabaseConfigured) {
    return <LoginForm />;
  }

  // If no user and session check is complete, show login
  if (!user && sessionCheckComplete) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ProtectedRoute - No user found after session check, showing login');
    }
    return <LoginForm />;
  }

  // If no user but session check not complete yet, wait
  if (!user && !sessionCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // If user exists but no profile, show profile creation screen
  if (user && !profile) {
    if (process.env.NODE_ENV === 'development') {
      console.log('User exists but no profile found');
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
                {/* HacCare Text */}
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
            <h1 className="text-2xl font-bold text-gray-900">Profile Setup Required</h1>
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
                Setting up your hospital profile...
              </p>
            </div>

            {profileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{profileError}</p>
              </div>
            )}

            <button
              onClick={handleCreateProfile}
              disabled={creatingProfile}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {creatingProfile ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Setting up profile...</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span>Complete Setup</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 text-sm underline"
              >
                Sign out and try different account
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-green-800 text-xs">
                  <strong>Almost there!</strong> Your account is verified and we're just setting up your hospital profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0) {
    const userRole = profile?.role;
    const hasRequiredRole = requiredRoles.some(role => hasRole([role]));

    if (!hasRequiredRole) {
      // If redirectTo is specified, redirect unauthorized users
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }

      // Otherwise, show access denied message
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="mb-6">
              <svg 
                className="mx-auto h-16 w-16 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required role(s): {requiredRoles.join(', ')}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Your current role: {userRole || 'None'}
            </p>
            <button 
              onClick={() => window.history.back()}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // User is authenticated, has profile, and has required role (if specified)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth successful, rendering main app');
  }
  return <>{children}</>;
};
