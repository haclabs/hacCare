import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Users, Building2, Filter, RefreshCw } from 'lucide-react';
import { Tenant, TenantUser } from '../../../../types';
import {
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  permanentlyDeleteTenant,
  getTenantUsers
} from '../../../../services/admin/tenantService';
import LoadingSpinner from '../../../../components/UI/LoadingSpinner';

interface TenantCRUDProps {
  onSelectTenant?: (tenant: Tenant) => void;
}

export const TenantCRUD: React.FC<TenantCRUDProps> = ({ onSelectTenant }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, searchTerm, statusFilter]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading tenants...');
      const { data, error } = await getAllTenants();
      if (error) {
        throw new Error(error.message);
      }
      console.log(`📋 Setting ${data?.length || 0} tenants in state`);
      setTenants(data || []);
    } catch (err) {
      console.error('❌ Error loading tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const filterTenants = () => {
    let filtered = tenants;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === statusFilter);
    }

    setFilteredTenants(filtered);
  };

  const handleCreateTenant = async (tenantData: any) => {
    try {
      const { error } = await createTenant(tenantData);
      if (error) {
        throw new Error(error.message);
      }
      await loadTenants();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating tenant:', err);
      throw err;
    }
  };

  const handleUpdateTenant = async (tenantId: string, updates: any) => {
    try {
      const { error } = await updateTenant(tenantId, updates);
      if (error) {
        throw new Error(error.message);
      }
      await loadTenants();
      setShowEditModal(false);
      setSelectedTenant(null);
    } catch (err) {
      console.error('Error updating tenant:', err);
      throw err;
    }
  };

  const handleDeleteTenant = async (tenantId: string, permanent: boolean = false) => {
    const actionText = permanent ? 'permanently delete' : 'deactivate';
    const warningText = permanent 
      ? 'Are you sure you want to PERMANENTLY DELETE this tenant? This will delete ALL tenant data including patients, users, and settings. THIS CANNOT BE UNDONE!' 
      : 'Are you sure you want to deactivate this tenant? The tenant will be hidden but data will be preserved.';

    if (!confirm(warningText)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Starting ${actionText} for tenant:`, tenantId);
      
      // Add timeout for permanent deletions
      if (permanent) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 30000)
        );
        
        const deletePromise = permanentlyDeleteTenant(tenantId);
        const { error } = await Promise.race([deletePromise, timeoutPromise]) as { error: any };
        
        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await deleteTenant(tenantId);
        if (error) {
          throw new Error(error.message);
        }
      }
      
      console.log(`✓ ${actionText} completed, refreshing tenant list...`);
      
      // Force refresh the tenant list
      await loadTenants();
      
      // Clear selected tenant if it was the one deleted
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null);
      }
      
      console.log('✓ Tenant list refreshed');
      
    } catch (err) {
      console.error(`Error in ${actionText}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${actionText} tenant`);
    } finally {
      setLoading(false);
    }
  };

  const handleManageUsers = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    try {
      const { data, error } = await getTenantUsers(tenant.id);
      if (error) {
        throw new Error(error.message);
      }
      setTenantUsers(data || []);
      setShowUsersModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant users');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tenant Management</h2>
          <p className="text-gray-600">Manage tenants and their configurations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTenants}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or subdomain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                    <p className="text-sm text-gray-500">{tenant.subdomain}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  tenant.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : tenant.status === 'inactive'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tenant.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plan:</span>
                  <span className="text-gray-900 capitalize">{tenant.subscription_plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max Users:</span>
                  <span className="text-gray-900">{tenant.max_users}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max Patients:</span>
                  <span className="text-gray-900">{tenant.max_patients}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-900">{new Date(tenant.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => handleManageUsers(tenant)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Manage Users</span>
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setShowEditModal(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit tenant"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  
                  {/* Dropdown for delete options */}
                  <div className="relative group">
                    <button
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete options"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    {/* Dropdown menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleDeleteTenant(tenant.id, false)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Deactivate
                          <div className="text-xs text-gray-500">Hide tenant, keep data</div>
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant.id, true)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete Permanently
                          <div className="text-xs text-red-500">Remove all data forever</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {onSelectTenant && (
                <button
                  onClick={() => onSelectTenant(tenant)}
                  className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm"
                >
                  Select Tenant
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTenants.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No tenants found</p>
          {searchTerm || statusFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-blue-600 hover:text-blue-700 mt-2"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTenant}
        />
      )}

      {showEditModal && selectedTenant && (
        <EditTenantModal
          tenant={selectedTenant}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTenant(null);
          }}
          onUpdate={handleUpdateTenant}
        />
      )}

      {showUsersModal && selectedTenant && (
        <TenantUsersModal
          tenant={selectedTenant}
          users={tenantUsers}
          onClose={() => {
            setShowUsersModal(false);
            setSelectedTenant(null);
            setTenantUsers([]);
          }}
          onRefresh={() => handleManageUsers(selectedTenant)}
        />
      )}
    </div>
  );
};

// Modal components would be imported from separate files in a real application
// For brevity, I'm including simplified versions here

const CreateTenantModal: React.FC<{
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    subscription_plan: 'basic',
    max_users: 10,
    max_patients: 100,
    admin_user_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onCreate({
        ...formData,
        status: 'active',
        settings: {
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          currency: 'USD',
          features: {
            advanced_analytics: formData.subscription_plan !== 'basic',
            medication_management: true,
            wound_care: formData.subscription_plan === 'enterprise',
            barcode_scanning: formData.subscription_plan !== 'basic',
            mobile_app: true,
          },
          security: {
            two_factor_required: formData.subscription_plan === 'enterprise',
            session_timeout: 480,
            password_policy: {
              min_length: 8,
              require_uppercase: true,
              require_lowercase: true,
              require_numbers: true,
              require_symbols: formData.subscription_plan !== 'basic',
            },
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Create New Tenant</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subdomain
            </label>
            <input
              type="text"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="tenant-subdomain"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Plan
            </label>
            <select
              value={formData.subscription_plan}
              onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin User ID
            </label>
            <input
              type="text"
              value={formData.admin_user_id}
              onChange={(e) => setFormData({ ...formData, admin_user_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditTenantModal: React.FC<{
  tenant: Tenant;
  onClose: () => void;
  onUpdate: (id: string, data: any) => Promise<void>;
}> = ({ tenant, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: tenant.name,
    status: tenant.status,
    subscription_plan: tenant.subscription_plan,
    max_users: tenant.max_users,
    max_patients: tenant.max_patients,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onUpdate(tenant.id, formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Tenant</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Plan
            </label>
            <select
              value={formData.subscription_plan}
              onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantUsersModal: React.FC<{
  tenant: Tenant;
  users: TenantUser[];
  onClose: () => void;
  onRefresh: () => void;
}> = ({ tenant, users, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Users for {tenant.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{(user as any).profiles?.full_name || 'Unknown User'}</p>
                <p className="text-sm text-gray-500">{(user as any).profiles?.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {user.role}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No users found for this tenant</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantCRUD;
