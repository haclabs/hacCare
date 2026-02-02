import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Building, Eye, Play, FileText } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import { getTenantsForSwitching } from '../../services/admin/tenantService';
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
  
  const [availableTenants, setAvailableTenants] = useState<Pick<Tenant, 'id' | 'name' | 'status' | 'tenant_type' | 'parent_tenant_id'>[]>([]);
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

  // Build hierarchical tenant structure - must be before any conditional returns
  const hierarchicalTenants = useMemo(() => {
    // Separate parents and children
    const parents = availableTenants.filter(t => !t.parent_tenant_id);
    const children = availableTenants.filter(t => t.parent_tenant_id);
    
    // Group children by parent ID
    const childrenByParent = children.reduce((acc, child) => {
      const parentId = child.parent_tenant_id!;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(child);
      return acc;
    }, {} as Record<string, typeof children>);
    
    // Categorize tenants by type
    const institutions: typeof availableTenants = [];
    const programTenants: typeof availableTenants = [];
    const activeSimulations: typeof availableTenants = [];
    const templates: typeof availableTenants = [];
    
    parents.forEach(tenant => {
      if (tenant.tenant_type === 'institution' || tenant.tenant_type === 'production') {
        institutions.push(tenant);
      } else if (tenant.tenant_type === 'simulation_template') {
        templates.push(tenant);
      } else if (tenant.tenant_type === 'simulation_active') {
        activeSimulations.push(tenant);
      }
    });
    
    children.forEach(tenant => {
      if (tenant.tenant_type === 'program') {
        programTenants.push(tenant);
      } else if (tenant.tenant_type === 'simulation_template') {
        templates.push(tenant);
      } else if (tenant.tenant_type === 'simulation_active') {
        activeSimulations.push(tenant);
      }
    });
    
    return { 
      institutions, 
      programTenants, 
      childrenByParent, 
      activeSimulations, 
      templates 
    };
  }, [availableTenants]);

  const getCurrentDisplayName = () => {
    if (selectedTenantId === 'all') {
      return 'All Tenants';
    }
    return currentTenant?.name || 'Select Tenant';
  };

  // Don't show for anonymous users or non-admins (after all hooks are called)
  if (isAnonymous || !isMultiTenantAdmin) {
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      setLoading(true);
      await switchToTenant(tenantId);
      setIsOpen(false);
      // Refresh the page to update all tenant-specific data
      window.location.reload();
    } catch (err) {
      console.error('Error switching tenant:', err);
      setLoading(false);
    }
  };

  const handleViewAll = async () => {
    try {
      setLoading(true);
      await viewAllTenants();
      setIsOpen(false);
      // Refresh the page to show all tenants data
      window.location.reload();
    } catch (err) {
      console.error('Error viewing all tenants:', err);
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-900 bg-white hover:bg-gray-50 rounded-md transition-colors shadow-sm border border-gray-200"
        disabled={loading}
      >
        <Building className="w-4 h-4" />
        <span>{getCurrentDisplayName()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-64 max-h-96 overflow-y-auto">
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

            {/* Institutions with Program Hierarchy */}
            {hierarchicalTenants.institutions.length > 0 && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  🏢 Organizations
                </div>
                {hierarchicalTenants.institutions.map((institution) => (
                  <React.Fragment key={institution.id}>
                    {/* Parent Institution */}
                    <button
                      onClick={() => handleTenantSwitch(institution.id)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
                      disabled={loading}
                    >
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>{institution.name}</span>
                      {selectedTenantId === institution.id && (
                        <span className="ml-auto text-blue-600">✓</span>
                      )}
                    </button>
                    
                    {/* Child Program Tenants */}
                    {hierarchicalTenants.childrenByParent[institution.id]?.filter(c => c.tenant_type === 'program').map((program) => (
                      <button
                        key={program.id}
                        onClick={() => handleTenantSwitch(program.id)}
                        className="w-full text-left pl-12 pr-4 py-2 text-sm text-gray-600 hover:bg-purple-50 flex items-center gap-2"
                        disabled={loading}
                      >
                        <span className="text-gray-400">└─</span>
                        <span className="text-purple-600">📚</span>
                        <span>{program.name}</span>
                        {selectedTenantId === program.id && (
                          <span className="ml-auto text-purple-600">✓</span>
                        )}
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Active Simulations */}
            {hierarchicalTenants.activeSimulations.length > 0 && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-green-600 uppercase tracking-wider">
                  🎮 Active Simulations
                </div>
                {hierarchicalTenants.activeSimulations.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant.id)}
                    className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                    disabled={loading}
                  >
                    <Play className="w-4 h-4 text-green-600" />
                    <span>{tenant.name}</span>
                    {selectedTenantId === tenant.id && (
                      <span className="ml-auto text-green-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Simulation Templates */}
            {hierarchicalTenants.templates.length > 0 && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  📝 Simulation Templates
                </div>
                {hierarchicalTenants.templates.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant.id)}
                    className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                    disabled={loading}
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>{tenant.name}</span>
                    {selectedTenantId === tenant.id && (
                      <span className="ml-auto text-amber-600">✓</span>
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