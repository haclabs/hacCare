import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient } from '../types';
import { supabase, checkDatabaseHealth } from '../lib/supabase';
import { 
  fetchPatients, 
  createPatient as createPatientDB, 
  updatePatient as updatePatientDB, 
  deletePatient as deletePatientDB 
} from '../lib/patientService';
import { mockPatients } from '../data/mockData';

/**
 * Patient Context Interface
 */
interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (patientId: string) => Patient | undefined;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
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
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Load patients from database
   */
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if Supabase is available
      if (!supabase) {
        console.warn('📱 Using mock data - Supabase not configured');
        setPatients(mockPatients);
        setIsOffline(true);
        return;
      }
      
      // Check database health first
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('📱 Database unavailable - using mock data');
        setPatients(mockPatients);
        setIsOffline(true);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn('📱 Database error - falling back to mock data:', fetchError.message);
        setPatients(mockPatients);
        setIsOffline(true);
        return;
      }

      setPatients(data || []);
      setIsOffline(false);
      console.log('✅ Loaded patients from database');
    } catch (err: any) {
      console.warn('📱 Network error - using mock data:', err);
      setPatients(mockPatients);
      setIsOffline(true);
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
  const addPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      if (!supabase || isOffline) {
        // Add to local state only
        const newPatient: Patient = {
          ...patientData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setPatients(prev => [...prev, newPatient]);
        console.warn('📱 Added patient locally - database unavailable');
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPatients(prev => [data, ...prev]);
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
   * Update an existing patient
   */
  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      setError(null);
      
      if (!supabase || isOffline) {
        // Update local state only
        setPatients(prev => prev.map(p => 
          p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
        ));
        console.warn('📱 Updated patient locally - database unavailable');
        return;
      }

      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      setPatients(prev => prev.map(patient => 
        patient.id === id ? { ...patient, ...updates } : patient
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
   * Delete a patient
   */
  const deletePatient = async (id: string) => {
    try {
      setError(null);
      
      if (!supabase || isOffline) {
        // Remove from local state only
        setPatients(prev => prev.filter(p => p.id !== id));
        console.warn('📱 Deleted patient locally - database unavailable');
        return;
      }

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setPatients(prev => prev.filter(patient => patient.id !== id));
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
    isOffline,
    refreshPatients
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};