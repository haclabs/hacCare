import { supabase } from '../../lib/api/supabase';
import { Patient, VitalSigns, PatientNote } from '../../types';
import type { NeuroAssessment, NeuroAssessmentInput } from '../../features/patients/types/neuroAssessment';
import type { BBITEntry, BBITEntryInput } from '../../features/patients/types/bbitEntry';
import { secureLogger } from '../../lib/security/secureLogger';

/**
 * Multi-Tenant Patient Service
 * Handles all database operations for patient data with tenant isolation
 */

export interface DatabasePatient {
  id: string;
  patient_id: string;
  tenant_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  room_number: string;
  bed_number: string;
  admission_date: string;
  condition: string;
  diagnosis: string;
  allergies: string[];
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  assigned_nurse?: string;
  avatar_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all patients for a specific tenant
 */
export async function getPatientsByTenant(tenantId: string): Promise<{ data: Patient[] | null; error: any }> {
  try {
    secureLogger.debug('📋 Fetching patients for tenant:', tenantId);
    
    const { data: patients, error } = await supabase
      .from('patients')
      .select(`
        *,
        patient_vitals:patient_vitals(*),
        patient_notes:patient_notes(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      secureLogger.error('Error fetching patients:', error);
      return { data: null, error };
    }

    // Convert to Patient format
    const convertedPatients = patients?.map((dbPatient: any) => 
      convertDatabasePatient(dbPatient, dbPatient.patient_vitals)
    ) || [];

    return { data: convertedPatients, error: null };
  } catch (error) {
    secureLogger.error('Error in getPatientsByTenant:', error);
    return { data: null, error };
  }
}

/**
 * Create a new patient with tenant association
 */
export async function createPatientWithTenant(
  patientData: any, // Accept any data and filter it
  tenantId: string
): Promise<{ data: Patient | null; error: any }> {
  try {
    secureLogger.debug('👤 Creating new patient for tenant:', tenantId);

    // Remove fields that don't belong in the patients table
    const { medications, vitals, notes, id, ...patientDataForDB } = patientData;

    const dbPatient = {
      ...patientDataForDB,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: patient, error } = await supabase
      .from('patients')
      .insert([dbPatient])
      .select()
      .single();

    if (error) {
      secureLogger.error('Error creating patient:', error);
      return { data: null, error };
    }

    const convertedPatient = convertDatabasePatient(patient);
    
    return { data: convertedPatient, error: null };
  } catch (error) {
    secureLogger.error('Error in createPatientWithTenant:', error);
    return { data: null, error };
  }
}

/**
 * Update patient (with tenant validation)
 */
export async function updatePatientWithTenant(
  patientId: string, 
  updates: any, // Accept any data and filter it
  tenantId: string
): Promise<{ data: Patient | null; error: any }> {
  try {
    secureLogger.debug('✏️ Updating patient:', patientId, 'for tenant:', tenantId);

    // First verify the patient belongs to the tenant
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingPatient) {
      return { data: null, error: { message: 'Patient not found or access denied' } };
    }

    // Remove fields that don't belong in the patients table
    const { medications, vitals, notes, id, ...updatesForDB } = updates;

    const { data: patient, error } = await supabase
      .from('patients')
      .update({ ...updatesForDB, updated_at: new Date().toISOString() })
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      secureLogger.error('Error updating patient:', error);
      return { data: null, error };
    }

    const convertedPatient = convertDatabasePatient(patient);
    
    return { data: convertedPatient, error: null };
  } catch (error) {
    secureLogger.error('Error in updatePatientWithTenant:', error);
    return { data: null, error };
  }
}

/**
 * Delete patient (with tenant validation)
 */
export async function deletePatientWithTenant(patientId: string, tenantId: string): Promise<{ error: any }> {
  try {
    secureLogger.debug('🗑️ Deleting patient:', patientId, 'for tenant:', tenantId);

    // First verify the patient belongs to the tenant
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingPatient) {
      return { error: { message: 'Patient not found or access denied' } };
    }

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId)
      .eq('tenant_id', tenantId);

    if (error) {
      secureLogger.error('Error deleting patient:', error);
      return { error };
    }

    // Log the deletion action
    secureLogger.debug('✅ Patient deleted successfully:', patientId);
    return { error: null };
  } catch (error) {
    secureLogger.error('Error in deletePatientWithTenant:', error);
    return { error };
  }
}

/**
 * Get patient by ID with tenant validation
 */
export async function getPatientByIdWithTenant(patientId: string, tenantId: string): Promise<{ data: Patient | null; error: any }> {
  try {
    secureLogger.debug('🔍 Fetching patient:', patientId, 'for tenant:', tenantId);
    
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *,
        patient_vitals:patient_vitals(*),
        patient_notes:patient_notes(*)
      `)
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      secureLogger.error('Error fetching patient:', error);
      return { data: null, error };
    }

    const convertedPatient = convertDatabasePatient(patient, patient.patient_vitals);
    return { data: convertedPatient, error: null };
  } catch (error) {
    secureLogger.error('Error in getPatientByIdWithTenant:', error);
    return { data: null, error };
  }
}

