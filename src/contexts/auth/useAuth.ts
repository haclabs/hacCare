import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * Custom hook to use authentication context
 * Must be used within an AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
