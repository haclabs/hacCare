/**
 * SYSTEM LOGS VIEWER - SUPER ADMIN ONLY
 * 
 * Comprehensive log viewer for troubleshooting and monitoring
 * Shows errors, user actions, navigation, and system events
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, AlertCircle, Activity, Navigation, Lock, X, RefreshCw } from 'lucide-react';
import { supabase } from '../../../../lib/api/supabase';
import { formatLocalTime } from '../../../../utils/time';

interface SystemLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  tenant_id: string | null;
  log_level: 'debug' | 'info' | 'warn' | 'error' | 'security';
  log_type: string;
  component: string | null;
  action: string | null;
  error_message: string | null;
  error_stack: string | null;
  request_data: any;
  response_data: any;
  user_agent: string | null;
  browser_info: any;
  ip_address: string | null;
  session_id: string | null;
  current_url: string | null;
  previous_url: string | null;
  metadata: any;
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  tenant?: {
    name: string;
    subdomain: string;
  };
}

export const SystemLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [selectedLevel, selectedType, timeRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedLevel, selectedType, timeRange]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);

      // Calculate time threshold
      const now = new Date();
      const timeThresholds: Record<string, number> = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
        '30d': 720
      };
      const hoursBack = timeThresholds[timeRange] || 1;
      const threshold = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('system_logs')
        .select(`
          *,
          user_profile:user_id (
            first_name,
            last_name,
            email,
            role
          ),
          tenant:tenant_id (
            name,
            subdomain
          )
        `)
        .gte('timestamp', threshold)
        .order('timestamp', { ascending: false })
        .limit(500);

      if (selectedLevel !== 'all') {
        query = query.eq('log_level', selectedLevel);
      }

      if (selectedType !== 'all') {
        query = query.eq('log_type', selectedType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching system logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLogs = async (olderThan: string) => {
    if (!confirm(`Delete all logs older than ${olderThan}? This cannot be undone.`)) {
      return;
    }

    try {
      const now = new Date();
      const daysBack: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      };
      const days = daysBack[olderThan] || 30;
      const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('system_logs')
        .delete()
        .lt('timestamp', threshold);

      if (error) throw error;

      alert(`Logs older than ${olderThan} deleted successfully`);
      fetchLogs();
    } catch (error) {
      console.error('Error deleting logs:', error);
      alert('Failed to delete logs');
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Level', 'Type', 'User', 'Tenant', 'Component', 'Action', 'Error', 'URL'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.log_level,
        log.log_type,
        log.user_profile ? `${log.user_profile.first_name} ${log.user_profile.last_name}` : 'Anonymous',
        log.tenant?.name || 'N/A',
        log.component || '',
        log.action || '',
        log.error_message || '',
        log.current_url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.error_message?.toLowerCase().includes(search) ||
      log.action?.toLowerCase().includes(search) ||
      log.component?.toLowerCase().includes(search) ||
      log.user_profile?.email?.toLowerCase().includes(search) ||
      log.current_url?.toLowerCase().includes(search)
    );
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-700 bg-red-100';
      case 'warn': return 'text-yellow-700 bg-yellow-100';
      case 'security': return 'text-purple-700 bg-purple-100';
      case 'info': return 'text-blue-700 bg-blue-100';
      case 'debug': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'security': return <Lock className="h-4 w-4" />;
      case 'info': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'navigation': return <Navigation className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'auth': return <Lock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
          <p className="text-gray-600 mt-1">Monitor errors, actions, and system events</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
              autoRefresh 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}</span>
          </button>
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center space-x-2 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="security">Security</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="error">Errors</option>
            <option value="action">Actions</option>
            <option value="navigation">Navigation</option>
            <option value="api_call">API Calls</option>
            <option value="auth">Authentication</option>
            <option value="permission_denied">Permission Denied</option>
          </select>

          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Maintenance Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredLogs.length} logs found
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 mr-2">Delete logs older than:</span>
            <button
              onClick={() => deleteLogs('7d')}
              className="px-3 py-1 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50"
            >
              7 days
            </button>
            <button
              onClick={() => deleteLogs('30d')}
              className="px-3 py-1 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50"
            >
              30 days
            </button>
            <button
              onClick={() => deleteLogs('90d')}
              className="px-3 py-1 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50"
            >
              90 days
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Component/Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatLocalTime(new Date(log.timestamp), 'HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.log_level)}`}>
                        {getLevelIcon(log.log_level)}
                        <span>{log.log_level}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 text-sm text-gray-700">
                        {getTypeIcon(log.log_type)}
                        <span>{log.log_type}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user_profile ? (
                        <div>
                          <div className="font-medium">{log.user_profile.first_name} {log.user_profile.last_name}</div>
                          <div className="text-xs text-gray-500">{log.user_profile.role}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.component && <div className="font-medium">{log.component}</div>}
                      {log.action && <div className="text-xs text-gray-500">{log.action}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {log.error_message || log.action || log.current_url || 'No message'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">{formatLocalTime(new Date(selectedLog.timestamp), 'dd MMM yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Level</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(selectedLog.log_level)}`}>
                        {getLevelIcon(selectedLog.log_level)}
                        <span>{selectedLog.log_level}</span>
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.log_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Component</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.component || 'N/A'}</p>
                  </div>
                </div>

                {selectedLog.user_profile && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">User</label>
                    <div className="mt-1 text-sm text-gray-900">
                      <div>{selectedLog.user_profile.first_name} {selectedLog.user_profile.last_name}</div>
                      <div className="text-xs text-gray-500">{selectedLog.user_profile.email}</div>
                      <div className="text-xs text-gray-500">Role: {selectedLog.user_profile.role}</div>
                    </div>
                  </div>
                )}

                {selectedLog.tenant && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tenant</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.tenant.name} ({selectedLog.tenant.subdomain})</p>
                  </div>
                )}

                {selectedLog.action && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Action</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.action}</p>
                  </div>
                )}

                {selectedLog.error_message && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Error Message</label>
                    <p className="mt-1 text-sm text-red-700 font-mono bg-red-50 p-3 rounded">{selectedLog.error_message}</p>
                  </div>
                )}

                {selectedLog.error_stack && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stack Trace</label>
                    <pre className="mt-1 text-xs text-gray-900 font-mono bg-gray-50 p-3 rounded overflow-x-auto">{selectedLog.error_stack}</pre>
                  </div>
                )}

                {selectedLog.current_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Current URL</label>
                    <p className="mt-1 text-sm text-blue-600 break-all">{selectedLog.current_url}</p>
                  </div>
                )}

                {selectedLog.previous_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Previous URL</label>
                    <p className="mt-1 text-sm text-gray-600 break-all">{selectedLog.previous_url}</p>
                  </div>
                )}

                {selectedLog.browser_info && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Browser</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.browser_info.browser} {selectedLog.browser_info.version} on {selectedLog.browser_info.os}
                    </p>
                  </div>
                )}

                {selectedLog.session_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Session ID</label>
                    <p className="mt-1 text-sm text-gray-600 font-mono">{selectedLog.session_id}</p>
                  </div>
                )}

                {selectedLog.request_data && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Request Data</label>
                    <pre className="mt-1 text-xs text-gray-900 font-mono bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
                      {JSON.stringify(selectedLog.request_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_data && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Response Data</label>
                    <pre className="mt-1 text-xs text-gray-900 font-mono bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
                      {JSON.stringify(selectedLog.response_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Additional Metadata</label>
                    <pre className="mt-1 text-xs text-gray-900 font-mono bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
