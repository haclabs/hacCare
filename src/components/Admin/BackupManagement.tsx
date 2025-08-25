/**
 * Backup Management Component for Super Admin
 * 
 * Provides comprehensive backup and restore functionality with
 * security controls and audit trails.
 */

import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Shield, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { backupService, BackupOptions, BackupMetadata } from '../../services/backupService';
import { useAuth } from '../../contexts/AuthContext';

// Local formatter functions to avoid import issues
const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const BackupManagement: React.FC = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Backup creation form state
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includePatients: true,
    includeAssessments: true,
    includeUsers: false,
    includeTenants: false,
    includeAlerts: true,
    includeMedications: true,
    includeWoundCare: true,
    encryptData: true
  });

  const [dateRange, setDateRange] = useState({
    enabled: false,
    startDate: '',
    endDate: ''
  });

  // Security check - wait for auth to load before checking roles
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Security check
  if (!hasRole(['super_admin'])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Super admin privileges required for backup management.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const backupList = await backupService.listBackups(user!.id);
      setBackups(backupList);
    } catch (err) {
      setError('Failed to load backups');
      console.error('Load backups error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);

      const options: BackupOptions = {
        ...backupOptions,
        dateRange: dateRange.enabled ? {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        } : undefined
      };

      const metadata = await backupService.createBackup(options, user!.id);
      setSuccess(`Backup created successfully: ${metadata.id}`);
      await loadBackups();
    } catch (err: any) {
      setError(`Failed to create backup: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      setDownloading(backupId);
      setError(null);

      const { data } = await backupService.downloadBackup(backupId, user!.id);
      
      // Create and trigger download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `haccare_backup_${backupId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Backup downloaded successfully');
      await loadBackups();
    } catch (err: any) {
      setError(`Failed to download backup: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      await backupService.deleteBackup(backupId, user!.id);
      setSuccess('Backup deleted successfully');
      await loadBackups();
    } catch (err: any) {
      setError(`Failed to delete backup: ${err.message || 'Unknown error'}`);
    }
  };

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'tenant_specific': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'expired': return 'text-gray-400';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              Backup Management
            </h2>
            <p className="text-gray-600 mt-1">
              Create, manage, and restore system backups with enterprise-grade security
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Super Admin Only</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Backup Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Backup</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Select Data to Backup</h4>
            <div className="space-y-3">
              {[
                { key: 'includePatients', label: 'Patient Records', icon: '👤' },
                { key: 'includeAssessments', label: 'Patient Assessments', icon: '📋' },
                { key: 'includeMedications', label: 'Medications', icon: '💊' },
                { key: 'includeWoundCare', label: 'Wound Care Data', icon: '🩹' },
                { key: 'includeAlerts', label: 'System Alerts', icon: '🔔' },
                { key: 'includeUsers', label: 'User Accounts', icon: '👥' },
                { key: 'includeTenants', label: 'Tenant Settings', icon: '🏢' }
              ].map(({ key, label, icon }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={backupOptions[key as keyof BackupOptions] as boolean}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {icon} {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Backup Options</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={backupOptions.encryptData}
                  onChange={(e) => setBackupOptions(prev => ({
                    ...prev,
                    encryptData: e.target.checked
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
                  🔐 Encrypt backup data
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={dateRange.enabled}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    enabled: e.target.checked
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
                  📅 Limit by date range
                </span>
              </label>

              {dateRange.enabled && (
                <div className="ml-7 space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({
                        ...prev,
                        startDate: e.target.value
                      }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {creating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Creating Backup...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Create Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Existing Backups */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Available Backups</h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-2">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-6 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No backups available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Backup Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {backup.id.substring(0, 20)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(backup.created_at)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {backup.record_count.toLocaleString()} records
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBackupTypeColor(backup.backup_type)}`}>
                          {backup.backup_type}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatBytes(backup.file_size)}
                        </div>
                        {backup.encrypted && (
                          <div className="text-xs text-green-600 flex items-center mt-1">
                            <Shield className="h-3 w-3 mr-1" />
                            Encrypted
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expires: {formatDate(backup.expiry_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{backup.download_count}/10</div>
                      {backup.last_downloaded && (
                        <div className="text-xs">
                          Last: {formatDate(backup.last_downloaded)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadBackup(backup.id)}
                          disabled={downloading === backup.id || backup.status !== 'completed'}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                          title="Download backup"
                        >
                          {downloading === backup.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete backup"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <div className="text-sm text-yellow-700 mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li>Backups contain sensitive patient data and should be handled according to HIPAA guidelines</li>
                <li>Encrypted backups require additional security measures for decryption</li>
                <li>All backup activities are logged and audited for compliance</li>
                <li>Backups automatically expire after 90 days for security</li>
                <li>Maximum 10 downloads per backup to prevent unauthorized access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManagement;;
