import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant } from '../types';
import { 
  getCurrentUserTenant, 
  getTenantById,
  getTenantBySubdomain
} from '../services/admin/tenantService';
import { getUserProgramTenants, type ProgramTenant } from '../services/admin/programService';
import { 
  superAdminTenantService,
  initializeSuperAdminAccess,
  switchSuperAdminToTenant,
  clearSuperAdminTenantContext
} from '../services/admin/superAdminTenantService';
import { getCurrentSubdomain } from '../lib/infrastructure/subdomainService';
import { useAuth } from './auth/SimulationAwareAuthProvider';
import { supabase } from '../lib/api/supabase';

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
  // Template editing tenant switching (available to instructors/admins)
  enterTemplateTenant: (tenantId: string) => Promise<void>;
  exitTemplateTenant: () => Promise<void>;
  // Program tenant access
  programTenants: ProgramTenant[];
  loadProgramTenants: () => Promise<void>;
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
  const [programTenants, setProgramTenants] = useState<ProgramTenant[]>([]);
  const { user, profile, loading: authLoading } = useAuth();

  // Check if user is a multi-tenant admin (system admin or coordinator)
  const isMultiTenantAdmin = profile?.role === 'super_admin' || profile?.role === 'coordinator';

  /**
   * Load user's program tenants
   */
  const loadProgramTenants = async (): Promise<ProgramTenant[]> => {
    if (!user?.id) {
      setProgramTenants([]);
      return [];
    }

    try {
      const { data, error } = await getUserProgramTenants(user.id);
      if (error) {
        console.error('Error loading program tenants:', error);
        setProgramTenants([]);
        return [];
      } else {
        setProgramTenants(data || []);
        console.log('📚 Loaded', data?.length || 0, 'program tenants');
        return data || [];
      }
    } catch (error) {
      console.error('Error loading program tenants:', error);
      setProgramTenants([]);
      return [];
    }
  };

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
      
      // Load program tenants for instructors FIRST (before any other logic)
      let loadedProgramTenants: ProgramTenant[] = [];
      if (profile?.role === 'instructor' || profile?.role === 'coordinator') {
        console.log('👨‍🏫 Loading program tenants for instructor/coordinator...');
        loadedProgramTenants = await loadProgramTenants();
        console.log('👨‍🏫 Program tenants loaded:', loadedProgramTenants.length);
      }
      
      // Check if user was in a simulation (survives refresh)
      // BUT: Instructors should NOT auto-restore simulations ON LOGIN - they go to program workspace first
      // EXCEPTION: If they're currently in simulation portal or actively in simulation, DO restore it
      const simulationTenantId = localStorage.getItem('current_simulation_tenant');
      const isInSimulationContext = window.location.pathname.includes('/simulation-portal') || 
                                     window.location.pathname === '/app';

      // For simulation-only users, restore simulation tenant if available before skipping tenant load
      if (profile?.simulation_only && profile?.role !== 'super_admin') {
        if (simulationTenantId) {
          console.log('🎮 Simulation-only user restoring simulation tenant:', simulationTenantId);
          const { data: simulationTenant, error: simError } = await getTenantById(simulationTenantId);
          if (simulationTenant && !simError) {
            if (simulationTenant.is_simulation || simulationTenant.tenant_type === 'simulation_active') {
              // Ensure user has access via tenant_users table (critical for RLS)
              if (user) {
                console.log('🔐 Ensuring simulation-only user has tenant access...');
                const { error: accessError } = await supabase
                  .from('tenant_users')
                  .upsert({
                    user_id: user.id,
                    tenant_id: simulationTenantId,
                    is_active: true,
                    role: profile?.role || 'nurse'
                  }, {
                    onConflict: 'user_id,tenant_id'
                  });

                if (accessError) {
                  console.warn('⚠️ Could not grant tenant access:', accessError);
                } else {
                  console.log('✅ Simulation-only user granted tenant access');
                }
              }
              
              setCurrentTenant(simulationTenant);
              setSelectedTenantId(simulationTenantId);
              setLoading(false);
              console.log('✅ Simulation tenant restored for simulation-only user:', simulationTenant.name);
              return;
            } else {
              console.log('⚠️ Stored tenant is no longer a simulation, clearing');
              localStorage.removeItem('current_simulation_tenant');
            }
          } else {
            console.log('⚠️ Simulation tenant not found, clearing localStorage');
            localStorage.removeItem('current_simulation_tenant');
          }
        }

        console.log('🎯 Simulation-only user detected, skipping automatic tenant load');
        setCurrentTenant(null);
        setLoading(false);
        return;
      }
      
      if (simulationTenantId && profile?.role !== 'instructor' && profile?.role !== 'coordinator') {
        console.log('🎮 Restoring simulation tenant from localStorage:', simulationTenantId);
        const { data: simulationTenant, error: simError } = await getTenantById(simulationTenantId);
        if (simulationTenant && !simError) {
          // Verify it's still a simulation tenant
          if (simulationTenant.is_simulation || simulationTenant.tenant_type === 'simulation_active') {
            // Ensure user has access via tenant_users table (critical for RLS)
            if (user) {
              console.log('🔐 Ensuring user has tenant access on restore...');
              const { error: accessError } = await supabase
                .from('tenant_users')
                .upsert({
                  user_id: user.id,
                  tenant_id: simulationTenantId,
                  is_active: true,
                  role: profile?.role || 'nurse'
                }, {
                  onConflict: 'user_id,tenant_id'
                });

              if (accessError) {
                console.warn('⚠️ Could not grant tenant access:', accessError);
              } else {
                console.log('✅ User granted tenant access on restore');
              }
            }
            
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
      } else if (simulationTenantId && (profile?.role === 'instructor' || profile?.role === 'coordinator')) {
        // For instructors/coordinators: Check if they're actively IN a simulation
        if (isInSimulationContext) {
          // They're in simulation context - restore the simulation tenant
          console.log('🎮 Instructor in simulation context - restoring simulation tenant');
          const { data: simulationTenant, error: simError } = await getTenantById(simulationTenantId);
          if (simulationTenant && !simError) {
            if (simulationTenant.is_simulation || simulationTenant.tenant_type === 'simulation_active') {
              // Ensure instructor has access via tenant_users table
              if (user) {
                console.log('🔐 Ensuring instructor has tenant access...');
                const { error: accessError } = await supabase
                  .from('tenant_users')
                  .upsert({
                    user_id: user.id,
                    tenant_id: simulationTenantId,
                    is_active: true,
                    role: profile?.role || 'instructor'
                  }, {
                    onConflict: 'user_id,tenant_id'
                  });

                if (accessError) {
                  console.warn('⚠️ Could not grant tenant access:', accessError);
                } else {
                  console.log('✅ Instructor granted tenant access');
                }
              }
              
              setCurrentTenant(simulationTenant);
              setSelectedTenantId(simulationTenantId);
              setLoading(false);
              console.log('✅ Simulation tenant restored for instructor:', simulationTenant.name);
              return;
            } else {
              console.log('⚠️ Stored tenant is no longer a simulation, clearing');
              localStorage.removeItem('current_simulation_tenant');
            }
          } else {
            console.log('⚠️ Simulation tenant not found, clearing localStorage');
            localStorage.removeItem('current_simulation_tenant');
          }
        } else {
          // They're logging in fresh - clear simulation tenant and route to program workspace
          console.log('🧹 Clearing simulation tenant for instructor/coordinator - routing to program workspace');
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
        
        // Check if instructor or coordinator with program tenant
        if ((profile?.role === 'instructor' || profile?.role === 'coordinator') && loadedProgramTenants.length > 0) {
          console.log('👨‍🏫 INSTRUCTOR/COORDINATOR: Found', loadedProgramTenants.length, 'program tenants');
          
          // Check for saved program tenant preference
          const savedProgramTenantId = localStorage.getItem('current_program_tenant');
          
          if (savedProgramTenantId) {
            // Restore previous program tenant
            const savedTenant = loadedProgramTenants.find(pt => pt.tenant_id === savedProgramTenantId);
            if (savedTenant) {
              console.log('✅ Restoring program tenant:', savedTenant.program_name);
              const { data: tenant, error: tenantError } = await getTenantById(savedTenant.tenant_id);
              if (!tenantError && tenant) {
                setCurrentTenant(tenant);
                setSelectedTenantId(tenant.id);
                setLoading(false);
                return;
              }
            }
            // If restoration failed, clear saved preference
            localStorage.removeItem('current_program_tenant');
          }
          
          // Auto-login to first program tenant if they have only one
          if (loadedProgramTenants.length === 1) {
            console.log('✅ Auto-login to single program tenant:', loadedProgramTenants[0].program_name);
            const { data: tenant, error: tenantError } = await getTenantById(loadedProgramTenants[0].tenant_id);
            if (!tenantError && tenant) {
              setCurrentTenant(tenant);
              setSelectedTenantId(tenant.id);
              localStorage.setItem('current_program_tenant', tenant.id);
              setLoading(false);
              return;
            }
          } else {
            // Multiple programs - let ProgramSelectorModal handle it
            console.log('🎯 Multiple program tenants - showing selector');
            setCurrentTenant(null);
            setSelectedTenantId(null);
            setLoading(false);
            return;
          }
        }
        
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

      // First, ensure the user has access to this tenant via tenant_users table
      // This is critical for RLS policies to grant data access
      if (user) {
        console.log('🔐 Ensuring user has access to simulation tenant...');
        const { error: accessError } = await supabase
          .from('tenant_users')
          .upsert({
            user_id: user.id,
            tenant_id: tenantId,
            is_active: true,
            role: profile?.role || 'nurse' // Use their actual role, default to nurse for sim-only users
          }, {
            onConflict: 'user_id,tenant_id'
          });

        if (accessError) {
          console.warn('⚠️ Could not grant tenant access:', accessError);
          // Continue anyway - they might already have access from simulation assignment
        } else {
          console.log('✅ User granted access to simulation tenant');
        }
      }

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

      // For simulation_only users, redirect to portal instead of loading home tenant
      if (profile?.simulation_only) {
        console.log('🎯 Simulation-only user exiting, redirecting to portal');
        setCurrentTenant(null);
        setSelectedTenantId(null);
        // Navigation will be handled by the calling component
      } else {
        // Reload user's home tenant for regular users
        if (user) {
          const { data: tenant, error: tenantError } = await getCurrentUserTenant(user.id);
          if (tenantError) {
            throw new Error(tenantError.message);
          }
          setCurrentTenant(tenant);
          setSelectedTenantId(tenant?.id || null);
          console.log('✅ Returned to home tenant:', tenant?.name);
        }
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
   * Enter a template's tenant for editing (available to instructors/admins)
   * This allows instructors to temporarily switch to a template's tenant
   * and grants them access via tenant_users if needed
   */
  const enterTemplateTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Entering template tenant for editing:', tenantId);

      // First, ensure the user has access to this tenant
      // Add them to tenant_users if they're not already there
      if (user) {
        console.log('🔐 Ensuring user has access to template tenant...');
        const { error: accessError } = await supabase
          .from('tenant_users')
          .upsert({
            user_id: user.id,
            tenant_id: tenantId,
            is_active: true,
            role: profile?.role === 'instructor' ? 'admin' : 'admin' // Grant admin role for editing
          }, {
            onConflict: 'user_id,tenant_id'
          });

        if (accessError) {
          console.warn('⚠️ Could not grant tenant access:', accessError);
          // Continue anyway - they might already have access
        } else {
          console.log('✅ User granted access to template tenant');
        }
      }

      // Fetch the tenant data
      const { data: tenant, error: tenantError } = await getTenantById(tenantId);
      if (tenantError) {
        throw new Error(tenantError.message);
      }

      if (!tenant) {
        throw new Error('Template tenant not found');
      }

      // Update state to template tenant
      setSelectedTenantId(tenantId);
      setCurrentTenant(tenant);
      
      // Note: We don't persist to sessionStorage - the editing_template flag drives everything
      console.log('✅ Successfully entered template tenant:', tenant.name);
    } catch (err) {
      console.error('Error entering template tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to enter template');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exit template editing and return to user's home tenant
   */
  const exitTemplateTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚪 Exiting template tenant...');
      
      // Clear template editing flag
      sessionStorage.removeItem('editing_template');
      
      // Simply reload the tenant context to restore home tenant
      // This avoids RPC permission issues when calling from template tenant
      console.log('🔄 Reloading tenant context to restore home tenant...');
      await loadCurrentTenant();
      
      console.log('✅ Returned to home tenant');
    } catch (err) {
      console.error('Error exiting template tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to exit template');
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
    exitSimulationTenant,
    enterTemplateTenant,
    exitTemplateTenant,
    programTenants,
    loadProgramTenants
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantProvider;
