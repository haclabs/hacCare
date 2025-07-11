import { useContext } from 'react';
import { AlertContext } from '../contexts/AlertContext';

/**
 * Custom hook to access alert context
 * Throws an error if used outside of AlertProvider
 * 
 * @returns {AlertContextType} Alert context value
 * @throws {Error} If used outside AlertProvider
 */
export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};