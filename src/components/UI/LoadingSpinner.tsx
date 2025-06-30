import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Heart } from 'lucide-react';

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

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleForceSkip = () => {
    // Force skip loading by clearing any stored auth state
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-3">
            {/* Heart Icon */}
            <div className="relative">
              <Heart 
                className="h-16 w-16 text-blue-600 fill-current opacity-75" 
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
              <h1 className="text-3xl font-bold text-gray-800 leading-none opacity-75">
                haccare
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                patient record system
              </p>
            </div>
          </div>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium mb-2">Loading...</p>
        <p className="text-xs text-gray-400 mt-1">Connecting to secure servers</p>
        
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
              
              {showDebug && (
                <>
                  <button
                    onClick={handleForceSkip}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Skip Authentication Check
                  </button>
                  
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                    <p className="text-xs text-gray-700 font-medium mb-2">Connection Info:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• URL: {window.location.href}</p>
                      <p>• Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'Connected' : 'Not configured'}</p>
                      <p>• Network: {navigator.onLine ? 'Online' : 'Offline'}</p>
                      <p>• Storage: {Object.keys(localStorage).length} items</p>
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