/**
 * Add vitals to patient with tenant validation
 */
export async function addVitalsWithTenant(
  patientId: string, 
  vitals: Omit<VitalSigns, 'id'>, 
  tenantId: string
): Promise<{ data: VitalSigns | null; error: any }> {
  try {
    secureLogger.debug('📊 Adding vitals for patient:', patientId, 'tenant:', tenantId);

    // First verify the patient belongs to the tenant
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingPatient) {
      return { data: null, error: { message: 'Patient not found or access denied' } };
    }

    // Build insert object dynamically - only include fields that have values
    // This supports partial vitals entry (e.g., newborns without BP readings)
    const dbVitals: any = {
      patient_id: patientId,
      tenant_id: tenantId,
      recorded_at: vitals.recorded_at || new Date().toISOString(),
      oxygen_delivery: vitals.oxygenDelivery || 'Room Air',
      oxygen_flow_rate: vitals.oxygenFlowRate || 'N/A'
    };

    // Only include vitals that were actually measured
    if (vitals.temperature != null) {
      dbVitals.temperature = vitals.temperature;
    }
    if (vitals.heartRate != null) {
      dbVitals.heart_rate = vitals.heartRate;
    }
    if (vitals.respiratoryRate != null) {
      dbVitals.respiratory_rate = vitals.respiratoryRate;
    }
    if (vitals.oxygenSaturation != null) {
      dbVitals.oxygen_saturation = vitals.oxygenSaturation;
    }
    
    // Blood pressure: include both or neither (must be a pair)
    if (vitals.bloodPressure?.systolic != null && vitals.bloodPressure?.diastolic != null) {
      dbVitals.blood_pressure_systolic = vitals.bloodPressure.systolic;
      dbVitals.blood_pressure_diastolic = vitals.bloodPressure.diastolic;
    }

    // Validate: at least one vital sign must be present
    const hasAtLeastOneVital = 
      dbVitals.temperature != null ||
      dbVitals.heart_rate != null ||
      dbVitals.respiratory_rate != null ||
      dbVitals.oxygen_saturation != null ||
      dbVitals.blood_pressure_systolic != null;

    if (!hasAtLeastOneVital) {
      return { data: null, error: { message: 'At least one vital sign measurement must be provided' } };
    }

    secureLogger.debug('📊 Recording partial vitals:', Object.keys(dbVitals).filter(k => k.includes('_') && dbVitals[k] != null));

    const { data: newVitals, error } = await supabase
      .from('patient_vitals')
      .insert([dbVitals])
      .select()
      .single();

    if (error) {
      secureLogger.error('Error adding vitals:', error);
      return { data: null, error };
    }

    const convertedVitals: VitalSigns = {
      id: newVitals.id,
      temperature: newVitals.temperature,
      bloodPressure: {
        systolic: newVitals.blood_pressure_systolic,
        diastolic: newVitals.blood_pressure_diastolic
      },
      heartRate: newVitals.heart_rate,
      respiratoryRate: newVitals.respiratory_rate,
      oxygenSaturation: newVitals.oxygen_saturation,
      oxygenDelivery: newVitals.oxygen_delivery || 'Room Air',
      oxygenFlowRate: newVitals.oxygen_flow_rate || 'N/A',
      recorded_at: newVitals.recorded_at,
      lastUpdated: newVitals.recorded_at
    };

    return { data: convertedVitals, error: null };
  } catch (error) {
    secureLogger.error('Error in addVitalsWithTenant:', error);
    return { data: null, error };
  }
}

/**
 * Add note to patient with tenant validation
 */
export async function addPatientNoteWithTenant(
  patientId: string, 
  note: Omit<PatientNote, 'id' | 'created_at'>, 
  tenantId: string
): Promise<{ data: PatientNote | null; error: any }> {
  try {
    secureLogger.debug('📝 Adding note for patient:', patientId, 'tenant:', tenantId);

    // First verify the patient belongs to the tenant
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existingPatient) {
      return { data: null, error: { message: 'Patient not found or access denied' } };
    }

    const dbNote = {
      ...note,
      patient_id: patientId,
      created_at: new Date().toISOString()
    };

    const { data: newNote, error } = await supabase
      .from('patient_notes')
      .insert([dbNote])
      .select()
      .single();

    if (error) {
      secureLogger.error('Error adding note:', error);
      return { data: null, error };
    }

    return { data: newNote, error: null };
  } catch (error) {
    secureLogger.error('Error in addPatientNoteWithTenant:', error);
    return { data: null, error };
  }
}

/**
 * Get tenant statistics
 */
