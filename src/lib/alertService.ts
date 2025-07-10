import { supabase } from './supabase';
import { Alert } from '../types';

/**
 * Alert Service
 * Handles real-time alert generation and management using Supabase
 */

export interface DatabaseAlert {
  id: string;
  patient_id: string;
  patient_name: string;
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
    console.log('🔔 Fetching active alerts...');
    const now = new Date();
    console.log('Current time for alert fetch:', now.toISOString());
    
    const { data, error } = await supabase
      .from('patient_alerts')
      .select('*')
      .eq('acknowledged', false)
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }

    const alerts = (data || []).map(convertDatabaseAlert);
    console.log(`✅ Fetched ${alerts.length} active alerts`);
    return alerts;
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    return [];
  }
};

/**
 * Create a new alert
 */
export const createAlert = async (alert: Omit<DatabaseAlert, 'id' | 'created_at'>): Promise<Alert> => {
  try {
    console.log('🚨 Creating new alert:', alert);
    
    // Check if a similar alert already exists to prevent duplicates
    const { data: existingAlerts, error: checkError } = await supabase
      .from('patient_alerts')
      .select('id, message')
      .eq('patient_id', alert.patient_id)
      .eq('alert_type', 'medication_due') 
      .eq('acknowledged', false)
      .or(`message.ilike.%${alert.message.substring(0, 20)}%,message.ilike.%${alert.patient_name}%`)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking for existing alerts:', checkError);
    }
    
    // If a similar alert already exists, don't create a new one
    if (existingAlerts && existingAlerts.length > 0) { 
      console.log('⚠️ Similar alert already exists, skipping creation:', existingAlerts[0].message);
      
      // Return the existing alert
      const { data: existingAlert } = await supabase
        .from('patient_alerts')
        .select('*')
        .eq('id', existingAlerts[0].id)
        .single();
      
      return convertDatabaseAlert(existingAlert);
    }
    
    const { data, error } = await supabase
      .from('patient_alerts')
      .insert(alert)
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      throw error;
    }

    const newAlert = convertDatabaseAlert(data);
    console.log('✅ Alert created successfully:', newAlert);
    return newAlert;
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
    console.log('✅ Acknowledging alert:', alertId);
    
    const { error } = await supabase
      .from('patient_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }

    console.log('✅ Alert acknowledged successfully');
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
    
    // Get current time
    const now = new Date();
    console.log('Current time for medication check:', now.toISOString());
    
    // Get all active medications that are due now or overdue
    // This includes both medications due within the next hour AND overdue medications
    const { data: dueMedications, error } = await supabase
      .from('patient_medications') 
      .select(`
        *,
        patients!inner(id, first_name, last_name, patient_id)
      `)
      .eq('status', 'Active')
      .lte('next_due', now.toISOString())
      .order('next_due', { ascending: true });
    
    console.log(`Raw query result: ${dueMedications?.length || 0} medications due or overdue`);

    if (error) {
      console.error('Error checking medications:', error);
      return;
    }

    console.log(`Found ${dueMedications?.length || 0} medications due or overdue`);

    // Create alerts for due medications
    for (const medication of dueMedications || []) {
      const patient = medication.patients;
      
      // Ensure we have a valid date object for the due time
      let dueTime;
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
      
      const minutesUntilDue = Math.round((dueTime.getTime() - now.getTime()) / (1000 * 60));
      const isOverdue = minutesUntilDue < 0;
      
      console.log(`Medication ${medication.name} for ${patient.first_name} ${patient.last_name}:`);
      console.log(`- Due time: ${medication.next_due}`);
      console.log(`- Current time: ${now.toISOString()}`);
      console.log(`- Minutes until due: ${minutesUntilDue}`);
      console.log(`- Is overdue: ${isOverdue}`);
      
      // Check if alert already exists for this medication
      const { data: existingAlerts, error: alertCheckError } = await supabase
        .from('patient_alerts')
        .select('id, message')
        .eq('patient_id', patient.id) 
        .eq('alert_type', 'medication_due')
        .eq('acknowledged', false)
        .or(`message.ilike.%${medication.name}%,message.ilike.%overdue%`)
        .limit(1);

      if (alertCheckError) {
        console.error('Error checking for existing alerts:', alertCheckError);
      }
      
      if (alertCheckError) {
        console.error('Error checking for existing alerts:', alertCheckError);
      }
      
      console.log(`- Existing alerts: ${existingAlerts?.length || 0}`);
      if (existingAlerts && existingAlerts.length > 0) {
        console.log(`- Existing alert message: ${existingAlerts[0].message}`);
      }

      if (!existingAlerts || existingAlerts.length === 0) {
        const message = isOverdue 
          ? `${medication.name} ${medication.dosage} is overdue by ${Math.abs(minutesUntilDue)} minutes` 
          : `${medication.name} ${medication.dosage} is due ${minutesUntilDue <= 0 ? 'now' : `in ${minutesUntilDue} minutes`}`;

        // Set overdue medications to critical priority
        const priority = isOverdue ? 'critical' : (minutesUntilDue <= 30 ? 'high' : 'medium');
        
        const alertData: any = {
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          alert_type: 'medication_due',
          message: message,
          priority: priority,
          acknowledged: false,
          // For overdue medications, set a longer expiration time (8 hours for overdue, 2 hours for due soon)
          expires_at: new Date(now.getTime() + (isOverdue ? 8 : 2) * 60 * 60 * 1000).toISOString()
        };

        console.log(`Alert data for ${medication.name}:`, {
          patient: `${patient.first_name} ${patient.last_name}`,
          message,
          priority,
          isOverdue,
          minutesUntilDue
        });

        console.log(`Alert data for ${medication.name}:`, {
          patient: `${patient.first_name} ${patient.last_name}`,
          message,
          priority,
          isOverdue,
          minutesUntilDue
        });
        
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
    
    // Get recent vital signs (last 4 hours)
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    
    const { data: recentVitals, error } = await supabase
      .from('patient_vitals')
      .select(`
        *,
        patients!inner(id, first_name, last_name, patient_id)
      `)
      .gte('recorded_at', fourHoursAgo.toISOString())
      .order('recorded_at', { ascending: false });

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
        // Check if similar alert already exists
        const { data: existingAlerts } = await supabase
          .from('patient_alerts')
          .select('id')
          .eq('patient_id', patientId)
          .eq('alert_type', 'vital_signs')
          .eq('acknowledged', false)
          .ilike('message', `%${alertInfo.type}%`)
          .limit(1);

          if (!existingAlerts || existingAlerts.length === 0) {
            const alertData = {
              patient_id: patientId,
              patient_name: `${patient.first_name} ${patient.last_name}`,
              alert_type: 'vital_signs',
              message: alertInfo.message,
              priority: alertInfo.priority as 'low' | 'medium' | 'high' | 'critical',
              acknowledged: false,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
            };
            
            try {
              await createAlert(alertData);
            } catch (alertError) {
              console.error('Error creating vital signs alert:', alertError);
            }
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
    console.log('📊 Checking for missing vitals alerts...');

    // Get all active patients
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, patient_id')
      .neq('condition', 'Discharged')
      .order('created_at', { ascending: false });

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
        const { data: existingAlerts } = await supabase
          .from('patient_alerts')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('alert_type', 'vital_signs')
          .eq('acknowledged', false)
          .ilike('message', '%vitals overdue%')
          .limit(1);

        if (!existingAlerts || existingAlerts.length === 0) {
          const hoursOverdue = lastVital 
            ? Math.floor((now.getTime() - new Date(lastVital.recorded_at).getTime()) / (1000 * 60 * 60))
            : 24; // Assume 24 hours if no vitals ever recorded
          
          const alertData = {
            patient_id: patient.id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            alert_type: 'vital_signs',
            message: `Vital signs ${isPatientCritical ? 'CRITICAL' : ''} overdue - last recorded ${hoursOverdue} hours ago`,
            priority: isPatientCritical || hoursOverdue > 12 ? 'high' : 'medium',
            acknowledged: false,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          
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
  } catch (error) {
    console.error('Error checking patient condition:', error);
    return false;
  }
};

/**
 * Run all alert checks
 */
export const runAlertChecks = async (): Promise<void> => {
  try {
    console.log('🔄 Running comprehensive alert checks...');
    
    console.log('⏱️ Starting medication checks at:', new Date().toISOString());
    // Run medication checks first
    await checkMedicationAlerts();
    console.log('✅ Medication checks completed at:', new Date().toISOString()); 
    
    // Run other checks in parallel
    await Promise.all([
      checkVitalSignsAlerts(),
      checkMissingVitalsAlerts()
    ]);
    
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
 * Clean up expired alerts
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