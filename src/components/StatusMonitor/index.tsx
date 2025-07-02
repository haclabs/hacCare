import React from 'react';
import { SystemStatus } from './SystemStatus';
import { ConnectionStatus } from './ConnectionStatus';
import { FeatureStatus } from './FeatureStatus';

/**
 * Status Monitor Component
 * 
 * Comprehensive system status monitoring dashboard.
 * Displays real-time information about database connection,
 * feature status, and system health.
 */
export const StatusMonitor: React.FC = () => {
  const featureStatus = {
    authentication: 'operational' as const,
    patientData: 'degraded' as const,
    alerts: 'degraded' as const,
    vitals: 'degraded' as const,
    medications: 'degraded' as const
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Status</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemStatus />
        <FeatureStatus features={featureStatus} />
      </div>
      
      <ConnectionStatus />
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">Troubleshooting Steps</h3>
        <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
          <p>If you're experiencing connection issues, try the following:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Check your internet connection</li>
            <li>Verify your Supabase project is active</li>
            <li>Ensure your API keys are correct in the .env file</li>
            <li>Try refreshing the page</li>
            <li>Clear your browser cache and cookies</li>
            <li>Contact support if issues persist</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export * from './SystemStatus';
export * from './ConnectionStatus';
export * from './FeatureStatus';