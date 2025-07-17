import React, { useState } from 'react';
import { useCurrentUser, useSignIn, useSignOut, useAuthStatus, useHasRole } from '../../hooks/queries/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * 🔐 React Query Authentication Demo
 * Shows the power of React Query for auth state management
 */
export function AuthenticationRQDemo() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // React Query auth hooks - much cleaner than AuthContext!
  const { data: authData, isLoading: userLoading, error: userError } = useCurrentUser();
  const { isAuthenticated, isLoading: statusLoading, user, profile } = useAuthStatus();
  const hasRole = useHasRole();
  
  // Mutations with built-in loading states
  const signInMutation = useSignIn();
  const signOutMutation = useSignOut();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    signInMutation.mutate({ email, password });
  };

  const handleSignOut = () => {
    signOutMutation.mutate();
  };

  if (userLoading || statusLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">🔐 Auth Demo - Loading...</h2>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">🔐 React Query Authentication Demo</h2>
      
      {/* Before/After Comparison */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">🚀 Migration Benefits:</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-red-600">❌ Before (AuthContext):</h4>
            <ul className="text-gray-600 mt-1">
              <li>• 596 lines of boilerplate code</li>
              <li>• Manual loading state management</li>
              <li>• Complex session restoration</li>
              <li>• Manual error handling</li>
              <li>• No optimistic updates</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-600">✅ After (React Query):</h4>
            <ul className="text-gray-600 mt-1">
              <li>• ~50 lines for same functionality</li>
              <li>• Automatic loading states</li>
              <li>• Built-in session management</li>
              <li>• Smart error recovery</li>
              <li>• Optimistic mutations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Authentication Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Authentication Status:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
          </div>
          {user && (
            <>
              <div>Email: {user.email}</div>
              <div>User ID: {user.id}</div>
              {profile && (
                <>
                  <div>Role: {profile.role}</div>
                  <div>Has Admin Role: {hasRole(['admin', 'super_admin']) ? 'Yes' : 'No'}</div>
                  <div>Has Nurse Role: {hasRole('nurse') ? 'Yes' : 'No'}</div>
                </>
              )}
            </>
          )}
          {authData?.isOffline && (
            <div className="text-yellow-600">⚠️ Offline Mode Active</div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(userError || signInMutation.error || signOutMutation.error) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-medium text-red-800">Error:</h4>
          <p className="text-red-600 text-sm">
            {userError?.message || 
             signInMutation.error?.message || 
             signOutMutation.error?.message}
          </p>
        </div>
      )}

      {/* Authentication Form or User Info */}
      {!isAuthenticated ? (
        <div>
          <h3 className="font-semibold mb-3">Sign In:</h3>
          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={signInMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {signInMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium text-blue-800">Demo Credentials:</p>
            <p className="text-blue-600">Email: admin@example.com</p>
            <p className="text-blue-600">Password: password</p>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold mb-3">Signed In Successfully!</h3>
          <button
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
            className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {signOutMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Signing Out...</span>
              </>
            ) : (
              'Sign Out'
            )}
          </button>
        </div>
      )}

      {/* React Query Features Demo */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">🔥 React Query Features in Action:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✅ Automatic session restoration on page refresh</li>
          <li>✅ Real-time auth state synchronization</li>
          <li>✅ Smart error handling with retry logic</li>
          <li>✅ Loading states for all auth operations</li>
          <li>✅ Optimistic updates for instant UI feedback</li>
          <li>✅ Automatic cache invalidation on auth changes</li>
        </ul>
      </div>
    </div>
  );
}
