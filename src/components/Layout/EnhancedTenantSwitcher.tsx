import React, { useState, useEffect } from 'react';
import { ChevronDown, Building, Shield, Globe } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import { getSuperAdminAvailableTenants, getSuperAdminCurrentAccess } from '../../lib/superAdminTenantService';
import { useRouterIntegratedTenantService } from '../../lib/routerIntegratedTenantService';
import { Tenant } from '../../types';

/**
 * Enhanced Tenant Switcher Component
 * Provides secure tenant switching for super admins with visual feedback
 */
export const EnhancedTenantSwitcher: React.FC = () => {
  const { isAnonymous } = useAuth();
  const { 
    currentTenant, 
    isMultiTenantAdmin, 
    selectedTenantId,
    switchToTenant, 
    viewAllTenants 
  } = useTenant();
  
  // Initialize router integration for seamless navigation
  const { switchTenantWithRouting, clearTenantContextWithRouting } = useRouterIntegratedTenantService({
    preserveRoute: true
  });
  
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [superAdminAccess, setSuperAdminAccess] = useState<any>(null);

  // Load available tenants and access info
  useEffect(() => {
    if (isAnonymous || !isMultiTenantAdmin) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get available tenants
        const { data: tenants, error } = await getSuperAdminAvailableTenants();
        if (error) {
          console.error('Error loading tenants:', error);
          return;
        }
        setAvailableTenants(tenants || []);

        // Get current access info
        const accessInfo = getSuperAdminCurrentAccess();
        setSuperAdminAccess(accessInfo);
        
      } catch (err) {
        console.error('Error loading tenant data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isMultiTenantAdmin, isAnonymous, selectedTenantId]);

  // Don't show for anonymous users or non-admins
  if (isAnonymous || !isMultiTenantAdmin) {
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      setLoading(true);
      
      // Use router-integrated switching for seamless navigation
      const result = await switchTenantWithRouting(tenantId);
      
      if (!result.success) {
        console.error('Error switching tenant:', result.error);
        // Fallback to regular context switching
        await switchToTenant(tenantId);
      }
      
      setIsOpen(false);
      
      // Refresh access info
      const accessInfo = getSuperAdminCurrentAccess();
      setSuperAdminAccess(accessInfo);
      
      // Force page reload to refresh all data for new tenant
      window.location.reload();
    } catch (err) {
      console.error('Error switching tenant:', err);
      setLoading(false);
    }
  };

  const handleViewAll = async () => {
    try {
      setLoading(true);
      
      // Use router-integrated clearing for seamless navigation
      await clearTenantContextWithRouting();
      
      // Also clear the context state
      await viewAllTenants();
      setIsOpen(false);
      
      // Clear access info
      setSuperAdminAccess({ tenantId: null, tenantName: null, hasAccess: true });
    } catch (err) {
      console.error('Error viewing all tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDisplayName = () => {
    if (!selectedTenantId) {
      return 'All Tenants';
    }
    return currentTenant?.name || superAdminAccess?.tenantName || 'Select Tenant';
  };

  const getStatusIndicator = () => {
    if (!superAdminAccess?.hasAccess) {
      return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    }
    
    if (selectedTenantId) {
      return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    }
    
    return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
  };

  return (
    <div className="relative">
      {/* Super Admin Badge */}
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-3 h-3 text-amber-600" />
        <span className="text-xs text-amber-600 font-medium">Super Admin</span>
        {getStatusIndicator()}
      </div>

      {/* Tenant Switcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 min-w-48"
        disabled={loading}
      >
        <Building className="w-4 h-4" />
        <span className="flex-1 text-left">{getCurrentDisplayName()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-48 max-h-80 overflow-y-auto">
          <div className="py-1">
            {/* View All Tenants Option */}
            <button
              onClick={handleViewAll}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
              disabled={loading}
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>All Tenants</span>
              {!selectedTenantId && (
                <span className="ml-auto text-blue-600 text-xs">✓ Active</span>
              )}
            </button>

            {/* Divider */}
            {availableTenants.length > 0 && (
              <div className="border-t border-gray-100 my-1" />
            )}

            {/* Individual Tenants */}
            {availableTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleTenantSwitch(tenant.id)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                disabled={loading}
              >
                <Building className="w-4 h-4 text-gray-500" />
                <span className="flex-1">{tenant.name}</span>
                <span className="text-xs text-gray-400">{tenant.subdomain}</span>
                {selectedTenantId === tenant.id && (
                  <span className="ml-auto text-green-600 text-xs">✓ Active</span>
                )}
              </button>
            ))}

            {availableTenants.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500 italic">
                No tenants available
              </div>
            )}
          </div>

          {/* Footer with access info */}
          <div className="border-t border-gray-100 p-2 bg-gray-50">
            <div className="text-xs text-gray-500">
              {superAdminAccess?.hasAccess ? (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Enhanced Access Active
                </span>
              ) : (
                <span className="text-red-600">Access Limited</span>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-md">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default EnhancedTenantSwitcher;