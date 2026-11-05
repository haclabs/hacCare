import React from 'react';
import { Clock, Pill, User, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { MedicationAdministration } from '../../../../types';
import { usePatientAdministrationHistory24h } from '../../hooks/useMedications';
import { useTenant } from '../../../../contexts/TenantContext';

interface MedicationHistoryViewProps {
  patientId: string;
  patientName: string;
}

export const MedicationHistoryView: React.FC<MedicationHistoryViewProps> = ({
  patientId,
  patientName
}) => {
  const { 
    data: administrationHistory, 
    isLoading, 
    error, 
    refetch 
  } = usePatientAdministrationHistory24h(patientId);
  const { currentTenant } = useTenant();
  // Simulations and templates are reused for months, so a date would make doses look stale
  const showTimeOnly =
    currentTenant?.tenant_type === 'simulation_active' ||
    currentTenant?.tenant_type === 'simulation_template' ||
    !!currentTenant?.is_simulation;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      ...(showTimeOnly ? {} : { month: 'short', day: 'numeric' }),
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRouteIcon = (route: string) => {
    switch (route?.toLowerCase()) {
      case 'oral':
      case 'po':
        return <Pill className="h-4 w-4" />;
      case 'iv':
      case 'intravenous':
        return <div className="h-4 w-4 border border-current rounded-full" />;
      case 'im':
      case 'intramuscular':
      case 'injection':
        return <div className="h-4 w-4 border-2 border-current" />;
      default:
        return <Pill className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'missed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'late':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Administration History (24 Hours)</h3>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading administration history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Administration History (24 Hours)</h3>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading administration history</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Administration History (24 Hours)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing administered medications for {patientName} in the last 24 hours
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {!administrationHistory || administrationHistory.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No medications administered in the last 24 hours</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Administration records will appear here once medications are given
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span>Total administrations: {administrationHistory.length}</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>

          <div className="overflow-hidden">
            {administrationHistory.map((record: MedicationAdministration, index: number) => (
              <div 
                key={record.id || index} 
                className="border-l-4 border-blue-200 dark:border-blue-800 bg-gray-50 dark:bg-gray-700/50 p-4 mb-4 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      {getRouteIcon(record.route || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.medication?.name || record.medication_name || 'Unknown Medication'}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                          {record.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {record.status || 'Administered'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          <span className="font-medium">Dosage:</span> {record.dosage || record.medication?.dosage || 'Not specified'}
                        </p>
                        {record.administered_dose && (
                          <p>
                            <span className="font-medium">Given:</span> <span className="font-semibold text-blue-700 dark:text-blue-300">{record.administered_dose}</span>
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Route:</span> {record.route || record.medication?.route || 'Not specified'}
                        </p>
                        {record.notes && (
                          <p>
                            <span className="font-medium">Notes:</span> {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(record.timestamp)}
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <User className="h-3 w-3 mr-1" />
                      {record.administered_by || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {administrationHistory.length > 5 && (
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing all {administrationHistory.length} administrations from the last 24 hours
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
