import { supabase } from './supabase';

/**
 * Admission Service
 * Handles database operations for patient admission records and advanced directives
 */

export interface AdmissionRecord {
  id?: string;
  patient_id: string;
  admission_type: string;
  attending_physician: string;
  insurance_provider: string;
  insurance_policy: string;
  admission_source: string;
  chief_complaint: string;
  height: string;
  weight: string;
  bmi: string;
  smoking_status: string;
  alcohol_use: string;
  exercise: string;
  occupation: string;
  family_history: string;
  marital_status: string;
  secondary_contact_name: string;
  secondary_contact_relationship: string;
  secondary_contact_phone: string;
  secondary_contact_address: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdvancedDirective {
  id?: string;
  patient_id: string;
  living_will_status: string;
  living_will_date: string;
  healthcare_proxy_name: string;
  healthcare_proxy_phone: string;
  dnr_status: string;
  organ_donation_status: string;
  organ_donation_details: string;
  religious_preference: string;
  special_instructions: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch admission record for a patient
 */
export const fetchAdmissionRecord = async (patientId: string): Promise<AdmissionRecord | null> => {
  try {
    console.log('Fetching admission record for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_admission_records')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching admission record:', error);
      throw error;
    }

    console.log('Admission record result:', data);
    return data;
  } catch (error) {
    console.error('Error fetching admission record:', error);
    throw error;
  }
};

/**
 * Create or update admission record
 */
export const upsertAdmissionRecord = async (admissionRecord: AdmissionRecord): Promise<AdmissionRecord> => {
  try {
    console.log('Upserting admission record:', admissionRecord);
    
    const { data, error } = await supabase
      .from('patient_admission_records')
      .upsert(admissionRecord, {
        onConflict: 'patient_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting admission record:', error);
      throw error;
    }

    console.log('Admission record upserted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error upserting admission record:', error);
    throw error;
  }
};

/**
 * Fetch advanced directive for a patient
 */
export const fetchAdvancedDirective = async (patientId: string): Promise<AdvancedDirective | null> => {
  try {
    console.log('Fetching advanced directive for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_advanced_directives')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching advanced directive:', error);
      throw error;
    }

    console.log('Advanced directive result:', data);
    return data;
  } catch (error) {
    console.error('Error fetching advanced directive:', error);
    throw error;
  }
};

/**
 * Create or update advanced directive
 */
export const upsertAdvancedDirective = async (directive: AdvancedDirective): Promise<AdvancedDirective> => {
  try {
    console.log('Upserting advanced directive:', directive);
    
    const { data, error } = await supabase
      .from('patient_advanced_directives')
      .upsert(directive, {
        onConflict: 'patient_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting advanced directive:', error);
      throw error;
    }

    console.log('Advanced directive upserted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error upserting advanced directive:', error);
    throw error;
  }
};

/**
 * Create default admission record for a patient
 */
export const createDefaultAdmissionRecord = async (patientId: string): Promise<AdmissionRecord> => {
  console.log('Creating default admission record for patient:', patientId);
  
  // Create a completely empty record
  const emptyRecord: AdmissionRecord = {
    patient_id: patientId,
    admission_type: '',
    attending_physician: '',
    insurance_provider: '',
    insurance_policy: '',
    admission_source: '',
    chief_complaint: '',
    height: '',
    weight: '',
    bmi: '',
    smoking_status: '',
    alcohol_use: '',
    exercise: '',
    occupation: '',
    family_history: '',
    marital_status: '',
    secondary_contact_name: '',
    secondary_contact_relationship: '',
    secondary_contact_phone: '',
    secondary_contact_address: ''
  };

  return await upsertAdmissionRecord(emptyRecord);
};

/**
 * Create default advanced directive for a patient
 */
export const createDefaultAdvancedDirective = async (patientId: string): Promise<AdvancedDirective> => {
  console.log('Creating default advanced directive for patient:', patientId);
  
  // Create a completely empty directive
  const emptyDirective: AdvancedDirective = {
    patient_id: patientId,
    living_will_status: '',
    living_will_date: '',
    healthcare_proxy_name: '',
    healthcare_proxy_phone: '',
    dnr_status: '',
    organ_donation_status: '',
    organ_donation_details: '',
    religious_preference: '',
    special_instructions: ''
  };

  return await upsertAdvancedDirective(emptyDirective);
};