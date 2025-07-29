import React from 'react';

interface OfflineModeProps {
  message?: string;
}

export const OfflineMode: React.FC<OfflineModeProps> = ({ 
  message = "App is running in offline mode. Please contact your administrator for support." 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Offline Mode
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {message}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Retry Connection
              </button>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Error Code: ENV_CONFIG_MISSING
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineMode;
