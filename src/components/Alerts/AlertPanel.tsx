import React, { useState } from 'react';
import { Alert } from '../../types';
import { X, AlertTriangle, Clock, Pill, Activity, FileText, CheckCircle, RefreshCw, Play, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useAlerts } from '../../contexts/AlertContext';

// Helper function to format alert timestamp
const formatAlertTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return format(date, 'MMM dd, HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
};

interface AlertPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ 
  isOpen, 
  onClose
}) => {
  const { alerts, loading, error, acknowledgeAlert, refreshAlerts, runChecks } = useAlerts();
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'Medication Due': return Pill;
      case 'Vital Signs Alert': return Activity;
      case 'Emergency': return AlertTriangle;
      case 'Lab Results': return FileText;
      default: return Clock;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'Critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300';
      case 'High': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300';
      case 'Medium': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300';
      case 'Low': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  // Filter alerts based on selected filters
  const filteredAlerts = alerts.filter(alert => {
    const matchesPriority = filterPriority === 'all' || alert.priority === filterPriority;
    const matchesType = filterType === 'all' || alert.type === filterType;
    return matchesPriority && matchesType;
  });

  const unacknowledgedAlerts = filteredAlerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = filteredAlerts.filter(alert => alert.acknowledged);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshAlerts();
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
    }
  };

  const handleRunChecks = async () => {
    try {
      await runChecks();
    } catch (error) {
      console.error('Failed to run alert checks:', error);
    }
  };

  // Get unique alert types and priorities for filters
  const alertTypes = ['all', ...new Set(alerts.map(alert => alert.type))];
  const alertPriorities = ['all', ...new Set(alerts.map(alert => alert.priority))];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div className="bg-white dark:bg-gray-800 w-96 h-full shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alerts & Notifications</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Alert Filters */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {alertTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {alertPriorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority === 'all' ? 'All Priorities' : priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alert Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={handleRunChecks}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>Check Now</span>
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Loading alerts...</p>
            </div>
          )}

          {!loading && unacknowledgedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Active Alerts ({unacknowledgedAlerts.length})
              </h3>
              <div className="space-y-3">
                {unacknowledgedAlerts.map((alert) => {
                  const Icon = getAlertIcon(alert.type);
                  return (
                    <div
                      key={alert.id}
                      className={`border rounded-lg p-4 ${getPriorityColor(alert.priority)}`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{alert.patientName}</p>
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white dark:bg-gray-800 bg-opacity-50">
                              {alert.priority}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs opacity-75">
                              {formatAlertTime(alert.timestamp)}
                            </p>
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="text-xs bg-white dark:bg-gray-800 bg-opacity-50 hover:bg-opacity-75 px-3 py-1 rounded-full transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>Acknowledge</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && acknowledgedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Acknowledged ({acknowledgedAlerts.length})
              </h3>
              <div className="space-y-3">
                {acknowledgedAlerts.slice(0, 5).map((alert) => {
                  const Icon = getAlertIcon(alert.type);
                  return (
                    <div
                      key={alert.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 opacity-75"
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{alert.patientName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{alert.message}</p>
                          <p className="text-xs text-gray-400">
                            {formatAlertTime(alert.timestamp)}
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && filteredAlerts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No alerts at this time</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                System is monitoring patients automatically
              </p>
            </div>
          )}
        </div>

        {/* Alert System Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>Real-time Monitoring:</strong></p>
            <p>• Medication due times</p>
            <p>• Abnormal vital signs</p>
            <p>• Missing vital signs (8+ hours)</p>
            <p>• System checks every 5 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
};