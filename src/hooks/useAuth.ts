import { useContext } from 'react';
import { AuthContext } from '../contexts/auth/AuthContext';

/**
 * Custom hook to access authentication context
 * Throws an error if used outside of AuthProvider
 * 
 * @returns {AuthContextType} Authentication context value
 * @throws {Error} If used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};