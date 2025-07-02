import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Feature Status Component
 * 
 * Displays the current status of all system features
 * with visual indicators for operational, degraded, and down states.
 */
interface FeatureStatusProps {
  features: {
    [key: string]: 'operational' | 'degraded' | 'down';
  };
}

export const FeatureStatus: React.FC<FeatureStatusProps> = ({ features }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'down':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const featureNames: { [key: string]: string } = {
    authentication: 'Authentication',
    patientData: 'Patient Data',
    alerts: 'Alert System',
    vitals: 'Vital Signs',
    medications: 'Medications'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Feature Status</h3>
      
      <div className="space-y-3">
        {Object.entries(features).map(([feature, status]) => (
          <div key={feature} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {featureNames[feature] || feature}
            </span>
            <div className="flex items-center space-x-2">
              {getStatusIcon(status)}
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span>Operational</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
            <span>Degraded</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
            <span>Down</span>
          </div>
        </div>
      </div>
    </div>
  );
};