import React, { useState, useEffect } from 'react';
import { getConnectionStatus } from '../../lib/connectionTest';
import { 
  AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Database, Key, Globe, Lock, FileText, Shield
} from 'lucide-react';
import { SecurityConnectionDiagnostics } from './SecurityConnectionDiagnostics';

/**
 * Connection Diagnostics Component
 * 
 * Provides detailed diagnostics for Supabase connection issues
 * and helps users troubleshoot connectivity problems.
 * Now includes advanced AI-powered security diagnostics.
 */
export const ConnectionDiagnostics: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'security'>('basic');
  
  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const connectionStatus = await getConnectionStatus();
      setResults(connectionStatus.details);
      setStatus(connectionStatus.status);
      setMessage(connectionStatus.message);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setStatus('error');
      setMessage('An error occurred while running diagnostics.');
    } finally {
      setIsRunning(false);
    }
  };
  
  useEffect(() => {
    runDiagnostics();
  }, []);
  
  const getStatusIcon = (isSuccess: boolean) => {
    if (isSuccess) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };
  
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'connected': return 'bg-green-50 border-green-200 text-green-800';
      case 'unconfigured': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'invalid': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'network': return 'bg-red-50 border-red-200 text-red-800';
      case 'auth': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'database': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Basic Connection</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Security Diagnostics</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Basic Connection Diagnostics */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Basic Connection Diagnostics
            </h3>
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>
          
          {/* Status Summary */}
          {status && (
            <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
              <div className="flex items-center space-x-2">
                {status === 'connected' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : status === 'error' ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}
          
          {/* Detailed Results */}
          {results && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Diagnostic Results</h3>
                <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                  <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Configuration Present
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        {getStatusIcon(results.configPresent)}
                        <span className="ml-2">{results.configPresent ? 'Yes' : 'No'}</span>
                      </dd>
                    </div>
                    
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                        <Key className="h-4 w-4 mr-2" />
                        Configuration Valid
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        {getStatusIcon(results.configValid)}
                        <span className="ml-2">{results.configValid ? 'Yes' : 'No'}</span>
                      </dd>
                    </div>
                    
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Network Connectivity
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        {getStatusIcon(results.networkReachable)}
                        <span className="ml-2">{results.networkReachable ? 'Reachable' : 'Unreachable'}</span>
                      </dd>
                    </div>
                    
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        Authentication Service
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        {getStatusIcon(results.authServiceWorking)}
                        <span className="ml-2">{results.authServiceWorking ? 'Working' : 'Not Working'}</span>
                      </dd>
                    </div>
                    
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                        <Database className="h-4 w-4 mr-2" />
                        Database Queries
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        {getStatusIcon(results.databaseQueryWorking)}
                        <span className="ml-2">{results.databaseQueryWorking ? 'Working' : 'Not Working'}</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Error Messages */}
              {results.errors && results.errors.length > 0 && (
                <div className="px-4 py-5 bg-red-50 dark:bg-red-900/20 sm:p-6 border-t border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Error Details</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {results.errors.map((error: string, index: number) => (
                      <li key={index} className="text-xs text-red-700 dark:text-red-400">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Troubleshooting Guide */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Troubleshooting Guide</h4>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
              <li>
                <strong>Missing Configuration:</strong> Create a <code>.env</code> file in the project root with your Supabase URL and anon key.
              </li>
              <li>
                <strong>Invalid Configuration:</strong> Verify your Supabase URL starts with https:// and includes .supabase.co
              </li>
              <li>
                <strong>Network Issues:</strong> Check your internet connection and ensure your Supabase project is online.
              </li>
              <li>
                <strong>Auth Service Issues:</strong> Verify your anon key is correct and has the necessary permissions.
              </li>
              <li>
                <strong>Database Query Issues:</strong> Check your database schema and RLS policies.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Advanced Security Diagnostics */}
      {activeTab === 'security' && (
        <SecurityConnectionDiagnostics />
      )}
    </div>
  );
};