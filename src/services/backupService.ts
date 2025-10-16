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
  includeVitals: boolean;
  includeNotes: boolean;
  includeDiabeticRecords: boolean;
  includeAdmissionRecords: boolean;
  includeAdvancedDirectives: boolean;
  includeBowelRecords: boolean;
  includeWoundAssessments: boolean;
  includeHandoverNotes: boolean;
  includeDoctorsOrders: boolean;
  includePatientImages: boolean;
  includeSimulations: boolean;  // NEW: Simulation templates and active simulations
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  tenantIds?: string[];
  encryptData: boolean;
  password?: string; // For encryption/decryption
}

export interface RestoreOptions {
  overwriteExisting: boolean;
  createNewIds: boolean;
  tenantMapping?: Record<string, string>; // Map old tenant IDs to new ones
  userMapping?: Record<string, string>; // Map old user IDs to new ones
  validateData: boolean;
  dryRun: boolean; // Preview what would be restored without actually doing it
}

export interface RestoreResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  summary: {
    patients: number;
    assessments: number;
    users: number;
    tenants: number;
    alerts: number;
    medications: number;
    wound_care: number;
  };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenants?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alerts?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medications?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wound_care?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vitals?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    diabetic_records?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    admission_records?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    advanced_directives?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bowel_records?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wound_assessments?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handover_notes?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doctors_orders?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patient_images?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    simulation_templates?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    simulation_active?: any[];
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

      if (options.includeVitals) {
        backupData.data.vitals = await this.exportVitals(options);
        backupData.metadata.record_counts.vitals = backupData.data.vitals.length;
      }

      if (options.includeNotes) {
        backupData.data.notes = await this.exportNotes(options);
        backupData.metadata.record_counts.notes = backupData.data.notes.length;
      }

      if (options.includeDiabeticRecords) {
        backupData.data.diabetic_records = await this.exportDiabeticRecords(options);
        backupData.metadata.record_counts.diabetic_records = backupData.data.diabetic_records.length;
      }

      if (options.includeAdmissionRecords) {
        backupData.data.admission_records = await this.exportAdmissionRecords(options);
        backupData.metadata.record_counts.admission_records = backupData.data.admission_records.length;
      }

      if (options.includeAdvancedDirectives) {
        backupData.data.advanced_directives = await this.exportAdvancedDirectives(options);
        backupData.metadata.record_counts.advanced_directives = backupData.data.advanced_directives.length;
      }

      if (options.includeBowelRecords) {
        backupData.data.bowel_records = await this.exportBowelRecords(options);
        backupData.metadata.record_counts.bowel_records = backupData.data.bowel_records.length;
      }

      if (options.includeWoundAssessments) {
        backupData.data.wound_assessments = await this.exportWoundAssessments(options);
        backupData.metadata.record_counts.wound_assessments = backupData.data.wound_assessments.length;
      }

      if (options.includeHandoverNotes) {
        backupData.data.handover_notes = await this.exportHandoverNotes(options);
        backupData.metadata.record_counts.handover_notes = backupData.data.handover_notes.length;
      }

      if (options.includeDoctorsOrders) {
        backupData.data.doctors_orders = await this.exportDoctorsOrders(options);
        backupData.metadata.record_counts.doctors_orders = backupData.data.doctors_orders.length;
      }

      if (options.includePatientImages) {
        backupData.data.patient_images = await this.exportPatientImages(options);
        backupData.metadata.record_counts.patient_images = backupData.data.patient_images.length;
      }

      if (options.includeSimulations) {
        backupData.data.simulation_templates = await this.exportSimulationTemplates(options);
        backupData.data.simulation_active = await this.exportActiveSimulations(options);
        backupData.metadata.record_counts.simulation_templates = backupData.data.simulation_templates.length;
        backupData.metadata.record_counts.simulation_active = backupData.data.simulation_active.length;
      }

      // Generate checksum
      const dataString = JSON.stringify(backupData.data);
      backupData.metadata.checksum = await this.generateChecksum(dataString);

      // Encrypt if requested
      let finalData = JSON.stringify(backupData);
      const unencryptedSize = new Blob([finalData]).size;
      
      console.log(`Backup size: ${(unencryptedSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (options.encryptData) {
        if (!options.password) {
          throw new Error('Password is required when encryption is enabled');
        }
        
        // Warn if data is very large (>50MB)
        if (unencryptedSize > 50 * 1024 * 1024) {
          console.warn('Large backup detected. Encryption may take some time...');
        }
        
        try {
          finalData = await this.encryptData(finalData, options.password);
        } catch (error) {
          console.error('Encryption failed:', error);
          throw new Error(`Failed to encrypt backup: ${error instanceof Error ? error.message : 'Unknown error'}. Try creating a backup without encryption or with fewer data types.`);
        }
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
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (error) {
      console.error('Backup download failed:', error);
      throw new Error(`Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw new Error(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      options.includeWoundCare,
      options.includeVitals,
      options.includeNotes,
      options.includeDiabeticRecords,
      options.includeAdmissionRecords,
      options.includeAdvancedDirectives,
      options.includeBowelRecords,
      options.includeWoundAssessments,
      options.includeHandoverNotes,
      options.includeDoctorsOrders,
      options.includePatientImages,
      options.includeSimulations
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
    // Assessments are stored in patient_notes table with type 'Assessment'
    let query = supabase.from('patient_notes')
      .select('*')
      .eq('type', 'Assessment');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Convert patient_notes back to PatientAssessment format
    const assessments: PatientAssessment[] = (data || []).map(note => {
      // Parse assessment type from content
      let assessmentType: 'physical' | 'pain' | 'neurological' = 'physical';
      if (note.content.includes('Assessment Type: Pain')) {
        assessmentType = 'pain';
      } else if (note.content.includes('Assessment Type: Neurological')) {
        assessmentType = 'neurological';
      }

      return {
        id: note.id,
        patient_id: note.patient_id,
        nurse_id: note.nurse_id || '',
        nurse_name: note.nurse_name || 'Unknown',
        assessment_type: assessmentType,
        assessment_date: note.created_at,
        assessment_notes: note.content,
        recommendations: '',
        follow_up_required: note.content.includes('Follow-up Required: Yes'),
        priority_level: note.priority || 'routine',
        created_at: note.created_at
      };
    });

    return assessments;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportTenants(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('tenants').select('*');

    if (options.tenantIds?.length) {
      query = query.in('id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportMedications(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_medications').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      // Join with patients table to filter by tenant
      query = supabase
        .from('patient_medications')
        .select('*, patients!inner(tenant_id)')
        .in('patients.tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportWoundCare(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_wounds').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      // Join with patients table to filter by tenant
      query = supabase
        .from('patient_wounds')
        .select('*, patients!inner(tenant_id)')
        .in('patients.tenant_id', options.tenantIds);
    }

    const { data, error} = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportVitals(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_vitals').select('*');

    if (options.dateRange) {
      query = query
        .gte('recorded_at', options.dateRange.startDate)
        .lte('recorded_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportNotes(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_notes').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportDiabeticRecords(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('diabetic_records').select('*');

    if (options.dateRange) {
      query = query
        .gte('recorded_at', options.dateRange.startDate)
        .lte('recorded_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportAdmissionRecords(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_admission_records').select('*');

    if (options.dateRange) {
      query = query
        .gte('admission_date', options.dateRange.startDate)
        .lte('admission_date', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportAdvancedDirectives(_options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_advanced_directives').select('*');

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportBowelRecords(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('bowel_records').select('*');

    if (options.dateRange) {
      query = query
        .gte('bowel_movement_date', options.dateRange.startDate)
        .lte('bowel_movement_date', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportWoundAssessments(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('wound_assessments').select('*');

    if (options.dateRange) {
      query = query
        .gte('assessment_date', options.dateRange.startDate)
        .lte('assessment_date', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportHandoverNotes(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('handover_notes').select('*');

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.startDate)
        .lte('created_at', options.dateRange.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportDoctorsOrders(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('doctors_orders').select('*');

    if (options.dateRange) {
      query = query
        .gte('ordered_at', options.dateRange.startDate)
        .lte('ordered_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportPatientImages(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('patient_images').select('*');

    if (options.dateRange) {
      query = query
        .gte('uploaded_at', options.dateRange.startDate)
        .lte('uploaded_at', options.dateRange.endDate);
    }

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportSimulationTemplates(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('simulation_templates').select('*');

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async exportActiveSimulations(options: BackupOptions): Promise<any[]> {
    let query = supabase.from('simulation_active').select('*');

    if (options.tenantIds?.length) {
      query = query.in('tenant_id', options.tenantIds);
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

  private async encryptData(data: string, password?: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required for encryption');
    }

    try {
      // Convert password to encryption key using PBKDF2
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Encrypt the data
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const dataBuffer = encoder.encode(data);
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
      );

      // Combine salt + iv + encrypted data and convert to base64
      const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

      // Convert to base64 in chunks to avoid "Maximum call stack size exceeded" error
      let binaryString = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < combined.length; i += chunkSize) {
        const chunk = combined.subarray(i, Math.min(i + chunkSize, combined.length));
        binaryString += String.fromCharCode(...chunk);
      }
      
      return btoa(binaryString);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt backup data');
    }
  }

  private async decryptData(encryptedData: string, password?: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required for decryption');
    }

    try {
      // Convert base64 back to binary (handle large data)
      const binaryString = atob(encryptedData);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encryptedBuffer = combined.slice(28);

      // Derive the same key using the salt
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt backup data - please check your password');
    }
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

  /**
   * Restore data from a backup file
   */
  async restoreBackup(
    backupData: string | File, 
    options: RestoreOptions, 
    userId: string,
    password?: string
  ): Promise<RestoreResult> {
    try {
      // Verify super admin permissions
      await this.verifySuperAdminAccess(userId);

      let backupContent: string;
      
      // Handle File or string input
      if (backupData instanceof File) {
        backupContent = await this.readFileContent(backupData);
      } else {
        backupContent = backupData;
      }

      // Parse and decrypt backup data
      let parsedData: BackupData;
      try {
        // Try to parse as JSON first (unencrypted)
        parsedData = JSON.parse(backupContent);
      } catch {
        // If parsing fails, assume it's encrypted
        if (!password) {
          throw new Error('This backup appears to be encrypted. Please provide the password.');
        }
        const decryptedContent = await this.decryptData(backupContent, password);
        parsedData = JSON.parse(decryptedContent);
      }

      // Validate backup data structure
      this.validateBackupData(parsedData);

      const result: RestoreResult = {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [],
        warnings: [],
        summary: {
          patients: 0,
          assessments: 0,
          users: 0,
          tenants: 0,
          alerts: 0,
          medications: 0,
          wound_care: 0
        }
      };

      // Log restore attempt
      await this.logBackupActivity(userId, 'restore_started', 'restore_operation', {
        backup_version: parsedData.metadata.version,
        options: options,
        dry_run: options.dryRun
      });

      // Restore each data type
      if (parsedData.data.patients) {
        const patientResult = await this.restorePatients(parsedData.data.patients, options);
        this.mergeRestoreResults(result, patientResult, 'patients');
      }

      if (parsedData.data.assessments) {
        const assessmentResult = await this.restoreAssessments(parsedData.data.assessments, options);
        this.mergeRestoreResults(result, assessmentResult, 'assessments');
      }

      if (parsedData.data.users) {
        const userResult = await this.restoreUsers(parsedData.data.users, options);
        this.mergeRestoreResults(result, userResult, 'users');
      }

      if (parsedData.data.tenants) {
        const tenantResult = await this.restoreTenants(parsedData.data.tenants, options);
        this.mergeRestoreResults(result, tenantResult, 'tenants');
      }

      if (parsedData.data.alerts) {
        const alertResult = await this.restoreAlerts(parsedData.data.alerts, options);
        this.mergeRestoreResults(result, alertResult, 'alerts');
      }

      if (parsedData.data.medications) {
        const medicationResult = await this.restoreMedications(parsedData.data.medications, options);
        this.mergeRestoreResults(result, medicationResult, 'medications');
      }

      if (parsedData.data.wound_care) {
        const woundCareResult = await this.restoreWoundCare(parsedData.data.wound_care, options);
        this.mergeRestoreResults(result, woundCareResult, 'wound_care');
      }

      // Mark as successful if no critical errors
      result.success = result.errors.length === 0;

      // Log completion
      await this.logBackupActivity(userId, 'restore_completed', 'restore_operation', {
        success: result.success,
        records_created: result.recordsCreated,
        records_updated: result.recordsUpdated,
        errors: result.errors.length,
        dry_run: options.dryRun
      });

      return result;
    } catch (error) {
      console.error('Restore failed:', error);
      
      await this.logBackupActivity(userId, 'restore_failed', 'restore_operation', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private validateBackupData(data: BackupData): void {
    if (!data.metadata || !data.data) {
      throw new Error('Invalid backup format: Missing metadata or data');
    }

    if (!data.metadata.version) {
      throw new Error('Invalid backup format: Missing version information');
    }

    // Add version compatibility checks
    const backupVersion = data.metadata.version;
    if (backupVersion !== this.BACKUP_VERSION) {
      console.warn(`Backup version ${backupVersion} may not be fully compatible with current version ${this.BACKUP_VERSION}`);
    }
  }

  private async restorePatients(patients: Patient[], options: RestoreOptions): Promise<Partial<RestoreResult>> {
    const result: Partial<RestoreResult> = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: []
    };

    for (const patient of patients) {
      try {
        result.recordsProcessed!++;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would restore patient: ${patient.first_name} ${patient.last_name}`);
          continue;
        }

        // Check if patient exists
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('patient_id', patient.patient_id)
          .single();

        if (existingPatient) {
          if (options.overwriteExisting) {
            // Update existing patient
            const { error } = await supabase
              .from('patients')
              .update({
                ...patient,
                id: existingPatient.id, // Keep existing ID
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPatient.id);

            if (error) throw error;
            result.recordsUpdated!++;
          } else {
            result.recordsSkipped!++;
            result.warnings!.push(`Patient ${patient.patient_id} already exists and overwrite is disabled`);
          }
        } else {
          // Create new patient
          const patientData = { ...patient };
          if (options.createNewIds) {
            // @ts-expect-error - Deleting ID to let database generate new one
            delete patientData.id;
          }

          const { error } = await supabase
            .from('patients')
            .insert(patientData);

          if (error) throw error;
          result.recordsCreated!++;
        }
      } catch (error) {
        result.errors!.push(`Failed to restore patient ${patient.patient_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private async restoreAssessments(assessments: PatientAssessment[], options: RestoreOptions): Promise<Partial<RestoreResult>> {
    const result: Partial<RestoreResult> = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: []
    };

    for (const assessment of assessments) {
      try {
        result.recordsProcessed!++;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would restore assessment for patient: ${assessment.patient_id}`);
          continue;
        }

        // Map patient ID if needed
        let patientId = assessment.patient_id;
        if (options.userMapping && options.userMapping[assessment.patient_id]) {
          patientId = options.userMapping[assessment.patient_id];
        }

        // Check if assessment exists
        const { data: existingAssessment } = await supabase
          .from('patient_notes')
          .select('id')
          .eq('patient_id', patientId)
          .eq('created_at', assessment.created_at)
          .single();

        if (existingAssessment) {
          if (options.overwriteExisting) {
            const { error } = await supabase
              .from('patient_notes')
              .update({
                ...assessment,
                patient_id: patientId,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingAssessment.id);

            if (error) throw error;
            result.recordsUpdated!++;
          } else {
            result.recordsSkipped!++;
          }
        } else {
          const assessmentData = { 
            ...assessment, 
            patient_id: patientId 
          };
          
          if (options.createNewIds) {
            delete assessmentData.id;
          }

          const { error } = await supabase
            .from('patient_notes')
            .insert(assessmentData);

          if (error) throw error;
          result.recordsCreated!++;
        }
      } catch (error) {
        result.errors!.push(`Failed to restore assessment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private async restoreUsers(users: UserProfile[], options: RestoreOptions): Promise<Partial<RestoreResult>> {
    const result: Partial<RestoreResult> = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: []
    };

    for (const user of users) {
      try {
        result.recordsProcessed!++;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would restore user: ${user.email}`);
          continue;
        }

        // Check if user exists
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          if (options.overwriteExisting) {
            const { error } = await supabase
              .from('user_profiles')
              .update({
                ...user,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingUser.id);

            if (error) throw error;
            result.recordsUpdated!++;
          } else {
            result.recordsSkipped!++;
            result.warnings!.push(`User ${user.email} already exists and overwrite is disabled`);
          }
        } else {
          const userData = { ...user };
          if (options.createNewIds) {
            // @ts-expect-error - Deleting ID to let database generate new one
            delete userData.id;
          }

          const { error } = await supabase
            .from('user_profiles')
            .insert(userData);

          if (error) throw error;
          result.recordsCreated!++;
        }
      } catch (error) {
        result.errors!.push(`Failed to restore user ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async restoreTenants(tenants: any[], _options: RestoreOptions): Promise<Partial<RestoreResult>> {
    // Implementation for tenant restoration
    return {
      recordsProcessed: tenants.length,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: tenants.length,
      errors: [],
      warnings: ['Tenant restoration not yet implemented']
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async restoreAlerts(alerts: any[], _options: RestoreOptions): Promise<Partial<RestoreResult>> {
    // Implementation for alert restoration
    return {
      recordsProcessed: alerts.length,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: alerts.length,
      errors: [],
      warnings: ['Alert restoration not yet implemented']
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async restoreMedications(medications: any[], options: RestoreOptions): Promise<Partial<RestoreResult>> {
    const result: Partial<RestoreResult> = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: []
    };

    for (const medication of medications) {
      try {
        result.recordsProcessed!++;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would restore medication for patient: ${medication.patient_id}`);
          continue;
        }

        const medicationData = { ...medication };
        if (options.createNewIds) {
          delete medicationData.id;
        }

        const { error } = await supabase
          .from('patient_medications')
          .insert(medicationData);

        if (error) throw error;
        result.recordsCreated!++;
      } catch (error) {
        result.errors!.push(`Failed to restore medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async restoreWoundCare(woundCare: any[], options: RestoreOptions): Promise<Partial<RestoreResult>> {
    const result: Partial<RestoreResult> = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: []
    };

    for (const wound of woundCare) {
      try {
        result.recordsProcessed!++;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would restore wound assessment for patient: ${wound.patient_id}`);
          continue;
        }

        const woundData = { ...wound };
        if (options.createNewIds) {
          delete woundData.id;
        }

        const { error } = await supabase
          .from('patient_wounds')
          .insert(woundData);

        if (error) throw error;
        result.recordsCreated!++;
      } catch (error) {
        result.errors!.push(`Failed to restore wound care: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  private mergeRestoreResults(
    mainResult: RestoreResult, 
    partialResult: Partial<RestoreResult>, 
    dataType: keyof RestoreResult['summary']
  ): void {
    mainResult.recordsProcessed += partialResult.recordsProcessed || 0;
    mainResult.recordsCreated += partialResult.recordsCreated || 0;
    mainResult.recordsUpdated += partialResult.recordsUpdated || 0;
    mainResult.recordsSkipped += partialResult.recordsSkipped || 0;
    mainResult.errors.push(...(partialResult.errors || []));
    mainResult.warnings.push(...(partialResult.warnings || []));
    mainResult.summary[dataType] = partialResult.recordsCreated || 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /**
   * Get activity log for a specific backup
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getBackupActivityLog(backupId: string, userId: string): Promise<any[]> {
    try {
      await this.verifySuperAdminAccess(userId);

      // First get the audit log entries
      const { data: logData, error: logError } = await supabase
        .from('backup_audit_log')
        .select('*')
        .eq('backup_id', backupId)
        .order('created_at', { ascending: false });

      if (logError) throw logError;
      if (!logData || logData.length === 0) return [];

      // Get unique user IDs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userIds = [...new Set(logData.map((log: any) => log.user_id).filter(Boolean))];

      // Fetch user profiles separately
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profileError) {
        console.warn('Could not fetch user profiles:', profileError);
        // Return logs without user info if profile fetch fails
        return logData;
      }

      // Map profiles by ID for quick lookup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      // Merge log data with user profiles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return logData.map((log: any) => ({
        ...log,
        user_profiles: log.user_id ? profileMap.get(log.user_id) : null
      }));
    } catch (error) {
      console.error('Failed to fetch backup activity log:', error);
      return [];
    }
  }
}

export const backupService = new BackupService();
