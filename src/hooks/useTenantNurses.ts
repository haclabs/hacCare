/**
 * Hook for fetching nurses assigned to the current tenant
 * 
 * This hook provides functionality to get a list of nurses
 * that are assigned to the current tenant for patient assignment.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/api/supabase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/auth/useAuth';

export interface NurseOption {
  id: string;
  name: string;
  email: string;
  department?: string;
  license_number?: string;
}

export const useTenantNurses = () => {
  const [nurses, setNurses] = useState<NurseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentTenant } = useTenant();
  const { profile } = useAuth();

  /**
   * Fetch nurses for the current tenant
   */
  const fetchTenantNurses = async () => {
    if (!currentTenant || !profile) {
      setNurses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query to get nurses assigned to the current tenant
      const { data, error: fetchError } = await supabase
        .from('tenant_users')
        .select(`
          user_profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            department,
            license_number,
            is_active
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('user_profiles.role', 'nurse')
        .eq('user_profiles.is_active', true);

      if (fetchError) {
        console.error('Error fetching tenant nurses:', fetchError);
        setError('Failed to load nurses');
        return;
      }

      // Transform the data into the format needed for the dropdown
      const nurseOptions: NurseOption[] = (data || [])
        .filter(item => item.user_profiles) // Ensure user_profiles exists
        .map(item => {
          const nurse = item.user_profiles as any;
          return {
            id: nurse.id,
            name: `${nurse.first_name} ${nurse.last_name}`,
            email: nurse.email,
            department: nurse.department,
            license_number: nurse.license_number
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

      setNurses(nurseOptions);
    } catch (err: any) {
      console.error('Exception fetching tenant nurses:', err);
      setError('An error occurred while loading nurses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch nurses when component mounts or tenant changes
  useEffect(() => {
    fetchTenantNurses();
  }, [currentTenant?.id, profile?.id]);

  /**
   * Refresh the nurses list
   */
  const refreshNurses = () => {
    fetchTenantNurses();
  };

  /**
   * Find a nurse by ID
   */
  const findNurseById = (id: string): NurseOption | undefined => {
    return nurses.find(nurse => nurse.id === id);
  };

  /**
   * Find a nurse by name (for backward compatibility with existing data)
   */
  const findNurseByName = (name: string): NurseOption | undefined => {
    return nurses.find(nurse => nurse.name.toLowerCase() === name.toLowerCase());
  };

  return {
    nurses,
    loading,
    error,
    refreshNurses,
    findNurseById,
    findNurseByName,
    hasNurses: nurses.length > 0
  };
};
