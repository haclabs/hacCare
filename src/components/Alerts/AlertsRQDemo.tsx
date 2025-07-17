import { 
  useActiveAlerts, 
  useUnreadAlertCount, 
  useAcknowledgeAlert, 
  useRunAlertChecks,
  useAlertsByPriority,
  useAlertStats 
} from '../../hooks/queries/useAlerts';
import { useAuthStatus } from '../../hooks/queries/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * 🚨 React Query Alerts Demo
 * Shows the power of React Query for alert management
 */
export function AlertsRQDemo() {
  const { data: alerts = [], isLoading, error, refetch } = useActiveAlerts();
  const { unreadCount, criticalCount, highCount } = useUnreadAlertCount();
  const { user } = useAuthStatus();
  const stats = useAlertStats();
  
  // Priority-filtered alerts
  const { alerts: criticalAlerts } = useAlertsByPriority('Critical');
  
  // Mutations
  const acknowledgeMutation = useAcknowledgeAlert();
  const runChecksMutation = useRunAlertChecks();

  const handleAcknowledge = (alertId: string) => {
    if (!user?.id) return;
    acknowledgeMutation.mutate({ alertId, userId: user.id });
  };

  const handleRunChecks = () => {
    runChecksMutation.mutate();
  };

  const handleRefresh = () => {
    refetch();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'High': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'Medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'Low': return 'bg-blue-100 border-blue-500 text-blue-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">🚨 Alerts Demo - Loading...</h2>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">🚨 React Query Alerts Demo</h2>
      
      {/* Before/After Comparison */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">🚀 Migration Benefits:</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-red-600">❌ Before (AlertContext):</h4>
            <ul className="text-gray-600 mt-1">
              <li>• 225 lines of manual state management</li>
              <li>• Manual refresh intervals</li>
              <li>• Complex error handling</li>
              <li>• No optimistic updates</li>
              <li>• Manual loading states</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-600">✅ After (React Query):</h4>
            <ul className="text-gray-600 mt-1">
              <li>• Automatic background refresh (30s)</li>
              <li>• Smart caching & deduplication</li>
              <li>• Optimistic acknowledge updates</li>
              <li>• Built-in retry logic</li>
              <li>• Real-time statistics</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-sm text-red-700">Critical</div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{highCount}</div>
          <div className="text-sm text-orange-700">High Priority</div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          <div className="text-sm text-blue-700">Unread</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
          <div className="text-sm text-gray-700">Total</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
        >
          🔄 Refresh Alerts
        </button>
        <button
          onClick={handleRunChecks}
          disabled={runChecksMutation.isPending}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          {runChecksMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Running...</span>
            </>
          ) : (
            '🔍 Run Alert Checks'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-medium text-red-800">Alert System Error:</h4>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-600 mb-3">🚨 Critical Alerts</h3>
          <div className="space-y-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-red-50 border-l-4 border-red-500 rounded"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-red-800">{alert.type}</span>
                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                        {alert.priority}
                      </span>
                    </div>
                    <p className="text-red-700 mb-2">{alert.message}</p>
                    <p className="text-xs text-red-600">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.acknowledged && user && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="ml-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {acknowledgeMutation.isPending ? 'Ack...' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Alerts List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          All Alerts ({alerts.length})
          {isLoading && <LoadingSpinner size="sm" className="ml-2 inline" />}
        </h3>
        
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-2">✅</div>
            <p>No active alerts! System is running smoothly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border-l-4 rounded ${getPriorityColor(alert.priority)} ${
                  alert.acknowledged ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">{alert.type}</span>
                      <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                        {alert.priority}
                      </span>
                      {alert.acknowledged && (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                          ✓ Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="mb-2">{alert.message}</p>
                    <p className="text-xs opacity-75">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.acknowledged && user && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="ml-3 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                    >
                      {acknowledgeMutation.isPending ? 'Ack...' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* React Query Features Demo */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">🔥 React Query Features in Action:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✅ Auto-refresh every 30 seconds for real-time updates</li>
          <li>✅ Optimistic acknowledge - instant UI feedback</li>
          <li>✅ Smart background sync with error recovery</li>
          <li>✅ Request deduplication - no duplicate API calls</li>
          <li>✅ Derived state (statistics) automatically updated</li>
          <li>✅ Built-in loading states for all operations</li>
        </ul>
      </div>
    </div>
  );
}
