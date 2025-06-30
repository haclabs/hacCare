import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginForm } from './LoginForm';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { isSupabaseConfigured } from '../../lib/supabase';
import { User, AlertCircle, RefreshCw, CheckCircle, Heart } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { user, profile, loading, hasRole, createProfile, signOut } = useAuth();
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  console.log('ProtectedRoute state:', { 
    user: !!user, 
    profile: !!profile, 
    loading,
    isSupabaseConfigured,
    userEmail: user?.email,
    profileRole: profile?.role 
  });

  // Show loading spinner while auth is initializing
  if (loading) {
    return <LoadingSpinner />;
  }

  // If Supabase is not configured, show login form with warning
  if (!isSupabaseConfigured) {
    return <LoginForm />;
  }

  // If no user, show login
  if (!user) {
    console.log('No user found, showing login form');
    return <LoginForm />;
  }

  // If user exists but no profile, show profile creation screen
  if (user && !profile) {
    console.log('User exists but no profile found');
    
    const handleCreateProfile = async () => {
      setCreatingProfile(true);
      setProfileError('');
      
      try {
        await createProfile();
      } catch (error: any) {
        console.error('Failed to create profile:', error);
        setProfileError(error.message || 'Failed to create profile');
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
              <div className="flex items-center space-x-3">
                {/* Heart Icon */}
                <div className="relative">
                  <Heart 
                    className="h-16 w-16 text-blue-600 fill-current" 
                    strokeWidth={1.5}
                  />
                  {/* Heartbeat line overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg 
                      className="h-6 w-6 text-white" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M3 12h3l2-4 4 8 2-4h3" />
                    </svg>
                  </div>
                </div>
                
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

  // Check role permissions
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    console.log('User does not have required roles:', requiredRoles);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this area.</p>
          <p className="text-sm text-gray-500 mt-2">Your role: {profile?.role}</p>
        </div>
      </div>
    );
  }

  console.log('Auth successful, rendering main app');
  return <>{children}</>;
};