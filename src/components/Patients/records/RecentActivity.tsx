import React, { useState, useEffect } from 'react';
import { X, Clock, User, FileText, RefreshCw, Activity, Edit, Plus, Trash2, Pill, Stethoscope } from 'lucide-react';
import { parseISO, isValid } from 'date-fns';
import { fetchTargetActivity, AuditLog } from '../../../lib/auditService';
import { formatLocalTime } from '../../../utils/dateUtils';

interface RecentActivityProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ 
  patientId, 
  patientName, 
  onClose 
}) => {
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
  }, [patientId]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTargetActivity(patientId, 'patient', 20);
      setActivities(data);
    } catch (err: any) {
      console.error('Error loading activity:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created_patient': return Plus;
      case 'updated_patient': return Edit;
      case 'deleted_patient': return Trash2;
      case 'recorded_vitals': return Activity;
      case 'created_medication': return Pill;
      case 'updated_medication': return Pill;
      case 'administered_medication': return Pill;
      case 'created_assessment': return Stethoscope;
      case 'created_note': return FileText;
      default: return Edit;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'text-green-600 bg-green-100';
    if (action.includes('updated')) return 'text-blue-600 bg-blue-100';
    if (action.includes('deleted')) return 'text-red-600 bg-red-100';
    if (action.includes('administered')) return 'text-purple-600 bg-purple-100';
    if (action.includes('recorded')) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatActionText = (action: string, details: any): string => {
    switch (action) {
      case 'created_patient':
        return 'Created patient record';
      case 'updated_patient':
        return `Updated patient ${details.fields?.join(', ') || 'information'}`;
      case 'deleted_patient':
        return 'Deleted patient record';
      case 'recorded_vitals':
        return 'Recorded vital signs';
      case 'created_medication':
        return `Added medication: ${details.name || 'Unknown'}`;
      case 'updated_medication':
        return `Updated medication: ${details.name || 'Unknown'}`;
      case 'administered_medication':
        return `Administered medication: ${details.name || 'Unknown'}`;
      case 'created_assessment':
        return `Created ${details.type || ''} assessment`;
      case 'created_note':
        return `Added ${details.type || ''} note`;
      default:
        return action.replace(/_/g, ' ');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Activity: {patientName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activity History</h3>
            <button
              onClick={loadActivity}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Refresh history"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">Loading activity history...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No activity records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActionIcon(activity.action);
                const colorClass = getActionColor(activity.action);
                const date = parseISO(activity.timestamp);
                
                return (
                  <div key={activity.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatActionText(activity.action, activity.details)}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-2">
                            <span>{isValid(date) ? formatLocalTime(date, 'MMM dd, yyyy HH:mm') : 'Invalid date'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span>{activity.user_name || 'Unknown User'}</span>
                    </div>
                    
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Object.entries(activity.details).map(([key, value]) => {
                            if (key !== 'fields' && value !== undefined && value !== null) {
                              return (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                                  <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};