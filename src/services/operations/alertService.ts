import { supabase, isSupabaseConfigured, checkDatabaseHealth } from '../../lib/api/supabase';
import { Alert } from '../../types';
import { superAdminTenantService } from '../admin/superAdminTenantService';
import { simulationAlertStore } from '../../simulation/simulationAlertStore';

/**
 * Alert Service Configuration
 */
export const ALERT_CONFIG = {
  // How often to check for new alerts (60 minutes)
  CHECK_INTERVAL_MS: 60 * 60 * 1000,
  
  // How long to keep alerts before auto-deletion (24 hours) 
  ALERT_RETENTION_HOURS: 24,
  
  // Polling interval for UI updates (60 minutes to match check interval)
  POLLING_INTERVAL_MS: 60 * 60 * 1000,
  
  // Batch size for bulk operations
  BATCH_SIZE: 50,
  
  // Safety limit for processing alerts
  MAX_ALERTS_TO_PROCESS: 10000,
  
  // Auto-cleanup interval (run every 2 hours)
  CLEANUP_INTERVAL_MS: 2 * 60 * 60 * 1000
};

/**
 * Alert Service
 * Handles creation, retrieval, and management of patient alerts
 * 
 * Features:
 * - Automatic alert generation based on patient conditions
 * - 15-minute check intervals for optimal performance
 * - Automatic cleanup of alerts older than 24 hours
 * - Batch processing for safe bulk operations
 * - Tenant-aware checking for super admin users
 */

/**
 * Get the current tenant ID filter for alert checking
 * Returns null for all tenants, or specific tenant ID when super admin has selected one
 */
const getCurrentTenantFilter = async (): Promise<string | null> => {
  try {
    const currentAccess = superAdminTenantService.getCurrentAccess();
    
    // If super admin has selected a specific tenant, use that filter
    if (currentAccess.hasAccess && currentAccess.tenantId) {
      console.log(`🎯 Alert checks filtering for tenant: ${currentAccess.tenantId} (${currentAccess.tenantName})`);
      return currentAccess.tenantId;
    }
    
    // If super admin is in "all tenants" mode or regular user, no filter
    if (currentAccess.hasAccess && !currentAccess.tenantId) {
      console.log('🌐 Alert checks running for ALL tenants (super admin mode)');
    } else {
      console.log('👤 Alert checks running for user\'s assigned tenant(s)');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tenant filter for alerts:', error);
    return null;
  }
};

export interface DatabaseAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  tenant_id: string; // Made required for multi-tenant support
  alert_type: 'medication_due' | 'vital_signs' | 'emergency' | 'lab_results' | 'discharge_ready';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  expires_at?: string;
}

/**
 * Convert database alert to app alert format
 */
const convertDatabaseAlert = (dbAlert: DatabaseAlert): Alert => ({
  id: dbAlert.id,
  patientId: dbAlert.patient_id,
  patientName: dbAlert.patient_name,
  tenant_id: dbAlert.tenant_id,
  type: dbAlert.alert_type === 'medication_due' ? 'Medication Due' :
        dbAlert.alert_type === 'vital_signs' ? 'Vital Signs Alert' :
        dbAlert.alert_type === 'emergency' ? 'Emergency' :
        dbAlert.alert_type === 'lab_results' ? 'Lab Results' :
        'Discharge Ready',
  message: dbAlert.message,
  priority: dbAlert.priority === 'low' ? 'Low' :
           dbAlert.priority === 'medium' ? 'Medium' :
           dbAlert.priority === 'high' ? 'High' :
           'Critical',
  timestamp: dbAlert.created_at,
  acknowledged: dbAlert.acknowledged
});

/**
 * Fetch all active alerts
 */
