import { supabase } from '../lib/api/supabase';

export interface AdvancedDirective {
  id?: string;
  patient_id: string;
  dnr_status: boolean | string; // Now accepts string values (R1, R2, R3, M1, M2, C1, C2)
  dnr_date?: string;
  dnr_physician?: string;
  medical_power_of_attorney?: string;
  medical_power_of_attorney_phone?: string;
  living_will_exists: boolean;
  living_will_location?: string;
  living_will_status?: string;  // Added for form compatibility
  living_will_date?: string;    // Added for form compatibility
  healthcare_proxy_name?: string; // Added for form compatibility
  healthcare_proxy_phone?: string; // Added for form compatibility
  organ_donation_status: boolean;
  organ_donation_details?: string; // Added for form compatibility
  specific_directives?: string;
  emergency_contact?: string;
  emergency_contact_phone?: string;
  advance_directive_date?: string;
  witness_signature?: string;
  notary_signature?: string;
  religious_preference?: string; // Added for form compatibility
  special_instructions?: string; // Added for form compatibility
  created_at?: string;
  updated_at?: string;
}

export async function fetchAdvancedDirective(patientId: string): Promise<AdvancedDirective | null> {
  try {
    const { data, error } = await supabase
      .from('patient_advanced_directives')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching advanced directive:', error);
    return null;
  }
}

export async function upsertAdvancedDirective(directive: AdvancedDirective): Promise<AdvancedDirective | null> {
  try {
    const { data, error } = await supabase
      .from('patient_advanced_directives')
      .upsert(directive, {
        onConflict: 'patient_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error upserting advanced directive:', error);
    throw error;
  }
}

export async function deleteAdvancedDirective(patientId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('patient_advanced_directives')
      .delete()
      .eq('patient_id', patientId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting advanced directive:', error);
    return false;
  }
}
