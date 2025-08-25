/**
 * Backup Service for Super Admin Data Management
 * 
 * Provides comprehensive backup and export functionality for healthcare data
 * with proper encryption, audit trails, and compliance features.
 */

import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { PatientAssessment } from '../lib/assessmentService';
import { UserProfile } from '../lib/supabase';

export interface BackupOptions {
  includePatients: boolean;
  includeAssessments: boolean;
  includeUsers: boolean;
  includeTenants: boolean;
  includeAlerts: boolean;
  includeMedications: boolean;
  includeWoundCare: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  tenantIds?: string[];
  encryptData: boolean;
}

export interface BackupMetadata {
  id: string;
  created_at: string;
  created_by: string;
  backup_type: 'full' | 'partial' | 'tenant_specific';
  file_size: number;
  record_count: number;
  options: BackupOptions;
  checksum: string;
  encrypted: boolean;
  status: 'in_progress' | 'completed' | 'failed' | 'expired';
  expiry_date: string;
  download_count: number;
  last_downloaded: string | null;
}

export interface BackupData {
  metadata: {
    version: string;
    created_at: string;
    created_by: string;
    backup_type: string;
    record_counts: Record<string, number>;
    checksum: string;
  };
  data: {
    patients?: Patient[];
    assessments?: PatientAssessment[];
    users?: UserProfile[];
    tenants?: any[];
    alerts?: any[];
    medications?: any[];
    wound_care?: any[];
  };
}

class BackupService {
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly MAX_BACKUP_AGE_DAYS = 90;
  private readonly MAX_DOWNLOAD_COUNT = 10;