export const fetchActiveAlerts = async (tenantId?: string): Promise<Alert[]> => {
  try {
    // In simulation mode, return alerts from memory
    if (isSimulationMode) {
      const alerts = tenantId 
        ? simulationAlertStore.getAlertsByTenant(tenantId)
        : simulationAlertStore.getAllAlerts();
      console.log(`🎮 Fetched ${alerts.length} simulation alerts from memory`);
      return alerts;
    }

    // Check if Supabase is properly configured
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured, returning empty alerts array - check your .env file');
      return [];
    }

    // Test database connection before attempting to fetch
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.error('❌ Database connection failed, returning empty alerts array - check your Supabase configuration');
      // Return empty array instead of throwing to prevent app crash
      return [];
    }

    if (!supabase) {
      console.warn('📱 Alerts unavailable - Supabase not configured - check your .env file')
      return []
    }
    
    console.log('🔔 Fetching active alerts from database...');
    const now = new Date();
    console.log('Current time for alert fetch:', now.toISOString());
    
    try {
      const { data, error } = await supabase
        .from('patient_alerts')
        .select('*')
        .eq('acknowledged', false)
        .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('📱 Error fetching alerts:', error.message)
        // Don't throw error, return empty array to prevent app crash
        console.warn('Returning empty alerts array due to database error');
        return [];
      }

      const alerts = (data || []).map(convertDatabaseAlert);
      console.log(`✅ Fetched ${alerts.length} active alerts`);
      return alerts;
    } catch (fetchError: any) {
      console.warn('📱 Error during alert fetch operation:', fetchError.message);
      // Return empty array to prevent app crash
      return [];
    }
  } catch (error) {
    console.warn('📱 Network error fetching alerts:', error);
    console.warn('Returning empty alerts array to prevent app crash');
    return []
  }
};

/**
 * Create a new alert
 * For simulation tenants, stores alerts in memory only (no database persistence)
 */
