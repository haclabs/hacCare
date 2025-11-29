import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant } from '../types';
import { 
  getCurrentUserTenant, 
  getTenantById,
  getTenantBySubdomain
} from '../services/admin/tenantService';
import { 
  superAdminTenantService,
  initializeSuperAdminAccess,
  switchSuperAdminToTenant,
  clearSuperAdminTenantContext
} from '../services/admin/superAdminTenantService';
import { getCurrentSubdomain } from '../lib/infrastructure/subdomainService';
import { useAuth } from './auth/SimulationAwareAuthProvider';

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
  // Simulation tenant switching (available to all users)
  enterSimulationTenant: (tenantId: string) => Promise<void>;
  exitSimulationTenant: () => Promise<void>;
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
   * Also handles subdomain-based tenant detection for production
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

      // Check if user was in a simulation (survives refresh)
      const simulationTenantId = localStorage.getItem('current_simulation_tenant');
      
      // Skip tenant loading for simulation_only users (but not for super admins)
      // UNLESS they have an active simulation tenant
      if (profile?.simulation_only && profile?.role !== 'super_admin' && !simulationTenantId) {
        console.log('🎯 Simulation-only user detected with no active simulation, skipping automatic tenant load');
        setCurrentTenant(null);
        setLoading(false);
        return;
      }
      if (simulationTenantId) {
        console.log('🎮 Restoring simulation tenant from localStorage:', simulationTenantId);
        const { data: simulationTenant, error: simError } = await getTenantById(simulationTenantId);
        if (simulationTenant && !simError) {
          // Verify it's still a simulation tenant
          if (simulationTenant.is_simulation || simulationTenant.tenant_type === 'simulation_active') {
            setCurrentTenant(simulationTenant);
            setSelectedTenantId(simulationTenantId);
            setLoading(false);
            console.log('✅ Simulation tenant restored:', simulationTenant.name);
            return;
          } else {
            // Not a simulation anymore, clear localStorage
            console.log('⚠️ Stored tenant is no longer a simulation, clearing');
            localStorage.removeItem('current_simulation_tenant');
          }
        } else {
          // Tenant no longer exists, clear localStorage
          console.log('⚠️ Simulation tenant not found, clearing localStorage');
          localStorage.removeItem('current_simulation_tenant');
        }
      }

      // In production, try to detect tenant from subdomain first
      // EXCEPT for simulation subdomain (which hosts multiple simulations)
      const currentSubdomain = getCurrentSubdomain();
      if (currentSubdomain && currentSubdomain !== 'simulation' && process.env.NODE_ENV === 'production') {
        console.log('🔍 Checking subdomain tenant:', currentSubdomain);
        const { data: subdomainTenant, error: subdomainError } = await getTenantBySubdomain(currentSubdomain);
        if (subdomainTenant && !subdomainError) {
          console.log('✅ Tenant loaded from subdomain:', subdomainTenant.name);
          setCurrentTenant(subdomainTenant);
          setSelectedTenantId(subdomainTenant.id);
          setLoading(false);
          return;
        }
      }

      if (isMultiTenantAdmin) {
        // Super admin user - initialize enhanced access and load context
        console.log('🔐 SUPER ADMIN: Initializing enhanced tenant access');
        
        const hasAccess = await initializeSuperAdminAccess();
        if (!hasAccess) {
          throw new Error('Failed to initialize super admin access');
        }

        // Get current access state from super admin service
        const currentAccess = superAdminTenantService.getCurrentAccess();
        setSelectedTenantId(currentAccess.tenantId);
        
        if (currentAccess.tenantId) {
          // Load the selected tenant
          const { data: tenant, error: tenantError } = await getTenantById(currentAccess.tenantId);
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
        console.log('🏢 TENANT CONTEXT: Loading tenant for regular user:', user.id);
        const startTime = Date.now();
        
        // Add timeout to tenant fetch (15 seconds)
        const tenantResult = await Promise.race([
          getCurrentUserTenant(user.id),
          new Promise<{ data: null; error: Error }>((_, reject) => 
            setTimeout(() => reject(new Error('Tenant fetch timeout after 15 seconds')), 15000)
          )
        ]).catch((error) => {
          console.error('🏢 TENANT CONTEXT: Timeout or error fetching tenant:', error);
          return { data: null, error };
        });
        
        const elapsed = Date.now() - startTime;
        console.log(`🏢 TENANT CONTEXT: Tenant fetch took ${elapsed}ms`);
        
        const { data: tenant, error: tenantError } = tenantResult;
        
        console.log('🏢 TENANT CONTEXT: getCurrentUserTenant result:', { tenant, tenantError });
        
        if (tenantError) {
          console.error('🏢 TENANT CONTEXT: Error loading tenant:', tenantError);
          throw new Error(tenantError.message);
        }

        console.log('🏢 TENANT CONTEXT: Setting current tenant:', tenant);
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

      // Clear simulation tenant from localStorage first to prevent restore
      localStorage.removeItem('current_simulation_tenant');
      console.log('🧹 Cleared simulation tenant from localStorage before switch');

      // Use enhanced super admin service for tenant switching
      const result = await switchSuperAdminToTenant(tenantId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to switch tenant');
      }

      // Fetch the tenant data for UI
      const { data: tenant, error: tenantError } = await getTenantById(tenantId);
      if (tenantError) {
        throw new Error(tenantError.message);
      }

      // Update state
      setSelectedTenantId(tenantId);
      setCurrentTenant(tenant);
      console.log('✅ Switched to tenant:', tenant?.name);
    } catch (err) {
      console.error('Error switching tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch tenant');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enter a simulation tenant (available to all users with simulation access)
   * This allows users to switch to simulation tenants they're assigned to
   */
  const enterSimulationTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎮 Entering simulation tenant:', tenantId);

      // Fetch the tenant data
      const { data: tenant, error: tenantError } = await getTenantById(tenantId);
      if (tenantError) {
        throw new Error(tenantError.message);
      }

      if (!tenant) {
        throw new Error('Simulation tenant not found');
      }

      // Update state to simulation tenant
      setSelectedTenantId(tenantId);
      setCurrentTenant(tenant);
      
      // Persist simulation tenant to localStorage (survives refresh)
      localStorage.setItem('current_simulation_tenant', tenantId);
      console.log('💾 Simulation tenant saved to localStorage');
      
      console.log('✅ Successfully entered simulation tenant:', tenant.name);
    } catch (err) {
      console.error('Error entering simulation tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to enter simulation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exit simulation and return to user's home tenant
   */
  const exitSimulationTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚪 Exiting simulation tenant...');
      
      // Clear simulation tenant from localStorage
      localStorage.removeItem('current_simulation_tenant');
      console.log('🧹 Cleared simulation tenant from localStorage');

      // Reload user's home tenant
      if (user) {
        const { data: tenant, error: tenantError } = await getCurrentUserTenant(user.id);
        if (tenantError) {
          throw new Error(tenantError.message);
        }
        setCurrentTenant(tenant);
        setSelectedTenantId(tenant?.id || null);
        console.log('✅ Returned to home tenant:', tenant?.name);
      }
    } catch (err) {
      console.error('Error exiting simulation:', err);
      setError(err instanceof Error ? err.message : 'Failed to exit simulation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear tenant selection to view all tenants (super admin only)
   */
  const viewAllTenants = async () => {
    if (!isMultiTenantAdmin) {
      throw new Error('Only super admins can view all tenants');
    }

    try {
      await clearSuperAdminTenantContext();
      setSelectedTenantId(null);
      setCurrentTenant(null);
    } catch (error) {
      console.error('Error clearing tenant context:', error);
      setError('Failed to clear tenant context');
    }
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
    viewAllTenants,
    enterSimulationTenant,
    exitSimulationTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantProvider;
