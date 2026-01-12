import { supabase } from '../../lib/api/supabase';
import { Patient, VitalSigns, PatientNote } from '../../types';

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
  assigned_nurse: string;
  avatar_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all patients for a specific tenant
 */
export async function getPatientsByTenant(tenantId: string): Promise<{ data: Patient[] | null; error: any }> {
  try {
    console.log('📋 Fetching patients for tenant:', tenantId);
    
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
      console.error('Error fetching patients:', error);
      return { data: null, error };
    }

    // Convert to Patient format
    const convertedPatients = patients?.map((dbPatient: any) => 
      convertDatabasePatient(dbPatient, dbPatient.patient_vitals)
    ) || [];

    return { data: convertedPatients, error: null };
  } catch (error) {
    console.error('Error in getPatientsByTenant:', error);
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
    console.log('👤 Creating new patient for tenant:', tenantId);

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
      console.error('Error creating patient:', error);
      return { data: null, error };
    }

    const convertedPatient = convertDatabasePatient(patient);
    
    return { data: convertedPatient, error: null };
  } catch (error) {
    console.error('Error in createPatientWithTenant:', error);
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
    console.log('✏️ Updating patient:', patientId, 'for tenant:', tenantId);

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
      console.error('Error updating patient:', error);
      return { data: null, error };
    }

    const convertedPatient = convertDatabasePatient(patient);
    
    return { data: convertedPatient, error: null };
  } catch (error) {
    console.error('Error in updatePatientWithTenant:', error);
    return { data: null, error };
  }
}

/**
 * Delete patient (with tenant validation)
 */
export async function deletePatientWithTenant(patientId: string, tenantId: string): Promise<{ error: any }> {
  try {
    console.log('🗑️ Deleting patient:', patientId, 'for tenant:', tenantId);

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
      console.error('Error deleting patient:', error);
      return { error };
    }

    // Log the deletion action
    console.log('✅ Patient deleted successfully:', patientId);
    return { error: null };
  } catch (error) {
    console.error('Error in deletePatientWithTenant:', error);
    return { error };
  }
}

/**
 * Get patient by ID with tenant validation
 */
export async function getPatientByIdWithTenant(patientId: string, tenantId: string): Promise<{ data: Patient | null; error: any }> {
  try {
    console.log('🔍 Fetching patient:', patientId, 'for tenant:', tenantId);
    
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
      console.error('Error fetching patient:', error);
      return { data: null, error };
    }

    const convertedPatient = convertDatabasePatient(patient, patient.patient_vitals);
    return { data: convertedPatient, error: null };
  } catch (error) {
    console.error('Error in getPatientByIdWithTenant:', error);
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
    console.log('📊 Adding vitals for patient:', patientId, 'tenant:', tenantId);

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

    const dbVitals = {
      patient_id: patientId,
      temperature: vitals.temperature,
      blood_pressure_systolic: vitals.bloodPressure.systolic,
      blood_pressure_diastolic: vitals.bloodPressure.diastolic,
      heart_rate: vitals.heartRate,
      respiratory_rate: vitals.respiratoryRate,
      oxygen_saturation: vitals.oxygenSaturation,
      oxygen_delivery: vitals.oxygenDelivery || 'Room Air',
      oxygen_flow_rate: vitals.oxygenFlowRate || 'N/A',
      recorded_at: vitals.recorded_at || new Date().toISOString()
    };

    const { data: newVitals, error } = await supabase
      .from('patient_vitals')
      .insert([dbVitals])
      .select()
      .single();

    if (error) {
      console.error('Error adding vitals:', error);
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
    console.error('Error in addVitalsWithTenant:', error);
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
    console.log('📝 Adding note for patient:', patientId, 'tenant:', tenantId);

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
      console.error('Error adding note:', error);
      return { data: null, error };
    }

    return { data: newNote, error: null };
  } catch (error) {
    console.error('Error in addPatientNoteWithTenant:', error);
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
    console.error('Error in getTenantPatientStats:', error);
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