export const createAlert = async (
  alert: Omit<DatabaseAlert, 'id' | 'created_at'>
): Promise<Alert> => {
  try {
    // Validate that tenant_id is provided
    if (!alert.tenant_id) {
      throw new Error('Cannot create alert - tenant_id is required for multi-tenant support');
    }

    console.log('🚨 Creating new alert:', alert);

    // For simulation mode, use in-memory storage
    if (isSimulationMode) {
      const simulationAlert: Alert = {
        id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        patientId: alert.patient_id,
        patientName: alert.patient_name,
        tenant_id: alert.tenant_id,
        type: alert.alert_type === 'medication_due' ? 'Medication Due' :
              alert.alert_type === 'vital_signs' ? 'Vital Signs Alert' :
              alert.alert_type === 'emergency' ? 'Emergency' :
              alert.alert_type === 'lab_results' ? 'Lab Results' :
              'Discharge Ready',
        message: alert.message,
        priority: alert.priority === 'low' ? 'Low' :
                 alert.priority === 'medium' ? 'Medium' :
                 alert.priority === 'high' ? 'High' :
                 'Critical',
        timestamp: new Date().toISOString(),
        acknowledged: false
      };
      
      simulationAlertStore.addAlert(simulationAlert);
      console.log('✅ Simulation alert created in memory:', simulationAlert.id);
      return simulationAlert;
    }

    if (!supabase) {
      throw new Error('Cannot create alert - Supabase not configured')
    }

    console.log('🏥 Creating database alert using RPC function V3 (dynamic SQL bypasses ALL cache)');
    
    // Use RPC function V3 with dynamic SQL to bypass PostgREST cache issues
    const { data: alertId, error } = await supabase
      .rpc('create_patient_alert_v3', {
        p_patient_id: alert.patient_id,
        p_tenant_id: alert.tenant_id,
        p_alert_type: alert.alert_type,
        p_message: alert.message,
        p_patient_name: alert.patient_name,
        p_priority: alert.priority || 'medium',
        p_expires_at: alert.expires_at || null
      });

    // If successful, return a constructed alert object
    if (alertId && !error) {
      const newAlert: Alert = {
        id: alertId,
        patientId: alert.patient_id,
        patientName: alert.patient_name || '',
        tenant_id: alert.tenant_id,
        type: alert.alert_type === 'medication_due' ? 'Medication Due' :
              alert.alert_type === 'vital_signs' ? 'Vital Signs Alert' :
              alert.alert_type === 'emergency' ? 'Emergency' :
              alert.alert_type === 'lab_results' ? 'Lab Results' :
              'Discharge Ready',
        message: alert.message,
        priority: (alert.priority === 'low' ? 'Low' :
                  alert.priority === 'medium' ? 'Medium' :
                  alert.priority === 'high' ? 'High' :
                  'Critical'),
        timestamp: new Date().toISOString(),
        acknowledged: false
      };
      console.log('✅ Alert created successfully via RPC:', newAlert.id);
      return newAlert;
    }

    // If we get RLS error, try super admin RPC function
    if (error?.code === '42501') {
      console.log('🔐 RLS blocked standard insert, trying super admin RPC...');
      
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_alert_for_tenant', {
          p_tenant_id: alert.tenant_id,
          p_patient_id: alert.patient_id,
          p_alert_type: alert.alert_type,
          p_message: alert.message,
          p_patient_name: alert.patient_name,
          p_priority: alert.priority || 'medium',
          p_expires_at: alert.expires_at || null
        });

      if (rpcError) {
        console.error('❌ Super admin RPC failed:', rpcError);
        throw rpcError;
      }

      if (!rpcResult.success) {
        console.error('❌ Super admin RPC returned error:', rpcResult.error);
        throw new Error(rpcResult.error);
      }

      console.log('✅ Alert created via super admin RPC:', rpcResult.alert_id);
      
      // Try to fetch the created alert to return proper format
      // If RLS blocks this, we'll use the mock response below
      const { data: createdAlert, error: fetchError } = await supabase
        .from('patient_alerts')
        .select('*')
        .eq('id', rpcResult.alert_id)
        .single();

      if (createdAlert && !fetchError) {
        return convertDatabaseAlert(createdAlert);
      }

      // If we can't fetch it back (likely due to RLS), create a mock response
      return {
        id: rpcResult.alert_id,
        patientId: alert.patient_id,
        patientName: alert.patient_name || '',
        tenant_id: alert.tenant_id,
        type: alert.alert_type === 'medication_due' ? 'Medication Due' :
              alert.alert_type === 'vital_signs' ? 'Vital Signs Alert' :
              alert.alert_type === 'emergency' ? 'Emergency' :
              alert.alert_type === 'lab_results' ? 'Lab Results' :
              'Discharge Ready',
        message: alert.message,
        priority: (alert.priority === 'low' ? 'Low' :
                  alert.priority === 'medium' ? 'Medium' :
                  alert.priority === 'high' ? 'High' :
                  'Critical'),
        timestamp: new Date().toISOString(),
        acknowledged: false
      };
    }

    // For other errors, throw them
    console.error('❌ Error creating alert:', error);
    throw error;

  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
};

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (alertId: string, userId: string): Promise<void> => {
  try {
    // In simulation mode, acknowledge in memory
    if (isSimulationMode) {
      simulationAlertStore.acknowledgeAlert(alertId);
      console.log('✅ Simulation alert acknowledged in memory:', alertId);
      return;
    }

    if (!supabase) {
      throw new Error('Cannot acknowledge alert - Supabase not configured')
    }

    console.log('✅ Acknowledging alert in database:', alertId);
    
    // First try standard update
    const { error } = await supabase
      .from('patient_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    // If successful, we're done
    if (!error) {
      console.log('✅ Alert acknowledged successfully');
      return;
    }

    // If we get RLS error, try super admin RPC function
    if (error?.code === '42501') {
      console.log('🔐 RLS blocked standard update, trying super admin RPC...');
      
      // We need to get the tenant_id for the alert first
      const { data: alertData } = await supabase
        .from('patient_alerts')
        .select('tenant_id')
        .eq('id', alertId)
        .single();
      
      if (!alertData?.tenant_id) {
        throw new Error('Could not determine alert tenant for super admin acknowledgment');
      }
      
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('acknowledge_alert_for_tenant', {
          p_alert_id: alertId,
          p_tenant_id: alertData.tenant_id
        });

      if (rpcError) {
        console.error('❌ Super admin RPC failed:', rpcError);
        throw rpcError;
      }

      if (!rpcResult.success) {
        console.error('❌ Super admin RPC returned error:', rpcResult.error);
        throw new Error(rpcResult.error);
      }

      console.log('✅ Alert acknowledged via super admin RPC');
      return;
    }

    // For other errors, throw them
    console.error('❌ Error acknowledging alert:', error);
    throw error;

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
};

/**
 * Clean up duplicate alerts for the same patient and alert type
 */
export const cleanupDuplicateAlerts = async (): Promise<void> => {
  const MAX_ALERTS_TO_PROCESS = 10000; // Safety limit to prevent overwhelming operations
  
  try {
    console.log('🧹 Cleaning up duplicate alerts...');
    
    // Get all unacknowledged alerts grouped by patient and type
    const { data: alerts, error } = await supabase
      .from('patient_alerts')
      .select('id, patient_id, alert_type, message, created_at')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts for cleanup:', error);
      return;
    }

    if (!alerts || alerts.length === 0) {
      console.log('✅ No unacknowledged alerts found to clean up');
      return;
    }

    if (alerts.length > MAX_ALERTS_TO_PROCESS) {
      console.warn(`⚠️ Found ${alerts.length} alerts, which exceeds safety limit of ${MAX_ALERTS_TO_PROCESS}`);
      console.log('Consider running cleanup in smaller chunks or contact system administrator');
      return;
    }

    console.log(`🔍 Found ${alerts.length} unacknowledged alerts, checking for duplicates...`);

    // Group alerts by patient and type
    const alertGroups = new Map<string, any[]>();
    
    for (const alert of alerts || []) {
      let messageKey = alert.message;
      
      // For medication alerts, extract medication name + dosage for more precise grouping
      if (alert.alert_type === 'medication_due') {
        // Extract medication name and dosage for precise matching
        const medicationMatch = alert.message.match(/^OVERDUE: (.+?) is overdue/);
        messageKey = medicationMatch ? medicationMatch[1].trim() : alert.message;
      }
      
      // For vital signs alerts, extract vital type for more precise grouping
      if (alert.alert_type === 'vital_signs') {
        if (alert.message.includes('vitals') && alert.message.includes('overdue')) {
          // Missing vitals alert - group by patient only
          messageKey = 'Missing Vitals';
        } else {
          // Abnormal vital sign alert - group by vital type
          const vitalMatch = alert.message.match(/^(Temperature|Blood Pressure|Heart Rate|Oxygen Saturation|Respiratory Rate)/);
          messageKey = vitalMatch ? vitalMatch[1] : alert.message;
        }
      }
      
      const key = `${alert.patient_id}-${alert.alert_type}-${messageKey}`;
      
      if (!alertGroups.has(key)) {
        alertGroups.set(key, []);
      }
      alertGroups.get(key)!.push(alert);
    }

    // Remove duplicates (keep only the most recent)
    const alertsToDelete: string[] = [];
    
    for (const [key, groupAlerts] of alertGroups) {
      if (groupAlerts.length > 1) {
        // Sort by created_at and keep the most recent
        groupAlerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Mark older alerts for deletion
        for (let i = 1; i < groupAlerts.length; i++) {
          alertsToDelete.push(groupAlerts[i].id);
        }
        
        console.log(`Found ${groupAlerts.length} duplicate alerts for key: ${key}, will delete ${groupAlerts.length - 1} older alerts`);
      }
    }

    // Delete duplicate alerts using batch operations
    if (alertsToDelete.length > 0) {
      // Import batch operations utility
      const { batchDelete } = await import('./batchOperations');
      
      const { totalDeleted, errors } = await batchDelete(
        supabase,
        'patient_alerts',
        alertsToDelete,
        {
          batchSize: 50,
          delayBetweenBatches: 100,
          logProgress: true
        }
      );

      if (errors === 0) {
        console.log(`✅ Successfully cleaned up ${totalDeleted} duplicate alerts`);
      } else {
        console.log(`⚠️ Cleaned up ${totalDeleted} duplicate alerts with ${errors} batch errors`);
      }
    } else {
      console.log('✅ No duplicate alerts found');
    }
  } catch (error) {
    console.error('Error cleaning up duplicate alerts:', error);
  }
};

/**
 * Run all alert checks
 */
// Global flag to indicate simulation mode (for memory-only alerts)
let isSimulationMode = false;

export const setSimulationMode = (enabled: boolean) => {
  isSimulationMode = enabled;
  console.log(enabled ? '🎮 Alert service: Simulation mode ENABLED (memory-only)' : '🗄️ Alert service: Database mode ENABLED');
};

export const getSimulationMode = () => isSimulationMode;

export const runAlertChecks = async (): Promise<void> => {
  try {
    // In simulation mode, skip database connection checks
    if (isSimulationMode) {
      console.log('🎮 Running simulation alert checks (memory-only mode)...');
      // Run checks normally - createAlert will handle simulation storage
    } else {
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured) {
        console.warn('⚠️ Supabase not configured, skipping alert checks');
        return;
      }

      // Test database connection before attempting checks
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.error('❌ Database connection failed, skipping alert checks');
        return;
      }
    }

    console.log('🔄 Running comprehensive alert checks...');
    
    // Clean up old alerts first (older than 24 hours)
    await cleanupOldAlerts();
    
    // Clean up duplicates
    await cleanupDuplicateAlerts();
    
    // Note: medication and vital signs alert checks disabled - feature no longer in use
    
    console.log('✅ All alert checks completed');
  } catch (error) {
    console.error('Error running alert checks:', error);
  }
};

