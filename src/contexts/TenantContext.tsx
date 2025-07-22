import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './auth/AuthContext';

/**
 * Tenant Context Interface
 * Manages organization/tenant-specific state and operations
 */
interface TenantContextType {
  currentOrganization: Organization | null;
  availableOrganizations: Organization[];
  loading: boolean;
  error: string | null;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  canSwitchOrganizations: boolean;
}

/**
 * Tenant Context
 * React context for managing multi-tenant organization state
 */
const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Custom hook to access tenant context
 * Throws an error if used outside of TenantProvider
 * 
 * @returns {TenantContextType} Tenant context value
 * @throws {Error} If used outside TenantProvider
 */
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

/**
 * Tenant Provider Component
 * Manages organization/tenant state and provides tenant functions to child components
 * 
 * Features:
 * - Loads user's organization on auth state changes
 * - Manages organization switching for super admins
 * - Provides organization-scoped data access
 * - Integrates with existing AuthContext
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 */
export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user can switch between organizations
   * Only super admins can switch organizations
   */
  const canSwitchOrganizations = profile?.role === 'super_admin';

  /**
   * Load user's organization and available organizations
   */
  const loadOrganizations = async () => {
    if (!user || !profile || !isSupabaseConfigured) {
      setCurrentOrganization(null);
      setAvailableOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load current user's organization
      if (profile.organization_id) {
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        if (orgError) {
          console.error('Error loading user organization:', orgError);
          setError('Failed to load organization');
        } else {
          setCurrentOrganization(organization);
        }
      }

      // Load available organizations for super admins
      if (canSwitchOrganizations) {
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (orgsError) {
          console.error('Error loading available organizations:', orgsError);
        } else {
          setAvailableOrganizations(orgs || []);
        }
      } else if (currentOrganization) {
        // Regular users only have access to their own organization
        setAvailableOrganizations([currentOrganization]);
      }
    } catch (err: any) {
      console.error('Error in loadOrganizations:', err);
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch organization (super admin only)
   */
  const switchOrganization = async (organizationId: string) => {
    if (!canSwitchOrganizations) {
      throw new Error('Only super admins can switch organizations');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Database not configured');
    }

    try {
      setError(null);

      // Load the selected organization
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        throw new Error('Failed to load organization');
      }

      setCurrentOrganization(organization);
      console.log('Switched to organization:', organization.name);
    } catch (err: any) {
      console.error('Error switching organization:', err);
      setError(err.message || 'Failed to switch organization');
      throw err;
    }
  };

  /**
   * Refresh organizations data
   */
  const refreshOrganizations = async () => {
    console.log('Refreshing organizations...');
    await loadOrganizations();
  };

  /**
   * Load organizations when auth state changes
   */
  useEffect(() => {
    if (!authLoading) {
      loadOrganizations();
    }
  }, [user, profile, authLoading, canSwitchOrganizations]);

  const value = {
    currentOrganization,
    availableOrganizations,
    loading: loading || authLoading,
    error,
    switchOrganization,
    refreshOrganizations,
    canSwitchOrganizations,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};