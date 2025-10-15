/**
 * Enhanced Super Admin Tenant Management Service
 * Provides secure multi-tenant access for super admins while maintaining tenant isolation
 */

import { supabase } from './supabase';
import { Tenant } from '../types';

interface SuperAdminTenantAccess {
  tenantId: string | null;
  tenantName: string | null;
  hasAccess: boolean;
}

class SuperAdminTenantService {
  private static instance: SuperAdminTenantService;
  private currentTenantAccess: SuperAdminTenantAccess = {
    tenantId: null,
    tenantName: null,
    hasAccess: false
  };

  private constructor() {}

  public static getInstance(): SuperAdminTenantService {
    if (!SuperAdminTenantService.instance) {
      SuperAdminTenantService.instance = new SuperAdminTenantService();
    }
    return SuperAdminTenantService.instance;
  }

  /**
   * Get current access token from Supabase session or sessionStorage
   */
  private async getAccessToken(): Promise<string | null> {
    // First try sessionStorage (set during login)
    const storedToken = sessionStorage.getItem('supabase_access_token');
    if (storedToken) {
      return storedToken;
    }

    // Fallback: get from current Supabase session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Store it for future use
        sessionStorage.setItem('supabase_access_token', session.access_token);
        return session.access_token;
      }
    } catch (error) {
      console.warn('⚠️ Failed to get access token from session:', error);
    }

    return null;
  }

  /**
   * Initialize super admin access and verify permissions
   */
  async initializeSuperAdminAccess(): Promise<boolean> {
    try {
      // Check if user is super admin
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (error || profile?.role !== 'super_admin') {
        this.currentTenantAccess.hasAccess = false;
        return false;
      }

      this.currentTenantAccess.hasAccess = true;
      
      // Check for saved tenant context
      const savedTenantId = this.getSavedTenantContext();
      if (savedTenantId) {
        await this.switchToTenant(savedTenantId);
      }

      console.log('🔐 Super admin access initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing super admin access:', error);
      return false;
    }
  }

  /**
   * Switch super admin context to specific tenant
   */
  async switchToTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentTenantAccess.hasAccess) {
        throw new Error('Super admin access not initialized');
      }

      // Get access token for direct fetch (bypasses hanging Supabase client)
      const accessToken = await this.getAccessToken();
      let tenant: any = null;

      if (accessToken) {
        try {
          console.log('🔑 Using direct fetch to validate tenant');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${supabaseUrl}/rest/v1/tenants?id=eq.${tenantId}&status=eq.active&select=id,name,status`, {
            method: 'GET',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const tenants = await response.json();
            if (tenants && tenants.length > 0) {
              tenant = tenants[0];
              console.log('✅ Tenant validated via direct fetch:', tenant.name);
            }
          }
        } catch (fetchError) {
          console.warn('⚠️ Direct fetch failed, falling back to Supabase client:', fetchError);
        }
      }

      // Fallback to Supabase client if direct fetch didn't work
      if (!tenant) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, status')
          .eq('id', tenantId)
          .eq('status', 'active')
          .single();

        if (tenantError || !tenantData) {
          throw new Error('Invalid or inactive tenant');
        }
        tenant = tenantData;
      }

      // Set database context for this session using direct fetch
      let contextError = null;
      if (accessToken) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/set_super_admin_tenant_context`, {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target_tenant_id: tenantId })
          });
          
          if (!rpcResponse.ok) {
            contextError = new Error(`RPC failed: ${rpcResponse.status}`);
          } else {
            console.log('✅ Tenant context set via direct fetch');
          }
        } catch (fetchError) {
          console.warn('⚠️ Direct RPC fetch failed, falling back to Supabase client:', fetchError);
          contextError = fetchError;
        }
      }

      // Fallback to Supabase client for RPC if needed
      if (contextError && !accessToken) {
        const { error } = await supabase
          .rpc('set_super_admin_tenant_context', { target_tenant_id: tenantId });

        if (error) {
          throw new Error(`Failed to set tenant context: ${error.message}`);
        }
      } else if (contextError) {
        throw new Error(`Failed to set tenant context: ${contextError.message}`);
      }

      // Update local state
      this.currentTenantAccess.tenantId = tenantId;
      this.currentTenantAccess.tenantName = tenant.name;

      // Save to localStorage for persistence across page reloads
      this.saveTenantContext(tenantId, tenant.name);

      console.log(`🔄 Super admin switched to tenant: ${tenant.name}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error switching tenant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Clear tenant context to access all tenants
   */
  async clearTenantContext(): Promise<void> {
    try {
      if (!this.currentTenantAccess.hasAccess) {
        throw new Error('Super admin access not initialized');
      }

      // Clear database context using direct fetch if possible
      const accessToken = await this.getAccessToken();
      let cleared = false;

      if (accessToken) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/set_super_admin_tenant_context`, {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target_tenant_id: null })
          });
          
          if (response.ok) {
            cleared = true;
            console.log('✅ Tenant context cleared via direct fetch');
          }
        } catch (fetchError) {
          console.warn('⚠️ Direct fetch failed for clearing context:', fetchError);
        }
      }

      // Fallback to Supabase client
      if (!cleared) {
        const { error } = await supabase
          .rpc('set_super_admin_tenant_context', { target_tenant_id: null });

        if (error) {
          console.warn('Warning: Could not clear database context:', error);
        }
      }

      // Clear local state
      this.currentTenantAccess.tenantId = null;
      this.currentTenantAccess.tenantName = null;

      // Clear saved context
      this.clearSavedTenantContext();

      console.log('🔄 Super admin context cleared - viewing all tenants');
    } catch (error) {
      console.error('❌ Error clearing tenant context:', error);
    }
  }

  /**
   * Get available tenants for super admin
   */
  async getAvailableTenants(): Promise<{ data: Tenant[] | null; error: any }> {
    try {
      if (!this.currentTenantAccess.hasAccess) {
        return { data: null, error: new Error('Super admin access required') };
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active')
        .order('name');

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get current tenant access information
   */
  getCurrentAccess(): SuperAdminTenantAccess {
    return { ...this.currentTenantAccess };
  }

  /**
   * Check if super admin has access to specific tenant
   */
  async hasAccessToTenant(tenantId: string): Promise<boolean> {
    if (!this.currentTenantAccess.hasAccess) {
      return false;
    }

    // Super admins have access to all active tenants
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .eq('status', 'active')
      .single();

    return !error && !!data;
  }

  /**
   * Execute query with specific tenant context (temporary)
   */
  async executeWithTenantContext<T>(
    tenantId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.currentTenantAccess.hasAccess) {
      throw new Error('Super admin access required');
    }

    const previousTenantId = this.currentTenantAccess.tenantId;

    try {
      // Temporarily switch context
      if (previousTenantId !== tenantId) {
        await this.switchToTenant(tenantId);
      }

      // Execute operation
      const result = await operation();

      return result;
    } finally {
      // Restore previous context
      if (previousTenantId && previousTenantId !== tenantId) {
        await this.switchToTenant(previousTenantId);
      } else if (!previousTenantId) {
        await this.clearTenantContext();
      }
    }
  }

  // Private methods for localStorage management
  private saveTenantContext(tenantId: string, tenantName: string): void {
    localStorage.setItem('superAdminTenantId', tenantId);
    localStorage.setItem('superAdminTenantName', tenantName);
  }

  private getSavedTenantContext(): string | null {
    return localStorage.getItem('superAdminTenantId');
  }

  private clearSavedTenantContext(): void {
    localStorage.removeItem('superAdminTenantId');
    localStorage.removeItem('superAdminTenantName');
  }
}

// Export singleton instance
export const superAdminTenantService = SuperAdminTenantService.getInstance();

// Helper functions for backwards compatibility
export const initializeSuperAdminAccess = () => 
  superAdminTenantService.initializeSuperAdminAccess();

export const switchSuperAdminToTenant = (tenantId: string) => 
  superAdminTenantService.switchToTenant(tenantId);

export const clearSuperAdminTenantContext = () => 
  superAdminTenantService.clearTenantContext();

export const getSuperAdminAvailableTenants = () => 
  superAdminTenantService.getAvailableTenants();

export const getSuperAdminCurrentAccess = () => 
  superAdminTenantService.getCurrentAccess();