/**
 * Subscribe to real-time alert changes
 */
export const subscribeToAlerts = (callback: (alerts: Alert[]) => void) => {
  console.log('🔔 Setting up real-time alert subscription...');
  
  const subscription = supabase
    .channel('patient_alerts')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'patient_alerts' 
      }, 
      async () => {
        // Fetch updated alerts when changes occur
        const alerts = await fetchActiveAlerts();
        callback(alerts);
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Clean up expired alerts (using expires_at field)
 */
export const cleanupExpiredAlerts = async (): Promise<void> => {
  try {
    console.log('🧹 Cleaning up expired alerts...');
    
    const { error } = await supabase
      .from('patient_alerts')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired alerts:', error);
    } else {
      console.log('✅ Expired alerts cleaned up');
    }
  } catch (error) {
    console.error('Error cleaning up expired alerts:', error);
  }
};

/**
 * Clean up alerts older than 24 hours
 * Automatically deletes alerts created more than 24 hours ago
 */
export const cleanupOldAlerts = async (): Promise<void> => {
  try {
    console.log('🧹 Cleaning up alerts older than 24 hours and acknowledged alerts older than 2 hours...');
    
    // Calculate cleanup thresholds
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    console.log(`🕒 Deleting unacknowledged alerts created before: ${twentyFourHoursAgo.toISOString()}`);
    console.log(`🕒 Deleting acknowledged alerts created before: ${twoHoursAgo.toISOString()}`);
    
    // Get alerts to delete (old unacknowledged alerts OR acknowledged alerts older than 2 hours)
    const { data: oldAlerts, error: fetchError } = await supabase
      .from('patient_alerts')
      .select('id')
      .or(`and(acknowledged.eq.false,created_at.lt.${twentyFourHoursAgo.toISOString()}),and(acknowledged.eq.true,created_at.lt.${twoHoursAgo.toISOString()})`);

    if (fetchError) {
      console.error('Error fetching old alerts:', fetchError);
      return;
    }

    if (!oldAlerts || oldAlerts.length === 0) {
      console.log('✅ No alerts older than 24 hours found');
      return;
    }

    console.log(`📊 Found ${oldAlerts.length} alerts older than 24 hours`);
    
    // Use batch operations to safely delete old alerts
    const { batchDelete } = await import('./batchOperations');
    
    const alertIds = oldAlerts.map(alert => alert.id);
    const { totalDeleted, errors } = await batchDelete(
      supabase,
      'patient_alerts',
      alertIds,
      {
        batchSize: 50,
        delayBetweenBatches: 100,
        logProgress: true
      }
    );

    if (errors === 0) {
      console.log(`✅ Successfully deleted ${totalDeleted} old alerts`);
    } else {
      console.log(`⚠️ Deleted ${totalDeleted} old alerts with ${errors} batch errors`);
    }
  } catch (error) {
    console.error('Error cleaning up old alerts:', error);
  }
};

/**
 * Start automatic alert cleanup service
 * Runs cleanup every 2 hours in the background
 */
export const startAlertCleanupService = (): NodeJS.Timeout => {
  console.log('🗑️ Starting automatic alert cleanup service (runs every 2 hours)');
  
  // Run initial cleanup
  cleanupOldAlerts().catch(error => 
    console.error('Initial alert cleanup failed:', error)
  );
  
  // Schedule recurring cleanup
  const cleanupInterval = setInterval(() => {
    cleanupOldAlerts().catch(error => 
      console.error('Scheduled alert cleanup failed:', error)
    );
  }, ALERT_CONFIG.CLEANUP_INTERVAL_MS);
  
  return cleanupInterval;
};

/**
 * Stop automatic alert cleanup service
 */
export const stopAlertCleanupService = (interval: NodeJS.Timeout): void => {
  console.log('🛑 Stopping automatic alert cleanup service');
  clearInterval(interval);
};