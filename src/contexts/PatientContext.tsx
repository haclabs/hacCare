import React, { createContext, useState, useEffect } from 'react';
import { Patient } from '../types';
import { isSupabaseConfigured, checkDatabaseHealth } from '../lib/api/supabase';
import { 
  fetchPatients, 
  createPatient as createPatientDB, 
  updatePatient as updatePatientDB, 
  deletePatient as deletePatientDB 
} from '../services/patient/patientService';
import { 
  getPatientsByTenant,
  createPatientWithTenant,
  updatePatientWithTenant,
  deletePatientWithTenant
} from '../services/patient/multiTenantPatientService';
import { useTenant } from './TenantContext';

// MODULE LOAD TIMESTAMP - If you don't see this in console, browser is using cached code
// Used for debugging Vite HMR caching issues during development
console.log('PatientContext.tsx LOADED AT:', new Date().toISOString());

/**
 * Patient Context Interface
 */
interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (patientId: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  getPatient: (patientId: string) => Patient | undefined;
  loading: boolean;
  error: string | null;
  refreshPatients: () => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export { PatientContext };

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentTenant, isMultiTenantAdmin, selectedTenantId } = useTenant();

  /**
   * Load patients from database
   */
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading patients...');

      if (!isSupabaseConfigured) {
        console.error('❌ Supabase not configured');
        setPatients([]);
        setError('Database not configured. Please check your .env file and connect to Supabase.');
        return;
      }

      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.error('❌ Database connection failed');
        setPatients([]);
        setError('Database connection failed. Please check your Supabase configuration and internet connection.');
        return;
      }

      console.log('📊 Fetching patients from Supabase...');
      
      try {
        let dbPatients: Patient[] = [];

        if (isMultiTenantAdmin) {
          if (selectedTenantId) {
            // Super admin viewing a specific tenant
            console.log('🔓 Super admin viewing specific tenant:', selectedTenantId);
            const { data, error: tenantError } = await getPatientsByTenant(selectedTenantId);
            
            if (tenantError) {
              throw tenantError;
            }
            
            dbPatients = data || [];
          } else {
            // Super admin viewing all tenants
            console.log('🔓 Super admin access - fetching all patients from all tenants');
            dbPatients = await fetchPatients();
          }
        } else if (currentTenant) {
          // Regular users see only their tenant's patients
          console.log('🏢 Fetching patients for tenant:', currentTenant.name);
          const { data, error: tenantError } = await getPatientsByTenant(currentTenant.id);
          
          if (tenantError) {
            throw tenantError;
          }
          
          dbPatients = data || [];
        } else {
          // User has no tenant - show empty list
          console.log('⚠️ User has no tenant assigned');
          dbPatients = [];
          setError('You are not assigned to any organization. Please contact your administrator.');
        }

        console.log(`✅ Loaded ${dbPatients.length} patients from database`);
        setPatients(dbPatients);
      } catch (fetchError: any) {
        console.error('❌ Error fetching patients from database:', fetchError);
        setPatients([]);
        
        // Provide more specific error messages
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('NetworkError') ||
            fetchError.message?.includes('fetch') ||
            fetchError.message?.includes('Supabase not configured')) {
          setError('Failed to connect to database. Please check your Supabase configuration and internet connection.');
        } else {
          setError('Failed to load patients. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('❌ Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize patients on mount and when tenant changes
  useEffect(() => {
    loadPatients();
  }, [currentTenant, isMultiTenantAdmin, selectedTenantId]); // Reload when tenant context changes

  /**
   * Add a new patient with tenant association
   */
  const addPatient = async (patient: Patient) => {
    try {
      setError(null);
      
      if (!isSupabaseConfigured) {
        throw new Error('Database not configured. Please check your .env file and connect to Supabase.');
      }

      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Database connection failed. Please check your Supabase configuration and internet connection.');
      }

      console.log('Creating patient in database...');
      
      let newPatient: Patient;
      
      if (isMultiTenantAdmin) {
        // CRITICAL FIX (2025-11-07): Read tenant ID from localStorage at CALL TIME
        // NOTE: This is a fallback for code paths that use PatientContext directly.
        // Most patient creation now goes through React Query -> patientService (see patientService.ts:356)
        // 
        // REASON: TenantContext loads asynchronously, so closure-captured selectedTenantId
        // may be null/stale when this context initializes. Reading from localStorage
        // at call time ensures we get the current value.
        const freshTenantId = localStorage.getItem('superAdminTenantId');
        
        console.log('TENANT CONTEXT CHECK (AT CALL TIME):', {
          isMultiTenantAdmin,
          freshTenantId_from_localStorage: freshTenantId,
          selectedTenantId_from_closure: selectedTenantId,
          currentTenant_from_closure: currentTenant ? { id: currentTenant.id, name: currentTenant.name } : null,
        });
        
        const targetTenantId = freshTenantId || selectedTenantId || currentTenant?.id;
        
        if (targetTenantId) {
          // Super admin creating patient for selected tenant (including simulation templates)
          console.log('Super admin creating patient for tenant ID:', targetTenantId);
          console.log('ACTUAL TENANT_ID BEING USED:', targetTenantId);
          const { data, error } = await createPatientWithTenant(patient, targetTenantId);
          
          if (error) {
            throw error;
          }
          
          if (!data) {
            throw new Error('Failed to create patient - no data returned');
          }
          
          newPatient = data;
        } else {
          // Super admin creating patient without tenant restriction (global)
          console.log('🔓 Super admin creating global patient - no tenant selected');
          newPatient = await createPatientDB(patient);
        }
      } else if (currentTenant) {
        // Regular users create patients in their tenant
        console.log('🏢 Creating patient for tenant:', currentTenant.name);
        const { data, error } = await createPatientWithTenant(patient, currentTenant.id);
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error('Failed to create patient - no data returned');
        }
        
        newPatient = data;
      } else {
        throw new Error('You are not assigned to any organization. Please contact your administrator.');
      }
      
      setPatients(prev => [newPatient, ...prev]);
    } catch (err: any) {
      console.error('❌ Error adding patient:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('NetworkError') ||
          err.message?.includes('fetch') ||
          err.message?.includes('Supabase not configured')) {
        setError('Failed to connect to database. Please check your Supabase configuration.');
      } else {
        setError(err.message || 'Failed to add patient');
      }
      throw err;
    }
  };

  /**
   * Update an existing patient with tenant validation
   */
  const updatePatient = async (patientId: string, updates: Partial<Patient>) => {
    try {
      setError(null);
      
      if (!isSupabaseConfigured) {
        throw new Error('Database not configured. Please check your .env file and connect to Supabase.');
      }

      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Database connection failed. Please check your Supabase configuration and internet connection.');
      }

      const currentPatient = patients.find(p => p.id === patientId);
      if (!currentPatient) {
        throw new Error('Patient not found');
      }

      console.log('✏️ Updating patient in database...');
      
      let updated: Patient;
      
      if (isMultiTenantAdmin) {
        // Super admins can update any patient
        console.log('🔓 Super admin updating patient');
        updated = await updatePatientDB({ ...currentPatient, ...updates });
      } else if (currentTenant) {
        // Regular users can only update patients in their tenant
        console.log('🏢 Updating patient for tenant:', currentTenant.name);
        const { data, error } = await updatePatientWithTenant(
          patientId, 
          updates, 
          currentTenant.id
        );
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error('Failed to update patient - no data returned');
        }
        
        updated = data;
      } else {
        throw new Error('You are not assigned to any organization. Please contact your administrator.');
      }
      
      setPatients(prev => prev.map(patient => 
        patient.id === updated.id ? updated : patient
      ));
    } catch (err: any) {
      console.error('❌ Error updating patient:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('NetworkError') ||
          err.message?.includes('fetch') ||
          err.message?.includes('Supabase not configured')) {
        setError('Failed to connect to database. Please check your Supabase configuration.');
      } else {
        setError(err.message || 'Failed to update patient');
      }
      throw err;
    }
  };

  /**
   * Delete a patient with tenant validation
   */
  const deletePatient = async (patientId: string) => {
    try {
      setError(null);
      
      if (!isSupabaseConfigured) {
        throw new Error('Database not configured. Please check your .env file and connect to Supabase.');
      }

      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Database connection failed. Please check your Supabase configuration and internet connection.');
      }

      console.log('🗑️ Deleting patient from database...');
      
      if (isMultiTenantAdmin) {
        // Super admins can delete any patient
        console.log('🔓 Super admin deleting patient');
        await deletePatientDB(patientId);
      } else if (currentTenant) {
        // Regular users can only delete patients in their tenant
        console.log('🏢 Deleting patient for tenant:', currentTenant.name);
        const { error } = await deletePatientWithTenant(patientId, currentTenant.id);
        
        if (error) {
          throw error;
        }
      } else {
        throw new Error('You are not assigned to any organization. Please contact your administrator.');
      }
      
      setPatients(prev => prev.filter(patient => patient.id !== patientId));
    } catch (err: any) {
      console.error('❌ Error deleting patient:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('NetworkError') ||
          err.message?.includes('fetch') ||
          err.message?.includes('Supabase not configured')) {
        setError('Failed to connect to database. Please check your Supabase configuration.');
      } else {
        setError(err.message || 'Failed to delete patient');
      }
      throw err;
    }
  };

  /**
   * Get a specific patient by ID
   */
  const getPatient = (patientId: string) => {
    return patients.find(patient => patient.id === patientId);
  };

  /**
   * Refresh patients from database
   */
  const refreshPatients = async () => {
    console.log('🔄 Refreshing patients...');
    await loadPatients();
  };

  const value = {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    loading,
    error,
    refreshPatients
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};