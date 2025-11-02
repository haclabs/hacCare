/**
 * Backup Management Component for Super Admin
 * 
 * Provides comprehensive backup and restore functionality with
 * security controls and audit trails.
 */

import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Shield, Database, AlertTriangle, CheckCircle, FileUp, FileText, X } from 'lucide-react';
import { backupService, BackupOptions, BackupMetadata, RestoreOptions, RestoreResult } from '../../../services/operations/backupService';
import { useAuth } from '../../../hooks/useAuth';

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
  
  // Activity log state
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  // Backup creation form state
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includePatients: true,
    includeAssessments: true,
    includeUsers: false,
    includeTenants: false,
    includeAlerts: true,
    includeMedications: true,
    includeWoundCare: true,
    includeVitals: true,
    includeNotes: true,
    includeDiabeticRecords: true,
    includeAdmissionRecords: true,
    includeAdvancedDirectives: true,
    includeBowelRecords: true,
    includeWoundAssessments: true,
    includeHandoverNotes: true,
    includeDoctorsOrders: true,
    includePatientImages: true,
    includeSimulations: true,
    includeLabOrders: true,
    includeHacmapMarkers: true,
    encryptData: true,
    password: ''
  });

  const [dateRange, setDateRange] = useState({
    enabled: false,
    startDate: '',
    endDate: ''
  });

  // Restore state
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

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
      setSuccess(null);

      // Validate encryption password
      if (backupOptions.encryptData && !backupOptions.password) {
        setError('Encryption password is required when encryption is enabled');
        setCreating(false);
        return;
      }

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
      console.error('Backup creation error:', err);
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

  const handleViewActivityLog = async (backupId: string) => {
    setSelectedBackupId(backupId);
    setShowActivityLog(true);
    setLoadingLog(true);
    
    try {
      const log = await backupService.getBackupActivityLog(backupId, user!.id);
      setActivityLog(log);
    } catch (err: any) {
      console.error('Failed to load activity log:', err);
      setActivityLog([]);
    } finally {
      setLoadingLog(false);
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[
                { key: 'includePatients', label: 'Patient Records', icon: '👤' },
                { key: 'includeVitals', label: 'Vital Signs', icon: '❤️' },
                { key: 'includeMedications', label: 'Medications', icon: '💊' },
                { key: 'includeAssessments', label: 'Patient Assessments', icon: '📋' },
                { key: 'includeNotes', label: 'Patient Notes', icon: '📝' },
                { key: 'includeDoctorsOrders', label: 'Doctor\'s Orders', icon: '⚕️' },
                { key: 'includeAlerts', label: 'System Alerts', icon: '�' },
                { key: 'includeWoundCare', label: 'Wound Care (Patient Wounds)', icon: '🩹' },
                { key: 'includeWoundAssessments', label: 'Wound Assessments', icon: '🔬' },
                { key: 'includeDiabeticRecords', label: 'Diabetic Records', icon: '�' },
                { key: 'includeBowelRecords', label: 'Bowel Records', icon: '📊' },
                { key: 'includeAdmissionRecords', label: 'Admission Records', icon: '🏥' },
                { key: 'includeAdvancedDirectives', label: 'Advanced Directives', icon: '📜' },
                { key: 'includeHandoverNotes', label: 'Handover Notes (SBAR)', icon: '🤝' },
                { key: 'includePatientImages', label: 'Patient Images', icon: '🖼️' },
                { key: 'includeSimulations', label: 'Simulation Templates & Active Simulations', icon: '🎭' },
                { key: 'includeLabOrders', label: 'Lab Orders (Specimen Orders)', icon: '🧪' },
                { key: 'includeHacmapMarkers', label: 'hacMap Markers (Devices & Wounds)', icon: '📍' },
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

              {backupOptions.encryptData && (
                <div className="ml-7">
                  <label className="block text-xs text-gray-500 mb-1">Encryption Password</label>
                  <input
                    type="password"
                    value={backupOptions.password || ''}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
                    placeholder="Enter a strong password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This password will be required to restore the backup
                  </p>
                </div>
              )}

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

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setShowRestoreDialog(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileUp className="h-4 w-4 mr-2" />
            Restore Backup
          </button>
          
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
                          onClick={() => handleViewActivityLog(backup.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View activity log"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
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

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Restore Backup
                </h3>
                <button
                  onClick={() => setShowRestoreDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>

              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">
                <strong>⚠️ Warning:</strong> Restoring a backup will modify your database. 
                Please ensure you have a current backup before proceeding.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Backup File
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log('Selected file:', file.name);
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decryption Password (if backup is encrypted)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter backup password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Restore Options</h4>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Overwrite existing records
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Generate new IDs for records
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Validate data before import
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Dry run (preview only, don't actually restore)
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRestoreDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  disabled
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Restore Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Backup Activity Log
                </h3>
                <button
                  onClick={() => setShowActivityLog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-3 text-sm text-gray-600">
                Backup ID: <span className="font-mono text-xs">{selectedBackupId}</span>
              </div>

              {loadingLog ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="ml-3 text-gray-600">Loading activity log...</span>
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity recorded for this backup
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityLog.map((activity, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              activity.action === 'backup_created' ? 'bg-green-100 text-green-800' :
                              activity.action === 'backup_downloaded' ? 'bg-blue-100 text-blue-800' :
                              activity.action === 'backup_deleted' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {activity.action === 'backup_created' && '✨ Created'}
                              {activity.action === 'backup_downloaded' && '📥 Downloaded'}
                              {activity.action === 'backup_deleted' && '🗑️ Deleted'}
                              {activity.action === 'restore_started' && '🔄 Restore Started'}
                              {activity.action === 'restore_completed' && '✅ Restore Completed'}
                              {activity.action === 'restore_failed' && '❌ Restore Failed'}
                              {!['backup_created', 'backup_downloaded', 'backup_deleted', 'restore_started', 'restore_completed', 'restore_failed'].includes(activity.action) && activity.action}
                            </span>
                            <span className="text-sm text-gray-900 font-medium">
                              {activity.user_profiles?.first_name && activity.user_profiles?.last_name
                                ? `${activity.user_profiles.first_name} ${activity.user_profiles.last_name}`
                                : activity.user_profiles?.email || 'Unknown User'}
                            </span>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-600">
                            {formatDate(activity.created_at)}
                          </div>

                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <details className="cursor-pointer">
                                <summary className="font-medium text-gray-700 hover:text-gray-900">
                                  View Details
                                </summary>
                                <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(activity.details, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowActivityLog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManagement;
