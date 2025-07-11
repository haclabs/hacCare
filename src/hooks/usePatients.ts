import { useContext } from 'react';
import { PatientContext } from '../contexts/PatientContext';

/**
 * Custom hook to access patient context
 * Throws an error if used outside of PatientProvider
 * 
 * @returns {PatientContextType} Patient context value
 * @throws {Error} If used outside PatientProvider
 */
export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};