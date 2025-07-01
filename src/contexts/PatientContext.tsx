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
  updatePatient: (patientId: string, updates: Partial<Patient>) => Promise<void>;
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
   * Load patients from database or use mock data with enhanced error handling
   */
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading patients...');

      if (isSupabaseConfigured) {
        console.log('Loading patients from Supabase...');
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const dbPatients = await Promise.race([
            fetchPatients(),
            new Promise<Patient[]>((_, reject) => 
              setTimeout(() => reject(new Error('Patient fetch timeout')), 10000)
            )
          ]);
          
          clearTimeout(timeoutId);
          
          // If no patients in database, use mock data as initial data
          if (dbPatients.length === 0) {
            console.log('No patients in database, using mock data');
            setPatients(mockPatients);
          } else {
            console.log(`Loaded ${dbPatients.length} patients from database`);
            setPatients(dbPatients);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
            console.error('❌ Patient fetch timeout, falling back to mock data');
          } else if (fetchError.message?.includes('Failed to fetch') || 
                     fetchError.message?.includes('NetworkError')) {
            console.error('❌ Network error fetching patients, falling back to mock data');
          } else {
            console.error('❌ Error fetching patients:', fetchError);
          }
          
          // Always fall back to mock data on any error
          console.log('Using mock data as fallback');
          setPatients(mockPatients);
        }
      } else {
        console.log('Supabase not configured, using mock data');
        setPatients(mockPatients);
      }
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
      // Fallback to mock data on error
      console.log('Using mock data as fallback due to error');
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
   * Add a new patient with enhanced error handling
   */
  const addPatient = async (patient: Patient) => {
    try {
      setError(null);
      
      if (isSupabaseConfigured) {
        console.log('Creating patient in database...');
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const newPatient = await Promise.race([
            createPatientDB(patient),
            new Promise<Patient>((_, reject) => 
              setTimeout(() => reject(new Error('Patient creation timeout')), 10000)
            )
          ]);
          
          clearTimeout(timeoutId);
          setPatients(prev => [newPatient, ...prev]);
        } catch (createError: any) {
          clearTimeout(timeoutId);
          
          if (createError.name === 'AbortError' || createError.message?.includes('timeout')) {
            throw new Error('Request timeout - please try again');
          } else if (createError.message?.includes('Failed to fetch') || 
                     createError.message?.includes('NetworkError')) {
            throw new Error('Network error - please check your connection');
          } else {
            throw createError;
          }
        }
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
   * Update an existing patient with enhanced error handling
   */
  const updatePatient = async (patientId: string, updates: Partial<Patient>) => {
    try {
      setError(null);
      
      // Find the current patient
      const currentPatient = patients.find(p => p.id === patientId);
      if (!currentPatient) {
        throw new Error('Patient not found');
      }

      // Create updated patient object
      const updatedPatient = { ...currentPatient, ...updates };
      
      if (isSupabaseConfigured) {
        console.log('Updating patient in database...');
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const updated = await Promise.race([
            updatePatientDB(updatedPatient),
            new Promise<Patient>((_, reject) => 
              setTimeout(() => reject(new Error('Patient update timeout')), 10000)
            )
          ]);
          
          clearTimeout(timeoutId);
          setPatients(prev => prev.map(patient => 
            patient.id === updated.id ? updated : patient
          ));
        } catch (updateError: any) {
          clearTimeout(timeoutId);
          
          if (updateError.name === 'AbortError' || updateError.message?.includes('timeout')) {
            throw new Error('Request timeout - please try again');
          } else if (updateError.message?.includes('Failed to fetch') || 
                     updateError.message?.includes('NetworkError')) {
            throw new Error('Network error - please check your connection');
          } else {
            throw updateError;
          }
        }
      } else {
        console.log('Updating patient in local state (Supabase not configured)');
        setPatients(prev => prev.map(patient => 
          patient.id === patientId ? updatedPatient : patient
        ));
      }
    } catch (err: any) {
      console.error('Error updating patient:', err);
      setError(err.message || 'Failed to update patient');
      throw err;
    }
  };

  /**
   * Delete a patient with enhanced error handling
   */
  const deletePatient = async (patientId: string) => {
    try {
      setError(null);
      
      if (isSupabaseConfigured) {
        console.log('Deleting patient from database...');
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          await Promise.race([
            deletePatientDB(patientId),
            new Promise<void>((_, reject) => 
              setTimeout(() => reject(new Error('Patient deletion timeout')), 10000)
            )
          ]);
          
          clearTimeout(timeoutId);
        } catch (deleteError: any) {
          clearTimeout(timeoutId);
          
          if (deleteError.name === 'AbortError' || deleteError.message?.includes('timeout')) {
            throw new Error('Request timeout - please try again');
          } else if (deleteError.message?.includes('Failed to fetch') || 
                     deleteError.message?.includes('NetworkError')) {
            throw new Error('Network error - please check your connection');
          } else {
            throw deleteError;
          }
        }
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
   * Refresh patients from database with enhanced error handling
   */
  const refreshPatients = async () => {
    console.log('Refreshing patients...');
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