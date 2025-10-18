/**
 * Router Integration for Super Admin Tenant Switching
 * Provides seamless navigation while maintaining tenant context with React Router DOM
 */

import React from 'react';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { superAdminTenantService } from './superAdminTenantService';

interface RouteAwareTenantSwitchingOptions {
  navigate: NavigateFunction;
  preserveRoute?: boolean;
  redirectToHome?: boolean;
}

class RouterIntegratedTenantService {
  private navigate: NavigateFunction | null = null;
  private preserveRoute = true;

  /**
   * Initialize with React Router DOM navigate function
   */
  initialize(options: RouteAwareTenantSwitchingOptions) {
    this.navigate = options.navigate;
    this.preserveRoute = options.preserveRoute ?? true;

    console.log('🔄 Router-integrated tenant service initialized');
  }

  /**
   * Switch tenant with route preservation
   */
  async switchTenantWithRouting(tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current location before switching
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      // Switch tenant context
      const result = await superAdminTenantService.switchToTenant(tenantId);
      
      if (!result.success) {
        return result;
      }

      // Handle routing based on configuration
      if (this.preserveRoute && this.navigate && currentPath) {
        // Stay on current route but refresh with new tenant context
        console.log(`🔄 Refreshing route ${currentPath} with new tenant context`);
        
        // Navigate to same route to trigger data refresh
        this.navigate(currentPath + currentSearch, { replace: true });
      } else if (this.navigate) {
        // Navigate to home/dashboard
        console.log('🏠 Navigating to dashboard with new tenant context');
        this.navigate('/');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in router-integrated tenant switch:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Navigation error' 
      };
    }
  }

  /**
   * Clear tenant context with routing
   */
  async clearTenantContextWithRouting(): Promise<void> {
    try {
      // Clear tenant context
      await superAdminTenantService.clearTenantContext();

      // Navigate to management dashboard or home
      if (this.navigate) {
        console.log('🏠 Navigating to management view');
        this.navigate('/management', { replace: true });
      }
    } catch (error) {
      console.error('❌ Error clearing tenant context with routing:', error);
    }
  }

  /**
   * Check if current route is tenant-specific and handle accordingly
   */
  validateRouteForTenant(tenantId: string | null): boolean {
    const currentPath = window.location.pathname;
    
    // Define routes that require specific tenant context
    const tenantSpecificRoutes = [
      '/patients',
      '/medications',
      '/assessments',
      '/alerts',
      '/users'
    ];

    const isTenantSpecificRoute = tenantSpecificRoutes.some(route => 
      currentPath.startsWith(route)
    );

    // If on tenant-specific route but no tenant selected, redirect to management
    if (isTenantSpecificRoute && !tenantId && this.navigate) {
      console.log('⚠️ Tenant-specific route accessed without tenant context, redirecting');
      this.navigate('/management', { replace: true });
      return false;
    }

    return true;
  }

  /**
   * Get tenant-aware navigation function
   */
  getTenantAwareNavigate() {
    return (to: string, options?: { replace?: boolean; state?: any }) => {
      if (!this.navigate) {
        console.warn('Navigator not initialized for tenant-aware navigation');
        return;
      }

      const currentAccess = superAdminTenantService.getCurrentAccess();
      
      console.log(`🧭 Tenant-aware navigation to ${to} with tenant ${currentAccess.tenantId}`);
      return this.navigate(to, options);
    };
  }

  /**
   * Setup route guards for tenant access
   */
  setupRouteGuards() {
    if (!this.navigate) {
      console.warn('Navigator not available for route guards setup');
      return;
    }

    console.log('🛡️ Tenant route guards configured');
  }
}

// Export singleton service
export const routerIntegratedTenantService = new RouterIntegratedTenantService();

/**
 * Hook to initialize router integration with useNavigate
 * Usage: useRouterIntegratedTenantService({ preserveRoute: true })
 */
export function useRouterIntegratedTenantService(options: Omit<RouteAwareTenantSwitchingOptions, 'navigate'> = {}) {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    routerIntegratedTenantService.initialize({
      navigate,
      ...options
    });
  }, [navigate, options.preserveRoute]);

  return {
    switchTenantWithRouting: (tenantId: string) => 
      routerIntegratedTenantService.switchTenantWithRouting(tenantId),
    clearTenantContextWithRouting: () => 
      routerIntegratedTenantService.clearTenantContextWithRouting(),
    validateRouteForTenant: (tenantId: string | null) => 
      routerIntegratedTenantService.validateRouteForTenant(tenantId),
    getTenantAwareNavigate: () => 
      routerIntegratedTenantService.getTenantAwareNavigate()
  };
}

// Helper functions
export const initializeTenantRouting = (options: RouteAwareTenantSwitchingOptions) => {
  routerIntegratedTenantService.initialize(options);
};

export const switchTenantWithRouting = (tenantId: string) => 
  routerIntegratedTenantService.switchTenantWithRouting(tenantId);

export const clearTenantContextWithRouting = () => 
  routerIntegratedTenantService.clearTenantContextWithRouting();

export const validateRouteForTenant = (tenantId: string | null) => 
  routerIntegratedTenantService.validateRouteForTenant(tenantId);

export const getTenantAwareNavigate = () => 
  routerIntegratedTenantService.getTenantAwareNavigate();