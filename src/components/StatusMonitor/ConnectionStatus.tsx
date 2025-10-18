import React, { useState, useEffect } from 'react';
import { 
  Database, CheckCircle, XCircle, RefreshCw, AlertTriangle,
  Wifi, WifiOff, Server, Globe
} from 'lucide-react';
import { isSupabaseConfigured, testSupabaseConnection, supabase } from '../../lib/api/supabase';

/**
 * Connection Status Component
 * 
 * Displays the current status of the database connection
 * and provides troubleshooting information.
 */
export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  
  const checkConnection = async () => {
    setIsChecking(true);
    setStatus('checking');
    
    if (!supabase) {
      setIsConfigured(false);
      setStatus('disconnected');
      setLastChecked(new Date());
      setIsChecking(false);
      return;
    }
    
    try {
      const isConnected = await testSupabaseConnection();
      setStatus(isConnected ? 'connected' : 'disconnected');
      setIsConfigured(true);
    } catch (error) {
      console.error('Connection check error:', error);
      setStatus('disconnected');
    } finally {
      setLastChecked(new Date());
      setIsChecking(false);
    }
  };
  
  useEffect(() => {
    checkConnection();
    
    // Set up periodic checks
    const interval = setInterval(checkConnection, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (status: string) => {
    if (!isConfigured) return 'text-orange-600 dark:text-orange-400';
    switch (status) {
      case 'connected': return 'text-green-600 dark:text-green-400';
      case 'disconnected': return 'text-red-600 dark:text-red-400';
      case 'checking': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    if (!isConfigured) return AlertTriangle;
    switch (status) {
      case 'connected': return CheckCircle;
      case 'disconnected': return XCircle;
      case 'checking': return RefreshCw;
      default: return AlertTriangle;
    }
  };
  
  const getStatusText = (status: string) => {
    if (!isConfigured) return 'Not Configured';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  const StatusIcon = getStatusIcon(status);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Database Connection</h3>
        </div>
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-5 w-5 ${getStatusColor(status)} ${status === 'checking' ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {getStatusText(status)}
          </span>
        </div>
        {lastChecked && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      {!isConfigured && (
        <div className="text-xs text-orange-600 dark:text-orange-400 mb-3">
          Supabase environment variables not configured
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isSupabaseConfigured ? 'Configuration detected' : 'Not configured'}
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supabase URL</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">API Key</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Network Status</span>
              </div>
              <div className="flex items-center space-x-1">
                {navigator.onLine ? (
                  <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          {status === 'disconnected' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Troubleshooting</p>
              </div>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 pl-6 list-disc">
                <li>Check your internet connection</li>
                <li>Verify your Supabase project is active</li>
                <li>Ensure your API keys are correct in .env file</li>
                <li>Check browser console for specific error messages</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Key icon component
const Key: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);