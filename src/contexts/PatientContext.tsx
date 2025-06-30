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
 * Defines the shape of the patient context for managing patient data across the app
 */
interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  getPatient: (patientId: string) => Patient | undefined;
  loading: boolean;
  error: string | null;
  refreshPatients: () => Promise<void>;
}

/**
 * Patient Context
 * React context for managing patient data throughout the application
 */
const PatientContext = createContext<PatientContextType | undefined>(undefined);

/**
 * Custom hook to access patient context
 * Throws an error if used outside of PatientProvider
 */
export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};

/**
 * Patient Provider Component
 * Manages patient state and provides patient functions to child components
 */
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

      if (isSupabaseConfigured) {
        console.log('Loading patients from Supabase...');
        const dbPatients = await fetchPatients();
        
        // If no patients in database, use mock data as initial data
        if (dbPatients.length === 0) {
          console.log('No patients in database, using mock data');
          setPatients(mockPatients);
        } else {
          console.log(`Loaded ${dbPatients.length} patients from database`);
          setPatients(dbPatients);
        }
      } else {
        console.log('Supabase not configured, using mock data');
        setPatients(mockPatients);
      }
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
      // Fallback to mock data on error
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
        console.log('Creating patient in database...');
        const newPatient = await createPatientDB(patient);
        setPatients(prev => [newPatient, ...prev]);
      } else {
        console.log('Adding patient to local state (Supabase not configured)');
        setPatients(prev => [patient, ...prev]);
      }
    } catch (err: any) {
      console.error('Error adding patient:', err);
      setError(err.message || 'Failed to add patient');
      throw err;
    }
  };

  /**
   * Update an existing patient
   */
  const updatePatient = async (updatedPatient: Patient) => {
    try {
      setError(null);
      
      if (isSupabaseConfigured) {
        console.log('Updating patient in database...');
        const updated = await updatePatientDB(updatedPatient);
        setPatients(prev => prev.map(patient => 
          patient.id === updated.id ? updated : patient
        ));
      } else {
        console.log('Updating patient in local state (Supabase not configured)');
        setPatients(prev => prev.map(patient => 
          patient.id === updatedPatient.id ? updatedPatient : patient
        ));
      }
    } catch (err: any) {
      console.error('Error updating patient:', err);
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
        console.log('Deleting patient from database...');
        await deletePatientDB(patientId);
      } else {
        console.log('Deleting patient from local state (Supabase not configured)');
      }
      
      setPatients(prev => prev.filter(patient => patient.id !== patientId));
    } catch (err: any) {
      console.error('Error deleting patient:', err);
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