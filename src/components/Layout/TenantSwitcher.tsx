import React, { useState, useEffect } from 'react';
import { ChevronDown, Building, Eye } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { getTenantsForSwitching } from '../../lib/tenantService';
import { Tenant } from '../../types';

/**
 * Tenant Switcher Component
 * Allows super admins to switch between tenants or view all tenants
 */
export const TenantSwitcher: React.FC = () => {
  const { 
    currentTenant, 
    isMultiTenantAdmin, 
    selectedTenantId,
    switchToTenant, 
    viewAllTenants 
  } = useTenant();
  
  const [availableTenants, setAvailableTenants] = useState<Pick<Tenant, 'id' | 'name' | 'status'>[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only show for super admins
  if (!isMultiTenantAdmin) {
    return null;
  }

  // Load available tenants
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const { data, error } = await getTenantsForSwitching();
        if (error) {
          console.error('Error loading tenants:', error);
          return;
        }
        setAvailableTenants(data || []);
      } catch (err) {
        console.error('Error loading tenants:', err);
      }
    };

    loadTenants();
  }, []);

  const handleTenantSwitch = async (tenantId: string) => {
    setLoading(true);
    try {
      await switchToTenant(tenantId);
    } catch (err) {
      console.error('Error switching tenant:', err);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleViewAll = () => {
    viewAllTenants();
    setIsOpen(false);
  };

  const currentDisplayName = currentTenant ? currentTenant.name : 'All Tenants';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={loading}
      >
        <Building className="w-4 h-4" />
        <span className="max-w-32 truncate">{currentDisplayName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Super Admin View
            </div>
            
            {/* View All Tenants Option */}
            <button
              onClick={handleViewAll}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-colors ${
                !selectedTenantId
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-4 h-4" />
              All Tenants
            </button>

            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="px-3 py-1 text-xs font-medium text-gray-500">
                Switch to Tenant:
              </div>
              
              {availableTenants.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No active tenants found
                </div>
              ) : (
                availableTenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-colors ${
                      selectedTenantId === tenant.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    <Building className="w-4 h-4" />
                    <span className="truncate">{tenant.name}</span>
                    {selectedTenantId === tenant.id && (
                      <span className="ml-auto text-xs text-blue-600">Current</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TenantSwitcher;
