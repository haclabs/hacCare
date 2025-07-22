import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Users, FileText, Activity, ChevronRight } from 'lucide-react';
import { Organization } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/auth/AuthContext';
import { 
  fetchOrganizations, 
  createOrganization, 
  updateOrganization, 
  deleteOrganization,
  getOrganizationStats 
} from '../../lib/organizationService';
import { OrganizationForm } from './OrganizationForm';

interface OrganizationStats {
  userCount: number;
  patientCount: number;
  activePatientCount: number;
}

/**
 * Tenant Management Component
 * Super admin interface for managing organizations/tenants
 */
export const TenantManagement: React.FC = () => {
  const { profile } = useAuth();
  const { currentOrganization, switchOrganization, canSwitchOrganizations } = useTenant();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Record<string, OrganizationStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Check if user is super admin
  const isSuperAdmin = profile?.role === 'super_admin';

  // Load organizations and stats
  const loadOrganizations = async () => {
    if (!isSuperAdmin) return;

    try {
      setLoading(true);
      setError(null);

      const orgs = await fetchOrganizations();
      setOrganizations(orgs);

      // Load stats for each organization
      const statsPromises = orgs.map(async (org) => {
        try {
          const orgStats = await getOrganizationStats(org.id);
          return { id: org.id, stats: orgStats };
        } catch (err) {
          console.error(`Failed to load stats for ${org.name}:`, err);
          return { 
            id: org.id, 
            stats: { userCount: 0, patientCount: 0, activePatientCount: 0 } 
          };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { id, stats }) => {
        acc[id] = stats;
        return acc;
      }, {} as Record<string, OrganizationStats>);

      setStats(statsMap);
    } catch (err: any) {
      console.error('Error loading organizations:', err);
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [isSuperAdmin]);

  // Handle organization switching
  const handleSwitchOrganization = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
    } catch (err: any) {
      setError(err.message || 'Failed to switch organization');
    }
  };

  // Handle organization save from form
  const handleOrganizationSave = (savedOrg: Organization) => {
    if (editingOrg) {
      // Update existing organization in list
      setOrganizations(prev => prev.map(org => 
        org.id === savedOrg.id ? savedOrg : org
      ));
    } else {
      // Add new organization to list
      setOrganizations(prev => [savedOrg, ...prev]);
    }
    setEditingOrg(null);
    setShowCreateForm(false);
    
    // Reload to get fresh stats
    loadOrganizations();
  };

  // Handle organization deletion
  const handleDeleteOrganization = async (org: Organization) => {
    if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteOrganization(org.id);
      setOrganizations(prev => prev.filter(o => o.id !== org.id));
      
      // If we're currently viewing the deleted organization, switch to another one
      if (currentOrganization?.id === org.id && organizations.length > 1) {
        const remainingOrgs = organizations.filter(o => o.id !== org.id);
        if (remainingOrgs.length > 0) {
          await switchOrganization(remainingOrgs[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization');
    }
  };

  // If not super admin, show access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">
            Only super administrators can access the tenant management panel.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Building2 className="w-8 h-8 mr-3 text-blue-600" />
                Tenant Management
              </h1>
              <p className="mt-2 text-gray-600">
                Manage organizations and switch between tenants
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Organization
            </button>
          </div>

          {/* Current Organization Info */}
          {currentOrganization && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900">
                    Currently Viewing: {currentOrganization.name}
                  </h3>
                  <p className="text-blue-700">{currentOrganization.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => {
            const orgStats = stats[org.id] || { userCount: 0, patientCount: 0, activePatientCount: 0 };
            const isCurrentOrg = currentOrganization?.id === org.id;

            return (
              <div 
                key={org.id} 
                className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                  isCurrentOrg ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {org.name}
                    </h3>
                    {org.description && (
                      <p className="text-sm text-gray-600 mb-2">{org.description}</p>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      org.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setEditingOrg(org)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrganization(org)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{orgStats.userCount} users</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    <span>{orgStats.patientCount} total patients</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity className="w-4 h-4 mr-2" />
                    <span>{orgStats.activePatientCount} active patients</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  {!isCurrentOrg && (
                    <button
                      onClick={() => handleSwitchOrganization(org.id)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Switch To
                    </button>
                  )}
                  {isCurrentOrg && (
                    <div className="flex-1 bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm text-center font-medium">
                      Current
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {organizations.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first organization.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </button>
          </div>
        )}
      </div>

      {/* Organization Form Modal */}
      <OrganizationForm
        organization={editingOrg || undefined}
        isOpen={showCreateForm || !!editingOrg}
        onClose={() => {
          setShowCreateForm(false);
          setEditingOrg(null);
        }}
        onSave={handleOrganizationSave}
      />
    </div>
  );
};