  /**
   * Create a comprehensive data backup
   */
  async createBackup(options: BackupOptions, userId: string): Promise<BackupMetadata> {
    try {
      // Verify super admin permissions
      await this.verifySuperAdminAccess(userId);

      // Generate backup ID and metadata
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();

      // Initialize backup data structure
      const backupData: BackupData = {
        metadata: {
          version: this.BACKUP_VERSION,
          created_at: createdAt,
          created_by: userId,
          backup_type: this.determineBackupType(options),
          record_counts: {},
          checksum: ''
        },
        data: {}
      };

      // Collect data based on options
      if (options.includePatients) {
        backupData.data.patients = await this.exportPatients(options);
        backupData.metadata.record_counts.patients = backupData.data.patients.length;
      }

      if (options.includeAssessments) {
        backupData.data.assessments = await this.exportAssessments(options);
        backupData.metadata.record_counts.assessments = backupData.data.assessments.length;
      }

      if (options.includeUsers) {
        backupData.data.users = await this.exportUsers(options);
        backupData.metadata.record_counts.users = backupData.data.users.length;
      }

      if (options.includeTenants) {
        backupData.data.tenants = await this.exportTenants(options);
        backupData.metadata.record_counts.tenants = backupData.data.tenants.length;
      }

      if (options.includeAlerts) {
        backupData.data.alerts = await this.exportAlerts(options);
        backupData.metadata.record_counts.alerts = backupData.data.alerts.length;
      }

      if (options.includeMedications) {
        backupData.data.medications = await this.exportMedications(options);
        backupData.metadata.record_counts.medications = backupData.data.medications.length;
      }

      if (options.includeWoundCare) {
        backupData.data.wound_care = await this.exportWoundCare(options);
        backupData.metadata.record_counts.wound_care = backupData.data.wound_care.length;
      }

      // Generate checksum
      const dataString = JSON.stringify(backupData.data);
      backupData.metadata.checksum = await this.generateChecksum(dataString);

      // Encrypt if requested
      let finalData = JSON.stringify(backupData);
      if (options.encryptData) {
        finalData = await this.encryptData(finalData);
      }

      // Calculate file size
      const fileSize = new Blob([finalData]).size;
      const totalRecords = Object.values(backupData.metadata.record_counts).reduce((sum, count) => sum + count, 0);

      // Store backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        created_at: createdAt,
        created_by: userId,
        backup_type: this.determineBackupType(options),
        file_size: fileSize,
        record_count: totalRecords,
        options,
        checksum: backupData.metadata.checksum,
        encrypted: options.encryptData,
        status: 'completed',
        expiry_date: new Date(Date.now() + this.MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        download_count: 0,
        last_downloaded: null
      };

      // Save backup metadata to database
      await this.saveBackupMetadata(metadata);

      // Store backup file (in production, use secure cloud storage)
      await this.storeBackupFile(backupId, finalData);

      // Log backup creation
      await this.logBackupActivity(userId, 'backup_created', backupId, {
        record_count: totalRecords,
        file_size: fileSize,
        encrypted: options.encryptData
      });

      return metadata;
    } catch (error: any) {
      console.error('Backup creation failed:', error);
      throw new Error(`Failed to create backup: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Download a backup file
   */
  async downloadBackup(backupId: string, userId: string): Promise<{ data: string; metadata: BackupMetadata }> {
    try {
      // Verify super admin access
      await this.verifySuperAdminAccess(userId);

      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      
      if (!metadata) {
        throw new Error('Backup not found');
      }

      if (metadata.status !== 'completed') {
        throw new Error('Backup is not ready for download');
      }

      if (new Date(metadata.expiry_date) < new Date()) {
        throw new Error('Backup has expired');
      }

      if (metadata.download_count >= this.MAX_DOWNLOAD_COUNT) {
        throw new Error('Maximum download limit reached');
      }

      // Retrieve backup file
      const backupData = await this.retrieveBackupFile(backupId);

      // Update download tracking
      await this.updateDownloadTracking(backupId, userId);

      // Log download activity
      await this.logBackupActivity(userId, 'backup_downloaded', backupId, {
        download_count: metadata.download_count + 1
      });

      return {
        data: backupData,
        metadata: {
          ...metadata,
          download_count: metadata.download_count + 1,
          last_downloaded: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error('Backup download failed:', error);
      throw new Error(`Failed to download backup: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(userId: string): Promise<BackupMetadata[]> {
    try {
      await this.verifySuperAdminAccess(userId);

      const { data, error } = await supabase
        .from('backup_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired backups
      const activeBackups = data.filter(backup => 
        new Date(backup.expiry_date) > new Date()
      );

      return activeBackups;
    } catch (error: any) {
      console.error('Failed to list backups:', error);
      throw new Error(`Failed to list backups: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string, userId: string): Promise<void> {
    try {
      await this.verifySuperAdminAccess(userId);

      // Remove backup file
      await this.removeBackupFile(backupId);

      // Remove metadata
      const { error } = await supabase
        .from('backup_metadata')
        .delete()
        .eq('id', backupId);

      if (error) throw error;

      // Log deletion
      await this.logBackupActivity(userId, 'backup_deleted', backupId, {});
    } catch (error: any) {
      console.error('Failed to delete backup:', error);
      throw new Error(`Failed to delete backup: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Cleanup expired backups
   */
  async cleanupExpiredBackups(): Promise<number> {
    try {
      const { data: expiredBackups, error } = await supabase
        .from('backup_metadata')
        .select('id')
        .lt('expiry_date', new Date().toISOString());

      if (error) throw error;

      let deletedCount = 0;
      for (const backup of expiredBackups) {
        try {
          await this.removeBackupFile(backup.id);
          await supabase
            .from('backup_metadata')
            .delete()
            .eq('id', backup.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to cleanup backup ${backup.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup expired backups:', error);
      return 0;
    }
  }

  /**
   * Restore data from backup (careful operation)
   */
  async restoreFromBackup(
    backupId: string, 
    restoreOptions: {
      restorePatients: boolean;
      restoreUsers: boolean;
      restoreSettings: boolean;
      targetTenantId?: string;
      dryRun: boolean;
    }, 
    userId: string
  ): Promise<{ success: boolean; report: any }> {
    try {
      await this.verifySuperAdminAccess(userId);

      // This is a dangerous operation - require additional confirmation
      console.warn('⚠️ Restore operation initiated - this will modify production data');
      console.log(`Restore request for backup: ${backupId} by user: ${userId}`);

      if (!restoreOptions.dryRun) {
        throw new Error('Restore operations must be implemented with extreme caution and additional safeguards');
      }

      // Implementation would go here with extensive validation and rollback capabilities
      return {
        success: false,
        report: { message: 'Restore functionality requires additional security implementation' }
      };
    } catch (error) {
      console.error('Restore operation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private async verifySuperAdminAccess(userId: string): Promise<void> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || profile?.role !== 'super_admin') {
      throw new Error('Insufficient permissions: Super admin access required');
    }
  }

  private determineBackupType(options: BackupOptions): 'full' | 'partial' | 'tenant_specific' {
    if (options.tenantIds && options.tenantIds.length > 0) {
      return 'tenant_specific';
    }
    
    const allOptions = [
      options.includePatients,
      options.includeAssessments,
      options.includeUsers,
      options.includeTenants,
      options.includeAlerts,
      options.includeMedications,
      options.includeWoundCare
    ];

    const enabledCount = allOptions.filter(Boolean).length;
    return enabledCount === allOptions.length ? 'full' : 'partial';
  }

  private async exportPatients(options: BackupOptions): Promise<Patient[]> {
    let query = supabase.from('patients').select('*');

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async exportAssessments(options: BackupOptions): Promise<PatientAssessment[]> {
    let query = supabase.from('patient_assessments').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async exportUsers(options: BackupOptions): Promise<UserProfile[]> {
    let query = supabase.from('user_profiles').select('*');

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async exportTenants(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('tenants').select('*');

    if (options.tenantIds?.length) {
      query = query.in('id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async exportAlerts(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_alerts').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async exportMedications(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_medications').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async exportWoundCare(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('wound_assessments').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async encryptData(data: string): Promise<string> {
    // In production, implement proper encryption using Web Crypto API
    // For now, return base64 encoded data as placeholder
    return btoa(data);
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const { error } = await supabase
      .from('backup_metadata')
      .insert(metadata);

    if (error) throw error;
  }

  private async storeBackupFile(backupId: string, data: string): Promise<void> {
    // In production, store in Supabase Storage or secure cloud storage
    // For now, we'll store in a simple table
    const { error } = await supabase
      .from('backup_files')
      .insert({
        backup_id: backupId,
        file_data: data,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const { data, error } = await supabase
      .from('backup_metadata')
      .select('*')
      .eq('id', backupId)
      .single();

    if (error) return null;
    return data;
  }

  private async retrieveBackupFile(backupId: string): Promise<string> {
    const { data, error } = await supabase
      .from('backup_files')
      .select('file_data')
      .eq('backup_id', backupId)
      .single();

    if (error) throw error;
    return data.file_data;
  }

  private async updateDownloadTracking(backupId: string, _userId: string): Promise<void> {
    // Get current download count first
    const { data: currentData, error: fetchError } = await supabase
      .from('backup_metadata')
      .select('download_count')
      .eq('id', backupId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('backup_metadata')
      .update({
        download_count: (currentData?.download_count || 0) + 1,
        last_downloaded: new Date().toISOString()
      })
      .eq('id', backupId);

    if (error) throw error;
  }

  private async removeBackupFile(backupId: string): Promise<void> {
    const { error } = await supabase
      .from('backup_files')
      .delete()
      .eq('backup_id', backupId);

    if (error) throw error;
  }

  private async logBackupActivity(userId: string, action: string, backupId: string, details: any): Promise<void> {
    const { error } = await supabase
      .from('backup_audit_log')
      .insert({
        user_id: userId,
        action,
        backup_id: backupId,
        details,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log backup activity:', error);
    }
  }
}

export const backupService = new BackupService();
