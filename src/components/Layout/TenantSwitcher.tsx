import React, { useState, useEffect } from 'react';
import { ChevronDown, Building, Eye } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import { getTenantsForSwitching } from '../../lib/tenantService';
import { Tenant } from '../../types';

/**
 * Tenant Switcher Component
 * Allows super admins to switch between tenants or view all tenants
 */
export const TenantSwitcher: React.FC = () => {
  // All hooks must be called before any conditional returns
  const { isAnonymous } = useAuth();
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

  // Load available tenants
  useEffect(() => {
    // Skip loading tenants for anonymous users or non-admins
    if (isAnonymous || !isMultiTenantAdmin) {
      return;
    }

    const loadTenants = async () => {
      try {
        setLoading(true);
        const { data, error } = await getTenantsForSwitching();
        if (error) {
          console.error('Error loading tenants:', error);
          return;
        }
        setAvailableTenants(data || []);
      } catch (err) {
        console.error('Error loading tenants:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, [isMultiTenantAdmin, isAnonymous]);

  // Don't show for anonymous users or non-admins (after all hooks are called)
  if (isAnonymous || !isMultiTenantAdmin) {
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      setLoading(true);
      await switchToTenant(tenantId);
      setIsOpen(false);
    } catch (err) {
      console.error('Error switching tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = async () => {
    try {
      setLoading(true);
      await viewAllTenants();
      setIsOpen(false);
    } catch (err) {
      console.error('Error viewing all tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDisplayName = () => {
    if (selectedTenantId === 'all') {
      return 'All Tenants';
    }
    return currentTenant?.name || 'Select Tenant';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        disabled={loading}
      >
        <Building className="w-4 h-4" />
        <span>{getCurrentDisplayName()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-48">
          <div className="py-1">
            {/* View All Tenants Option */}
            <button
              onClick={handleViewAll}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              disabled={loading}
            >
              <Eye className="w-4 h-4" />
              All Tenants
              {selectedTenantId === 'all' && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </button>

            {availableTenants.length > 0 && (
              <div className="border-t border-gray-100">
                {availableTenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    disabled={loading}
                  >
                    <Building className="w-4 h-4" />
                    {tenant.name}
                    {selectedTenantId === tenant.id && (
                      <span className="ml-auto text-blue-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantSwitcher;