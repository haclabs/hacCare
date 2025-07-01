import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient } from '../types';
import { mockPatients } from '../data/mockData';
import { isSupabaseConfigured } from '../lib/supabase';
import { 
  fetchPatients, 
  createPatient as createPatientDB, 
  updatePatient as updatePatientDB, 
  deletePatient as deletePatientDB 
} from '../lib/patientService';

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

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load patients from database or use mock data
   */
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading patients...');

      if (isSupabaseConfigured) {
        console.log('📊 Fetching patients from Supabase...');
        
        try {
          const dbPatients = await fetchPatients();
          console.log(`✅ Loaded ${dbPatients.length} patients from database`);
          
          if (dbPatients.length === 0) {
            console.log('📝 No patients in database, using mock data as fallback');
            setPatients(mockPatients);
          } else {
            setPatients(dbPatients);
          }
        } catch (fetchError: any) {
          console.error('❌ Error fetching patients from database:', fetchError);
          console.log('📝 Falling back to mock data');
          setPatients(mockPatients);
          setError('Using demo data - database connection failed');
        }
      } else {
        console.log('📝 Supabase not configured, using mock data');
        setPatients(mockPatients);
        setError('Using demo data - database not configured');
      }
    } catch (err: any) {
      console.error('❌ Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
      // Always fall back to mock data on error
      console.log('📝 Using mock data as final fallback');
      setPatients(mockPatients);
    } finally {
      setLoading(false);
    }
  };

  // Initialize patients on mount
  useEffect(() => {
    loadPatients();
  }, []);

  /**
   * Add a new patient
   */
  const addPatient = async (patient: Patient) => {
    try {
      setError(null);
      
      if (isSupabaseConfigured) {
        console.log('➕ Creating patient in database...');
        const newPatient = await createPatientDB(patient);
        setPatients(prev => [newPatient, ...prev]);
      } else {
        console.log('➕ Adding patient to local state (demo mode)');
        setPatients(prev => [patient, ...prev]);
      }
    } catch (err: any) {
      console.error('❌ Error adding patient:', err);
      setError(err.message || 'Failed to add patient');
      throw err;
    }
  };

  /**
   * Update an existing patient
   */
  const updatePatient = async (patientId: string, updates: Partial<Patient>) => {
    try {
      setError(null);
      
      const currentPatient = patients.find(p => p.id === patientId);
      if (!currentPatient) {
        throw new Error('Patient not found');
      }

      const updatedPatient = { ...currentPatient, ...updates };
      
      if (isSupabaseConfigured) {
        console.log('✏️ Updating patient in database...');
        const updated = await updatePatientDB(updatedPatient);
        setPatients(prev => prev.map(patient => 
          patient.id === updated.id ? updated : patient
        ));
      } else {
        console.log('✏️ Updating patient in local state (demo mode)');
        setPatients(prev => prev.map(patient => 
          patient.id === patientId ? updatedPatient : patient
        ));
      }
    } catch (err: any) {
      console.error('❌ Error updating patient:', err);
      setError(err.message || 'Failed to update patient');
      throw err;
    }
  };

  /**
   * Delete a patient
   */
  const deletePatient = async (patientId: string) => {
    try {
      setError(null);
      
      if (isSupabaseConfigured) {
        console.log('🗑️ Deleting patient from database...');
        await deletePatientDB(patientId);
      } else {
        console.log('🗑️ Deleting patient from local state (demo mode)');
      }
      
      setPatients(prev => prev.filter(patient => patient.id !== patientId));
    } catch (err: any) {
      console.error('❌ Error deleting patient:', err);
      setError(err.message || 'Failed to delete patient');
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