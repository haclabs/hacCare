import React from 'react';
import { Alert } from '../../types';
import { X, AlertTriangle, Clock, Pill, Activity, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AlertPanelProps {
  alerts: Alert[];
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ 
  alerts, 
  isOpen, 
  onClose, 
  onAcknowledge 
}) => {
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
      case 'Critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'High': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'Medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div className="bg-white w-96 h-full shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {unacknowledgedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
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
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50">
                              {alert.priority}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs opacity-75">
                              {format(new Date(alert.timestamp), 'HH:mm')}
                            </p>
                            <button
                              onClick={() => onAcknowledge(alert.id)}
                              className="text-xs bg-white bg-opacity-50 hover:bg-opacity-75 px-3 py-1 rounded-full transition-colors flex items-center space-x-1"
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

          {acknowledgedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Acknowledged ({acknowledgedAlerts.length})
              </h3>
              <div className="space-y-3">
                {acknowledgedAlerts.map((alert) => {
                  const Icon = getAlertIcon(alert.type);
                  return (
                    <div
                      key={alert.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-75"
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600">{alert.patientName}</p>
                          <p className="text-sm text-gray-500 mb-1">{alert.message}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
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

          {alerts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">No alerts at this time</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};