export async function getTenantPatientStats(tenantId: string): Promise<{ 
  data: { 
    total: number; 
    by_condition: Record<string, number>; 
    recent_admissions: number; 
  } | null; 
  error: any 
}> {
  try {
    const { data: patients, error } = await supabase
      .from('patients')
      .select('condition, admission_date')
      .eq('tenant_id', tenantId);

    if (error) {
      return { data: null, error };
    }

    const total = patients?.length || 0;
    const by_condition = patients?.reduce((acc: Record<string, number>, patient) => {
      acc[patient.condition] = (acc[patient.condition] || 0) + 1;
      return acc;
    }, {}) || {};

    // Count recent admissions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent_admissions = patients?.filter(p => 
      new Date(p.admission_date) >= thirtyDaysAgo
    ).length || 0;

    return {
      data: {
        total,
        by_condition,
        recent_admissions
      },
      error: null
    };
  } catch (error) {
    secureLogger.error('Error in getTenantPatientStats:', error);
    return { data: null, error };
  }
}

/**
 * Convert database patient to app patient format
 */
const convertDatabasePatient = (dbPatient: DatabasePatient, vitals?: any[]): Patient => {
  return {
    id: dbPatient.id,
    patient_id: dbPatient.patient_id,
    tenant_id: dbPatient.tenant_id,
    first_name: dbPatient.first_name,
    last_name: dbPatient.last_name,
    date_of_birth: dbPatient.date_of_birth,
    gender: dbPatient.gender as 'Male' | 'Female' | 'Other',
    room_number: dbPatient.room_number,
    bed_number: dbPatient.bed_number,
    admission_date: dbPatient.admission_date,
    condition: dbPatient.condition as 'Critical' | 'Stable' | 'Improving' | 'Discharged',
    diagnosis: dbPatient.diagnosis,
    allergies: dbPatient.allergies || [],
    blood_type: dbPatient.blood_type,
    emergency_contact_name: dbPatient.emergency_contact_name,
    emergency_contact_relationship: dbPatient.emergency_contact_relationship,
    emergency_contact_phone: dbPatient.emergency_contact_phone,
    assigned_nurse: dbPatient.assigned_nurse,
    avatar_id: dbPatient.avatar_id,
    vitals: vitals ? convertDatabaseVitals(vitals) : [],
    medications: [], // Always initialize as empty array - medications loaded separately
    notes: [] // Will be loaded separately
  };
};

// ============================================================================
// Neuro Assessments
// ============================================================================

/**
 * Get all neuro assessments for a patient (oldest first for tick chart columns)
 */
export async function getNeuroAssessments(
  patientId: string,
  tenantId: string
): Promise<{ data: NeuroAssessment[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('patient_neuro_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: data as NeuroAssessment[], error: null };
  } catch (error) {
    secureLogger.error('Error in getNeuroAssessments:', error);
    return { data: null, error };
  }
}

/**
 * Add a neuro assessment for a patient
 */
export async function addNeuroAssessment(
  patientId: string,
  tenantId: string,
  assessment: NeuroAssessmentInput,
  studentName?: string
): Promise<{ data: NeuroAssessment | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('patient_neuro_assessments')
      .insert([{
        patient_id: patientId,
        tenant_id: tenantId,
        student_name: studentName || null,
        recorded_at: assessment.recorded_at || new Date().toISOString(),
        ...assessment,
      }])
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as NeuroAssessment, error: null };
  } catch (error) {
    secureLogger.error('Error in addNeuroAssessment:', error);
    return { data: null, error };
  }
}

// ─── BBIT (Basal-Bolus Insulin Therapy) ──────────────────────────────────────

export async function getBBITEntries(patientId: string, tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('patient_bbit_entries')
      .select('*')
      .eq('patient_id', patientId)
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: data as BBITEntry[], error: null };
  } catch (error) {
    secureLogger.error('Error in getBBITEntries:', error);
    return { data: null, error };
  }
}

export async function addBBITEntry(
  patientId: string,
  tenantId: string,
  entry: BBITEntryInput,
  studentName?: string,
) {
  try {
    const { data, error } = await supabase
      .from('patient_bbit_entries')
      .insert([{
        patient_id: patientId,
        tenant_id: tenantId,
        student_name: studentName || null,
        recorded_at: entry.recorded_at || new Date().toISOString(),
        ...entry,
      }])
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as BBITEntry, error: null };
  } catch (error) {
    secureLogger.error('Error in addBBITEntry:', error);
    return { data: null, error };
  }
}

/**
 * Convert database vitals to app vitals format
 */
const convertDatabaseVitals = (dbVitals: any[]): VitalSigns[] => {
  return dbVitals.map(vital => ({
    id: vital.id,
    temperature: vital.temperature,
    bloodPressure: {
      systolic: vital.blood_pressure_systolic,
      diastolic: vital.blood_pressure_diastolic
    },
    heartRate: vital.heart_rate,
    respiratoryRate: vital.respiratory_rate,
    oxygenSaturation: vital.oxygen_saturation,
    recorded_at: vital.recorded_at,
    lastUpdated: vital.recorded_at
  }));
};
