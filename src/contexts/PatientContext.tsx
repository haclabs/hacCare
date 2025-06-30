import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient } from '../types';
import { mockPatients } from '../data/mockData';

/**
 * Patient Context Interface
 * Defines the shape of the patient context for managing patient data across the app
 */
interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  deletePatient: (patientId: string) => void;
  getPatient: (patientId: string) => Patient | undefined;
  loading: boolean;
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

  // Initialize with mock data
  useEffect(() => {
    // In a real app, this would fetch from the database
    setPatients(mockPatients);
    setLoading(false);
  }, []);

  /**
   * Add a new patient
   */
  const addPatient = (patient: Patient) => {
    setPatients(prev => [...prev, patient]);
  };

  /**
   * Update an existing patient
   */
  const updatePatient = (updatedPatient: Patient) => {
    setPatients(prev => prev.map(patient => 
      patient.id === updatedPatient.id ? updatedPatient : patient
    ));
  };

  /**
   * Delete a patient
   */
  const deletePatient = (patientId: string) => {
    setPatients(prev => prev.filter(patient => patient.id !== patientId));
  };

  /**
   * Get a specific patient by ID
   */
  const getPatient = (patientId: string) => {
    return patients.find(patient => patient.id === patientId);
  };

  const value = {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    loading
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};