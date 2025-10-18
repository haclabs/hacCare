import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = []
}) => {
  const { user, profile, loading, hasRole } = useAuth();

  console.log('🛡️ ProtectedRoute - Simple check:', { 
    hasUser: !!user, 
    hasProfile: !!profile,
    loading,
    isSupabaseConfigured
  });

  // NEVER show loading spinner - always show content or login
  if (!isSupabaseConfigured) {
    return <LoginForm />;
  }

  // If no user, show login immediately (no loading)
  if (!user) {
    return <LoginForm />;
  }

  // If user but no profile, create profile automatically
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Setting up your profile...</h1>
            <p className="text-gray-600">Email: {user.email}</p>
            <p className="text-sm text-gray-500 mt-2">This will only take a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check role permissions if required
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have the required permissions to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required roles: {requiredRoles.join(', ')}</p>
          <p className="text-sm text-gray-500">Your role: {profile?.role || 'None'}</p>
        </div>
      </div>
    );
  }

  // All checks passed - render the protected content
  return <>{children}</>;
};
