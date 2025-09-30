import React, { useState, useEffect } from 'react';
import { Shield, Users, Clock, Monitor, Globe, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getActiveSessions, 
  getSystemStats,
  UserSession
} from '../../lib/adminService';

// Interfaces imported from adminService

/**
 * Admin Dashboard Component
 * 
 * Provides system administration capabilities including:
 * - Active session monitoring with IP addresses
 * - 24-hour activity log tracking
 * - Real-time session updates
 * - User activity analytics
 */
export const AdminDashboard: React.FC = () => {
  const { hasRole } = useAuth();
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [systemStats, setSystemStats] = useState({ activeSessionCount: 0, systemStatus: 'online' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Check if user has admin access
  const hasAdminAccess = hasRole(['admin', 'super_admin']);

  /**
   * Fetch active sessions from the database
   */
  const fetchActiveSessions = async () => {
    try {
      const sessions = await getActiveSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load active sessions');
    }
  };



  /**
   * Refresh all data
   */
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchActiveSessions();
      const stats = await getSystemStats();
      setSystemStats(stats);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to refresh admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (hasAdminAccess) {
      refreshData();
    }
  }, [hasAdminAccess]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!hasAdminAccess) return;
    
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [hasAdminAccess]);

  // Check admin access
  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">You need admin privileges to access this section.</p>
        </div>
      </div>
    );
  }

  if (loading && activeSessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Login sessions and IP address monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sessions</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{systemStats.activeSessionCount}</p>
            </div>
          </div>
        </div>



        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Monitor className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</p>
              <p className={`text-2xl font-semibold ${systemStats.systemStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}>{systemStats.systemStatus}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Login Sessions & IP Addresses
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Login Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {activeSessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {session.user_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {session.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white font-mono">
                        {session.ip_address}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {session.tenant_name || 'No tenant'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(session.login_time).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};

export default AdminDashboard;