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
  
  const defaultRecord: AdmissionRecord = {
    patient_id: patientId,
    admission_type: 'Emergency',
    attending_physician: 'Dr. Sarah Wilson, MD',
    insurance_provider: 'Blue Cross Blue Shield',
    insurance_policy: 'BC123456789',
    admission_source: 'Emergency Department',
    chief_complaint: 'Chest pain and shortness of breath',
    height: '5\'10" (178 cm)',
    weight: '185 lbs (84 kg)',
    bmi: '26.5 (Overweight)',
    smoking_status: 'Former smoker (quit 5 years ago)',
    alcohol_use: 'Social drinker (2-3 drinks/week)',
    exercise: 'Sedentary lifestyle',
    occupation: 'Office manager (desk job)',
    family_history: 'Father: Myocardial infarction at age 58; Mother: Type 2 diabetes, hypertension; Brother: Hyperlipidemia',
    marital_status: 'Married, 2 children',
    secondary_contact_name: 'Robert Smith Jr.',
    secondary_contact_relationship: 'Son',
    secondary_contact_phone: '(555) 234-5678',
    secondary_contact_address: '456 Oak Ave, Nearby City, ST 12346'
  };

  return await upsertAdmissionRecord(defaultRecord);
};

/**
 * Create default advanced directive for a patient
 */
export const createDefaultAdvancedDirective = async (patientId: string): Promise<AdvancedDirective> => {
  console.log('Creating default advanced directive for patient:', patientId);
  
  const defaultDirective: AdvancedDirective = {
    patient_id: patientId,
    living_will_status: 'On File',
    living_will_date: '2024-01-10',
    healthcare_proxy_name: 'Mary Smith (Spouse)',
    healthcare_proxy_phone: '(555) 987-6543',
    dnr_status: 'Full Code',
    organ_donation_status: 'Registered organ donor',
    organ_donation_details: 'All organs and tissues',
    religious_preference: 'Catholic',
    special_instructions: 'Prefers family present for major decisions; Comfortable with medical students observing'
  };

  return await upsertAdvancedDirective(defaultDirective);
};