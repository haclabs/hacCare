import { supabase, isSupabaseConfigured, checkDatabaseHealth } from './supabase';
import { Alert } from '../types';
import { superAdminTenantService } from './superAdminTenantService';

/**
 * Alert Service Configuration
 */
export const ALERT_CONFIG = {
  // How often to check for new alerts (15 minutes)
  CHECK_INTERVAL_MS: 15 * 60 * 1000,
  
  // How long to keep alerts before auto-deletion (24 hours) 
  ALERT_RETENTION_HOURS: 24,
  
  // Polling interval for UI updates (15 minutes to match check interval)
  POLLING_INTERVAL_MS: 15 * 60 * 1000,
  
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
export const fetchActiveAlerts = async (): Promise<Alert[]> => {
  try {
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
    
    console.log('🔔 Fetching active alerts...');
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
 */
export const createAlert = async (alert: Omit<DatabaseAlert, 'id' | 'created_at'>): Promise<Alert> => {
  try {
    if (!supabase) {
      throw new Error('Cannot create alert - Supabase not configured')
    }

    // Validate that tenant_id is provided
    if (!alert.tenant_id) {
      throw new Error('Cannot create alert - tenant_id is required for multi-tenant support');
    }

    console.log('🚨 Creating new alert:', alert);
    
    // Try standard insert first
    const { data, error } = await supabase
      .from('patient_alerts')
      .insert(alert)
      .select()
      .single();

    // If successful, return the alert
    if (data && !error) {
      const newAlert = convertDatabaseAlert(data);
      console.log('✅ Alert created successfully:', newAlert);
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
    if (!supabase) {
      throw new Error('Cannot acknowledge alert - Supabase not configured')
    }

    console.log('✅ Acknowledging alert:', alertId);
    
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
 * Check for medication due alerts
 */
export const checkMedicationAlerts = async (): Promise<void> => {
  try {
    console.log('💊 Checking for medication due alerts...');
    console.log('Current time for medication check:', new Date().toISOString());
    
    // Get current tenant filter (null = all tenants, specific ID = that tenant only)
    const tenantFilter = await getCurrentTenantFilter();
    
    // Get current time
    const now = new Date();
    
    // Build query with optional tenant filtering
    let query = supabase
      .from('patient_medications')
      .select(`
        *,
        patients!inner(id, first_name, last_name, patient_id, tenant_id)
      `)
      .eq('status', 'Active')
      .lte('next_due', new Date(now.getTime() + 60 * 60 * 1000).toISOString());
    
    // Apply tenant filter if super admin has selected specific tenant
    if (tenantFilter) {
      query = query.eq('patients.tenant_id', tenantFilter);
      console.log(`🎯 Filtering medications for tenant: ${tenantFilter}`);
    }
    
    const { data: dueMedications, error } = await query.order('next_due', { ascending: true });    console.log(`Raw query result: ${dueMedications?.length || 0} medications due or overdue`);

    if (error) {
      console.error('Error checking medications:', error);
      return;
    }

    console.log(`Found ${dueMedications?.length || 0} medications due or overdue`);

    // Create alerts for due medications
    for (const medication of dueMedications || []) {
      const patient = medication.patients;
      
      // Skip PRN medications as they are only given as needed, not on schedule
      if (medication.category === 'prn') {
        console.log(`Skipping PRN medication ${medication.name} - not scheduled`);
        continue;
      }
      
      // Ensure we have a valid date object for the due time
      let dueTime: Date;
      try {
        dueTime = new Date(medication.next_due);
        if (isNaN(dueTime.getTime())) {
          console.error('Invalid date format for next_due:', medication.next_due);
          dueTime = new Date(); // Fallback to current time
        }
      } catch (error) {
        console.error('Error parsing next_due date:', error);
        dueTime = new Date(); // Fallback to current time
      }
      
      // Calculate if medication is overdue
      const minutesUntilDue = Math.round((dueTime.getTime() - now.getTime()) / (1000 * 60));
      const isOverdue = minutesUntilDue <= 0;
      const isDueSoon = !isOverdue && minutesUntilDue <= 60;
      
      console.log(`Medication ${medication.name} for ${patient.first_name} ${patient.last_name}:`);
      console.log(`- Due time: ${medication.next_due}`);
      console.log(`- Current time: ${now.toISOString()}`);
      console.log(`- Minutes until due: ${minutesUntilDue}`);
      console.log(`- Is overdue: ${isOverdue}`);
      console.log(`- Is due soon: ${isDueSoon}`);
      console.log(`- Is due soon: ${isDueSoon}`);
      
      // Improved check for existing alerts - more specific to avoid duplicates
      let existingAlerts = null;
      let alertCheckError = null;
      
      try {
        const result = await supabase
          .from('patient_alerts')
          .select('id, message, created_at, priority')
          .eq('patient_id', patient.id) 
          .eq('alert_type', 'medication_due')
          .eq('acknowledged', false)
          .ilike('message', `%${medication.name}%`)
          .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // Only check alerts from last 2 hours
          .order('created_at', { ascending: false })
          .limit(1);
        
        existingAlerts = result.data;
        alertCheckError = result.error;
      } catch (err) {
        console.error('Error checking for existing alerts:', err);
        alertCheckError = err;
      }

      if (alertCheckError) {
        console.error('Error checking for existing alerts:', alertCheckError);
      }
      
      // Log existing alerts for debugging
      console.log(`- Existing alerts found: ${existingAlerts?.length || 0}`);
      existingAlerts?.forEach(alert => {
        console.log(`  - Alert: ${alert.message} (created: ${alert.created_at})`);
      });

      // Create alert if no existing alert or if status changed (e.g., from due soon to overdue)
      const existingIsOverdue = existingAlerts?.[0]?.message?.toLowerCase().includes('overdue');
      const statusChanged = (isOverdue && !existingIsOverdue) || (!isOverdue && existingIsOverdue);
      const priorityChanged = existingAlerts?.[0] && (
        (isOverdue && existingAlerts[0].priority !== 'critical') || 
        (isDueSoon && existingAlerts[0].priority !== 'high')
      );
      
      if (!existingAlerts || existingAlerts.length === 0 || statusChanged || priorityChanged) {
        // If status changed and there's an existing alert, acknowledge it first
        if ((statusChanged || priorityChanged) && existingAlerts && existingAlerts.length > 0) {
          console.log(`Status or priority changed, acknowledging old alert`);
          try {
            await supabase
              .from('patient_alerts')
              .update({ acknowledged: true })
              .eq('id', existingAlerts[0].id);
          } catch (ackError) {
            console.error('Error acknowledging old alert:', ackError);
          }
        }
        
        const message = isOverdue 
          ? `OVERDUE: ${medication.name} ${medication.dosage} is overdue by ${Math.abs(minutesUntilDue)} minutes` 
          : `${medication.name} ${medication.dosage} is due ${minutesUntilDue <= 0 ? 'now' : `in ${minutesUntilDue} minutes`}`;

        // Set priority based on status
        const priority = isOverdue ? 'critical' : (isDueSoon ? 'high' : 'medium');
        
        const alertData: any = {
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          tenant_id: patient.tenant_id,
          alert_type: 'medication_due',
          message: message,
          priority: priority,
          acknowledged: false,
          // For overdue medications, set a longer expiration time (12 hours for overdue, 2 hours for due soon)
          expires_at: new Date(now.getTime() + (isOverdue ? 12 : 2) * 60 * 60 * 1000).toISOString()
        };
        
        console.log(`Creating alert:`, alertData);
        try {
          const newAlert = await createAlert(alertData);
          console.log(`Created alert for ${medication.name}:`, newAlert);
        } catch (alertError) {
          console.error(`Error creating alert for ${medication.name}:`, alertError);
        }
      }
    }
  } catch (error) {
    console.error('Error checking medication alerts:', error);
  }
};

/**
 * Check for vital signs alerts
 */
export const checkVitalSignsAlerts = async (): Promise<void> => {
  try {
    console.log('🫀 Checking for vital signs alerts...');
    
    // Get current tenant filter
    const tenantFilter = await getCurrentTenantFilter();
    
    // Get recent vital signs (last 4 hours)
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    
    // Build query with optional tenant filtering
    let query = supabase
      .from('patient_vitals')
      .select(`
        *,
        patients!inner(id, first_name, last_name, patient_id, tenant_id)
      `)
      .gte('recorded_at', fourHoursAgo.toISOString());
    
    // Apply tenant filter if super admin has selected specific tenant
    if (tenantFilter) {
      query = query.eq('patients.tenant_id', tenantFilter);
      console.log(`🎯 Filtering vital signs for tenant: ${tenantFilter}`);
    }
    
    const { data: recentVitals, error } = await query;

    if (error) {
      console.error('Error checking vital signs:', error);
      return;
    }

    // Group by patient and get latest vitals
    const latestVitalsByPatient = new Map();
    for (const vital of recentVitals || []) {
      if (!latestVitalsByPatient.has(vital.patient_id)) {
        latestVitalsByPatient.set(vital.patient_id, vital);
      }
    }

    // Check each patient's latest vitals for abnormal values
    for (const [patientId, vital] of latestVitalsByPatient) {
      const patient = vital.patients;
      const alerts = [];

      // Temperature alerts (using Celsius)
      if (vital.temperature > 38.0 || vital.temperature < 36.0) {
        alerts.push({
          type: 'Temperature',
          message: `Temperature ${vital.temperature.toFixed(1)}°C - ${vital.temperature > 38.0 ? 'Fever' : 'Hypothermia'}`,
          priority: vital.temperature > 39.0 || vital.temperature < 35.5 ? 'critical' : 'high'
        });
      }

      // Blood pressure alerts
      if (vital.blood_pressure_systolic > 180 || vital.blood_pressure_systolic < 90 ||
          vital.blood_pressure_diastolic > 110 || vital.blood_pressure_diastolic < 60) {
        alerts.push({
          type: 'Blood Pressure',
          message: `Blood Pressure ${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic} mmHg - ${
            vital.blood_pressure_systolic > 180 || vital.blood_pressure_diastolic > 110 ? 'Hypertensive Crisis' : 'Hypotension'
          }`,
          priority: vital.blood_pressure_systolic > 180 || vital.blood_pressure_diastolic > 110 ? 'critical' : 'high'
        });
      }

      // Heart rate alerts
      if (vital.heart_rate > 120 || vital.heart_rate < 50) {
        alerts.push({
          type: 'Heart Rate',
          message: `Heart Rate ${vital.heart_rate} BPM - ${vital.heart_rate > 120 ? 'Tachycardia' : 'Bradycardia'}`,
          priority: vital.heart_rate > 150 || vital.heart_rate < 40 ? 'critical' : 'high'
        });
      }

      // Oxygen saturation alerts
      if (vital.oxygen_saturation < 95) {
        alerts.push({
          type: 'Oxygen Saturation',
          message: `O2 Saturation ${vital.oxygen_saturation}% - Hypoxemia`,
          priority: vital.oxygen_saturation < 90 ? 'critical' : 'high'
        });
      }

      // Respiratory rate alerts
      if (vital.respiratory_rate > 24 || vital.respiratory_rate < 12) {
        alerts.push({
          type: 'Respiratory Rate',
          message: `Respiratory Rate ${vital.respiratory_rate}/min - ${
            vital.respiratory_rate > 24 ? 'Tachypnea' : 'Bradypnea'
          }`,
          priority: vital.respiratory_rate > 30 || vital.respiratory_rate < 8 ? 'critical' : 'high'
        });
      }

      // Create alerts for abnormal vitals
      for (const alertInfo of alerts) {
        // Check if similar alert already exists for this patient and vital type
        const { data: existingAlerts } = await supabase
          .from('patient_alerts')
          .select('id, created_at')
          .eq('patient_id', patientId)
          .eq('alert_type', 'vital_signs')
          .eq('acknowledged', false)
          .ilike('message', `%${alertInfo.type}%`)
          .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Only check alerts from last 4 hours
          .limit(1);

          if (!existingAlerts || existingAlerts.length === 0) {
            const alertData = {
              patient_id: patientId,
              patient_name: `${patient.first_name} ${patient.last_name}`,
              tenant_id: patient.tenant_id,
              alert_type: 'vital_signs' as const,
              message: alertInfo.message,
              priority: alertInfo.priority as 'low' | 'medium' | 'high' | 'critical',
              acknowledged: false,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
            };
            
            try {
              await createAlert(alertData);
              console.log(`✅ Created vital signs alert: ${alertInfo.message}`);
            } catch (alertError) {
              console.error('Error creating vital signs alert:', alertError);
            }
          } else {
            console.log(`⏭️ Skipping duplicate vital signs alert for ${alertInfo.type} - existing alert found`);
          }
      }
    }
  } catch (error) {
    console.error('Error checking vital signs alerts:', error);
  }
};

/**
 * Check for patients who haven't had vitals recorded recently
 */
export const checkMissingVitalsAlerts = async (): Promise<void> => {
  try {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured, skipping missing vitals alerts check');
      return;
    }

    console.log('📊 Checking for missing vitals alerts...');

    // Get current tenant filter
    const tenantFilter = await getCurrentTenantFilter();

    // Build query with optional tenant filtering
    let query = supabase
      .from('patients')
      .select('id, first_name, last_name, patient_id, tenant_id')
      .neq('condition', 'Discharged')
      .order('created_at', { ascending: false });
    
    // Apply tenant filter if super admin has selected specific tenant
    if (tenantFilter) {
      query = query.eq('tenant_id', tenantFilter);
      console.log(`🎯 Filtering missing vitals check for tenant: ${tenantFilter}`);
    }

    const { data: patients, error: patientsError } = await query;

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return;
    }

    // Check each patient's last vitals
    for (const patient of patients || []) {
      const { data: lastVital } = await supabase
        .from('patient_vitals')
        .select('recorded_at')
        .eq('patient_id', patient.id) 
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      // Different thresholds based on patient condition
      const isPatientCritical = await isPatientConditionCritical(patient.id);
      const hoursThreshold = isPatientCritical ? 4 : 8;
      const hoursAgo = new Date(now.getTime() - hoursThreshold * 60 * 60 * 1000);
      
      // If no vitals or last vitals older than 8 hours
      if (!lastVital || new Date(lastVital.recorded_at) < hoursAgo) {
        // Check if alert already exists
        let existingAlerts = null;
        
        try {
          // Add defensive check to ensure patient object exists and has an id
          if (!patient || !patient.id) {
            console.error('Invalid patient object:', patient);
            continue; // Skip to next patient
          }
          
          const result = await supabase
            .from('patient_alerts')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('alert_type', 'vital_signs')
            .eq('acknowledged', false)
            .ilike('message', '%vitals overdue%')
            .limit(1);
            
          existingAlerts = result.data;
        } catch (err) {
          console.error('Error checking for existing vital alerts:', err);
          continue; // Skip to next patient if there's an error
        }

        if (!existingAlerts || existingAlerts.length === 0) {
          const hoursOverdue = lastVital 
            ? Math.floor((now.getTime() - new Date(lastVital.recorded_at).getTime()) / (1000 * 60 * 60))
            : 24; // Assume 24 hours if no vitals ever recorded
          
          // Double-check patient object again for safety
          if (!patient || !patient.id) {
            console.error('Patient object is invalid:', patient);
            continue;
          }
          
          const alertData: Omit<DatabaseAlert, 'id' | 'created_at'> = {
            patient_id: patient.id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            tenant_id: patient.tenant_id,
            alert_type: 'vital_signs',
            message: `Vital signs ${isPatientCritical ? 'CRITICAL' : ''} overdue - last recorded ${hoursOverdue} hours ago`,
            priority: (isPatientCritical || hoursOverdue > 12 ? 'high' : 'medium') as 'low' | 'medium' | 'high' | 'critical',
            acknowledged: false,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          
          // Debug logging to check patient and alert data
          console.log('🔍 Patient data:', {
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`,
            tenant_id: patient.tenant_id,
            hasAllFields: !!(patient.id && patient.first_name && patient.last_name && patient.tenant_id)
          });
          console.log('🔍 Alert data being created:', alertData);
          
          try {
            await createAlert(alertData);
            console.log(`Created missing vitals alert for patient ${patient.first_name} ${patient.last_name}`);
          } catch (alertError) {
            console.error(`Error creating missing vitals alert:`, alertError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking missing vitals alerts:', error);
  }
};

/**
 * Check if a patient's condition is critical
 */
const isPatientConditionCritical = async (patientId: string): Promise<boolean> => {
  try {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured, skipping patient condition check');
      return false;
    }

    // Check database health first
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.warn('📱 Database unavailable - cannot check patient condition');
      return false;
    }

    const { data, error } = await supabase
      .from('patients')
      .select('condition')
      .eq('id', patientId)
      .single();
    
    if (error) {
      console.error('Error checking patient condition:', error);
      return false;
    }
    
    return data?.condition === 'Critical';
  } catch (error: any) {
    console.error('Error checking patient condition:', error?.message || error);
    // Don't throw error, just return false to prevent app crashes
    return false;
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
      
      // For medication alerts, extract medication name for grouping
      if (alert.alert_type === 'medication_due') {
        const medicationMatch = alert.message.match(/^(OVERDUE: )?([^0-9]+)/);
        messageKey = medicationMatch ? medicationMatch[2].trim() : alert.message;
      }
      
      // For vital signs alerts, extract vital type for grouping
      if (alert.alert_type === 'vital_signs') {
        const vitalMatch = alert.message.match(/^(Temperature|Blood Pressure|Heart Rate|Oxygen Saturation|Respiratory Rate)/);
        messageKey = vitalMatch ? vitalMatch[1] : alert.message;
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
export const runAlertChecks = async (): Promise<void> => {
  try {
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

    console.log('🔄 Running comprehensive alert checks...');
    
    // Clean up old alerts first (older than 24 hours)
    await cleanupOldAlerts();
    
    // Clean up duplicates
    await cleanupDuplicateAlerts();
    
    console.log('⏱️ Starting medication checks at:', new Date().toISOString());
    // Run medication checks first
    await checkMedicationAlerts();
    console.log('✅ Medication checks completed at:', new Date().toISOString()); 
    
    // Run other checks in parallel
    await Promise.all([
      checkVitalSignsAlerts(),
      checkMissingVitalsAlerts()
    ]);
    
    // Clean up duplicates again after generating new alerts
    await cleanupDuplicateAlerts();
    
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
    console.log('🧹 Cleaning up alerts older than 24 hours...');
    
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    console.log(`🕒 Deleting alerts created before: ${twentyFourHoursAgo.toISOString()}`);
    
    // Get alerts older than 24 hours to delete them in batches
    const { data: oldAlerts, error: fetchError } = await supabase
      .from('patient_alerts')
      .select('id')
      .lt('created_at', twentyFourHoursAgo.toISOString());

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