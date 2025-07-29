/**
 * Temporary bypass version of medication fetching
 * This will help us debug the tenant issue by using the regular client with error logging
 */

import { supabase } from './supabase';

/**
 * Fetch patient medications with detailed debugging
 */
export const fetchPatientMedicationsDebug = async (patientId: string) => {
  try {
    console.log('🔧 DEBUG: Fetching medications with detailed logging for patient:', patientId);
    
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔧 DEBUG: Current user:', user?.id, user?.email);
    
    // Check if user has tenant assignment
    const { data: userTenant, error: tenantError } = await supabase
      .rpc('get_user_current_tenant', { target_user_id: user?.id });
    
    console.log('🔧 DEBUG: User tenant data:', userTenant);
    console.log('🔧 DEBUG: Tenant error:', tenantError);
    
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    console.log('🔧 DEBUG: Medications query result:', { data, error });
    console.log('🔧 DEBUG: Found medications count:', data?.length || 0);

    if (error) {
      console.error('❌ Error fetching medications (debug):', error);
      throw error;
    }

    // Map to the expected format
    const medications = data?.map(dbMed => ({
      id: dbMed.id,
      patient_id: dbMed.patient_id,
      name: dbMed.name,
      category: dbMed.category || 'scheduled',
      dosage: dbMed.dosage,
      frequency: dbMed.frequency,
      route: dbMed.route,
      start_date: dbMed.start_date,
      end_date: dbMed.end_date,
      prescribed_by: dbMed.prescribed_by || '',
      status: dbMed.status || 'Active',
      last_administered: dbMed.last_administered,
      next_due: dbMed.next_due,
      instructions: dbMed.instructions || '',
      tenant_id: dbMed.tenant_id
    })) || [];

    console.log('🔧 DEBUG: Processed medications:', medications);
    return medications;
  } catch (error) {
    console.error('💥 DEBUG: Error in fetchPatientMedicationsDebug:', error);
    return [];
  }
};
