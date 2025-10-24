import { supabase } from '../../lib/api/supabase';

export interface PatientLabelData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  patient_id: string;
  room_number?: string;
}

export interface MedicationLabelData {
  id: string;
  patient_id: string;
  patient_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescriber: string;
  date_prescribed: string;
}

export interface BulkLabelData {
  patients: PatientLabelData[];
  medications: MedicationLabelData[];
  totalCount: number;
  timestamp: string;
}

// Helper function to get current tenant ID
async function getCurrentTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found');
    throw new Error('User not authenticated');
  }

  console.log('🔍 Getting tenant for user:', user.id);

  const { data: tenantData, error } = await supabase
    .rpc('get_user_current_tenant', { target_user_id: user.id });

  if (error) {
    console.error('❌ Error fetching user tenant:', error);
    console.error('RPC error details:', { code: error.code, message: error.message, details: error.details });
    throw new Error(`Could not determine user tenant: ${error.message}`);
  }

  console.log('🏢 Tenant RPC result:', tenantData);

  if (!tenantData || !Array.isArray(tenantData) || tenantData.length === 0) {
    console.error('❌ No tenant data returned for user');
    throw new Error('User has no associated tenant');
  }

  const tenantId = tenantData[0]?.tenant_id;
  if (!tenantId) {
    console.error('❌ Invalid tenant data structure:', tenantData[0]);
    throw new Error('Invalid tenant data returned for user');
  }

  console.log('✅ Current tenant ID resolved:', tenantId);
  
  // Let's also check what tenant this corresponds to
  const { data: tenantInfo } = await supabase
    .from('tenants')
    .select('name, subdomain')
    .eq('id', tenantId)
    .single();
  
  console.log('🏥 Tenant info:', tenantInfo);
  
  return tenantId;
}

/**
 * Fetch all patient label data for the current tenant
 */
export async function fetchPatientLabels(providedTenantId?: string): Promise<PatientLabelData[]> {
  try {
    const tenantId = providedTenantId || await getCurrentTenantId();
    console.log('Fetching patient labels for tenant:', tenantId);

    const { data: patients, error } = await supabase
      .from('patients')
      .select(`
        id,
        first_name,
        last_name,
        date_of_birth,
        patient_id,
        room_number
      `)
      .eq('tenant_id', tenantId)
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching patient labels:', error);
      console.error('Error details:', { code: error.code, message: error.message, details: error.details });
      throw new Error(`Failed to fetch patient data for labels: ${error.message}`);
    }

    console.log('Successfully fetched patient labels:', patients?.length || 0, 'records');
    return patients || [];
  } catch (error) {
    console.error('Error in fetchPatientLabels:', error);
    throw error;
  }
}

/**
 * Fetch all medication label data for the current tenant
 */
export async function fetchMedicationLabels(providedTenantId?: string): Promise<MedicationLabelData[]> {
  try {
    const tenantId = providedTenantId || await getCurrentTenantId();
    console.log('🏥 Fetching medication labels for tenant:', tenantId);

    // Query medications by patient tenant_id (not medication tenant_id)
    // This is important for simulation tenants where patients belong to the simulation
    console.log('🔍 Querying medications via patient tenant relationship...');
    
    const { data: medications, error } = await supabase
      .from('patient_medications')
      .select(`
        id,
        patient_id,
        name,
        dosage,
        frequency,
        route,
        prescribed_by,
        start_date,
        status,
        patients!inner (
          first_name,
          last_name,
          tenant_id
        )
      `)
      .eq('patients.tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching medication labels:', error);
      console.error('Error details:', { code: error.code, message: error.message, details: error.details });
      throw new Error(`Failed to fetch medication data for labels: ${error.message}`);
    }

    console.log('✅ Successfully fetched medication records:', medications?.length || 0);
    console.log('📋 Raw medication data:', medications?.map(m => ({
      id: m.id,
      name: m.name,
      status: m.status,
      patient: Array.isArray(m.patients) ? m.patients[0] : m.patients
    })));

    // Filter for active medications only (case-insensitive)
    const activeMedications = (medications || []).filter(med => 
      med.status && (med.status.toLowerCase() === 'active')
    );
    
    console.log('🎯 Active medications after filter:', activeMedications.length);

    // Transform the data to include patient names
    const medicationLabels: MedicationLabelData[] = activeMedications.map(med => {
      const patient = Array.isArray(med.patients) ? med.patients[0] : med.patients;
      return {
        id: med.id,
        patient_id: med.patient_id,
        patient_name: `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim(),
        medication_name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        prescriber: med.prescribed_by,
        date_prescribed: med.start_date
      };
    });

    console.log('🎯 Transformed medication labels:', medicationLabels.length, 'records');
    return medicationLabels;
  } catch (error) {
    console.error('❌ Error in fetchMedicationLabels:', error);
    throw error;
  }
}

/**
 * Fetch all label data (patients and medications) for bulk printing
 */
export async function fetchAllLabelsForPrinting(tenantId?: string): Promise<BulkLabelData> {
  try {
    const [patients, medications] = await Promise.all([
      fetchPatientLabels(tenantId),
      fetchMedicationLabels(tenantId)
    ]);

    return {
      patients,
      medications,
      totalCount: patients.length + medications.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in fetchAllLabelsForPrinting:', error);
    throw error;
  }
}

/**
 * Format patient name for labels (Last, First)
 */
export function formatPatientNameForLabel(firstName: string, lastName: string): string {
  return `${lastName.toUpperCase()}, ${firstName}`;
}

/**
 * Format date for labels (MM/DD/YYYY)
 */
export function formatDateForLabel(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  try {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    return 0;
  }
}