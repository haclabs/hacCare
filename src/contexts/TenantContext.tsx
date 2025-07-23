import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant } from '../types';
import { 
  getCurrentUserTenant, 
  getTenantById,
  getSuperAdminSelectedTenant,
  switchTenantContext,
  clearSuperAdminTenantSelection 
} from '../lib/tenantService';
import { useAuth } from './auth/AuthContext';

/**
 * Tenant Context Interface
 * Defines the shape of the tenant context that will be provided to components
 */
interface TenantContextType {
  currentTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  isMultiTenantAdmin: boolean;
  // Super admin tenant switching
  selectedTenantId: string | null;
  switchToTenant: (tenantId: string) => Promise<void>;
  viewAllTenants: () => void;
}

/**
 * Tenant Context
 * React context for managing current tenant state throughout the application
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
 * Manages tenant state and provides tenant functions to child components
 * 
 * Features:
 * - Automatic tenant detection based on current user
 * - Multi-tenant admin detection
 * - Tenant data caching and refresh capabilities
 * - Error handling for tenant operations
 */
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { user, profile, loading: authLoading } = useAuth();

  // Check if user is a multi-tenant admin (system admin)
  const isMultiTenantAdmin = profile?.role === 'super_admin';

  /**
   * Load current user's tenant or super admin selected tenant
   */
  const loadCurrentTenant = async () => {
    // Don't proceed if auth is still loading
    if (authLoading) {
      return;
    }

    if (!user) {
      setCurrentTenant(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isMultiTenantAdmin) {
        // For super admin, check if they have a selected tenant
        const savedSelectedTenant = getSuperAdminSelectedTenant();
        setSelectedTenantId(savedSelectedTenant);
        
        if (savedSelectedTenant) {
          // Load the selected tenant
          const { data: tenant, error: tenantError } = await getTenantById(savedSelectedTenant);
          if (tenantError) {
            throw new Error(tenantError.message);
          }
          setCurrentTenant(tenant);
        } else {
          // No tenant selected, viewing all tenants
          setCurrentTenant(null);
        }
      } else {
        // Regular user - load their assigned tenant
        const { data: tenant, error: tenantError } = await getCurrentUserTenant(user.id);
        
        if (tenantError) {
          throw new Error(tenantError.message);
        }

        setCurrentTenant(tenant);
        setSelectedTenantId(tenant?.id || null);
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
      setCurrentTenant(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch to a specific tenant (super admin only)
   */
  const switchToTenant = async (tenantId: string) => {
    if (!isMultiTenantAdmin) {
      throw new Error('Only super admins can switch tenants');
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch the tenant data
      const { data: tenant, error: tenantError } = await getTenantById(tenantId);
      if (tenantError) {
        throw new Error(tenantError.message);
      }

      // Save selection and update state
      switchTenantContext(tenantId);
      setSelectedTenantId(tenantId);
      setCurrentTenant(tenant);
    } catch (err) {
      console.error('Error switching tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch tenant');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear tenant selection to view all tenants (super admin only)
   */
  const viewAllTenants = () => {
    if (!isMultiTenantAdmin) {
      throw new Error('Only super admins can view all tenants');
    }

    clearSuperAdminTenantSelection();
    setSelectedTenantId(null);
    setCurrentTenant(null);
  };

  /**
   * Refresh current tenant data
   */
  const refreshTenant = async () => {
    await loadCurrentTenant();
  };

  // Load tenant when user changes - but wait for auth to finish loading
  useEffect(() => {
    // Don't load tenant until auth has finished loading
    if (authLoading) {
      return;
    }
    
    loadCurrentTenant();
  }, [user, isMultiTenantAdmin, authLoading]);

  const value: TenantContextType = {
    currentTenant,
    loading: loading || authLoading, // Include auth loading in overall loading state
    error,
    refreshTenant,
    isMultiTenantAdmin,
    selectedTenantId,
    switchToTenant,
    viewAllTenants
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantProvider;
