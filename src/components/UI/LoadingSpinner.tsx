import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Heart } from 'lucide-react';

/**
 * Loading Spinner Component
 * 
 * Displays a loading screen with timeout handling and debug information.
 * Provides user-friendly feedback during authentication and app initialization.
 * 
 * Features:
 * - Animated loading spinner with hacCare branding
 * - Timeout detection with user actions
 * - Debug information for troubleshooting
 * - Network connectivity checks
 * - Clean session management (Supabase only, no localStorage manipulation)
 * 
 * @returns {JSX.Element} Loading spinner component
 */
export const LoadingSpinner: React.FC = () => {
  const [showTimeout, setShowTimeout] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Reduced timeout to 3 seconds for better UX
    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
    }, 3000);

    const debugTimer = setTimeout(() => {
      setShowDebug(true);
    }, 6000);

    return () => {
      clearTimeout(timeoutTimer);
      clearTimeout(debugTimer);
    };
  }, []);

  /**
   * Handle page refresh
   * Simple page reload to restart the authentication process
   */
  const handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Handle force skip authentication
   * Clears any stored auth state and reloads the page
   * Uses sessionStorage and localStorage clearing as a last resort
   * Note: This is only for emergency debugging - normal flow uses Supabase session management
   */
  const handleForceSkip = () => {
    console.log('🚨 Force skipping authentication check - clearing all storage');
    
    // Clear all storage as emergency measure
    // Note: Normal app operation doesn't use localStorage - this is only for debugging
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Storage cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
    
    // Reload page to restart authentication flow
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* hacCare Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            {/* hacCare Text */}
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-800 leading-none opacity-75">
                haccare
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                patient record system
              </p>
            </div>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium mb-2">Loading...</p>
        <p className="text-xs text-gray-400 mt-1">Connecting to secure servers</p>
        
        {/* Timeout Warning */}
        {showTimeout && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800 text-sm font-medium">Connection taking longer than expected</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRefresh}
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Page</span>
              </button>
              
              {/* Debug Information */}
              {showDebug && (
                <>
                  <button
                    onClick={handleForceSkip}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Emergency: Clear All Data & Restart
                  </button>
                  
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                    <p className="text-xs text-gray-700 font-medium mb-2">Debug Information:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• URL: {window.location.href}</p>
                      <p>• Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'Connected' : 'Not configured'}</p>
                      <p>• Network: {navigator.onLine ? 'Online' : 'Offline'}</p>
                      <p>• Storage Items: {Object.keys(localStorage).length} localStorage, {Object.keys(sessionStorage).length} sessionStorage</p>
                      <p>• User Agent: {navigator.userAgent.substring(0, 50)}...</p>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                      <strong>Note:</strong> This app uses Supabase for all data storage. 
                      localStorage is only cleared here as an emergency debugging measure.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};