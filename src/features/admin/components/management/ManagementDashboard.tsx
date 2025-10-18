import React, { useState, useEffect } from 'react';
import { Plus, Users, Building2, TrendingUp, AlertCircle, Trash2, Edit3, Settings, Printer } from 'lucide-react';
import { Tenant, ManagementDashboardStats, TenantUser } from '../../../../types';
import { supabase } from '../../../../lib/api/supabase';
import {
  getAllTenants,
  getManagementDashboardStats,
  createTenant,
  updateTenant,
  deleteTenant,
  permanentlyDeleteTenant,
  getTenantUsers
} from '../../../../services/admin/tenantService';
import { getTenantPatientStats } from '../../../../services/patient/multiTenantPatientService';
import LoadingSpinner from '../../../../components/UI/LoadingSpinner';
import { TenantSettings } from './TenantSettings';
import BulkLabelPrint from '../BulkLabelPrint';

export const ManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'bulk-print'>('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<ManagementDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [tenantPatientStats, setTenantPatientStats] = useState<{
    total: number;
    by_condition: Record<string, number>;
    recent_admissions: number;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [tenantsResult, statsResult] = await Promise.all([
        getAllTenants(),
        getManagementDashboardStats()
      ]);

      if (tenantsResult.error) {
        throw new Error(tenantsResult.error.message);
      }
      if (statsResult.error) {
        throw new Error(statsResult.error.message);
      }

      setTenants(tenantsResult.data || []);
      setStats(statsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    
    try {
      // Load tenant users
      const { data: users, error: usersError } = await getTenantUsers(tenant.id);
      
      if (usersError) {
        console.error('Error loading tenant users:', usersError);
      } else {
        setTenantUsers(users || []);
      }

      // Load tenant patient stats
      const { data: patientStats, error: patientError } = await getTenantPatientStats(tenant.id);
      
      if (patientError) {
        console.error('❌ Error loading tenant patient stats:', patientError);
      } else {
        console.log('✅ Loaded patient stats:', patientStats);
        setTenantPatientStats(patientStats);
      }
    } catch (err) {
      console.error('💥 Exception loading tenant data:', err);
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
      
      console.log(`✓ ${actionText} completed, refreshing dashboard...`);
      
      // Force refresh the dashboard data
      await loadDashboardData();
      
      // Clear selected tenant if it was the one deleted
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null);
      }
      
      console.log('✓ Dashboard refreshed');
      
    } catch (err) {
      console.error(`Error in ${actionText}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${actionText} tenant`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="text-gray-600">Manage tenants and monitor system health</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Tenant
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Tenant Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Tenant Settings</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('bulk-print')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bulk-print'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Printer className="h-4 w-4" />
              <span>Bulk Label Print</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <>
          {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_tenants}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_tenants}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className={`text-2xl font-bold ${
                  stats.system_health === 'healthy' ? 'text-green-600' :
                  stats.system_health === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.system_health}
                </p>
              </div>
              <AlertCircle className={`h-8 w-8 ${
                stats.system_health === 'healthy' ? 'text-green-600' :
                stats.system_health === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenants List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Tenants</h2>
          </div>
          <div className="divide-y">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className={`p-6 hover:bg-gray-50 cursor-pointer ${
                  selectedTenant?.id === tenant.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectTenant(tenant)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-gray-500">{tenant.subdomain}</p>
                      <p className="text-sm text-gray-500">Plan: {tenant.subscription_plan}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tenant.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : tenant.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTenant(tenant);
                        setShowEditForm(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit tenant"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    
                    {/* Dropdown for delete options */}
                    <div className="relative group">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete options"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTenant(tenant.id, false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Deactivate
                            <div className="text-xs text-gray-500">Hide tenant, keep data</div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTenant(tenant.id, true);
                            }}
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
              </div>
            ))}
          </div>
        </div>

        {/* Tenant Details */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedTenant ? 'Tenant Details' : 'Select a Tenant'}
            </h2>
          </div>
          {selectedTenant ? (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{selectedTenant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Subdomain</label>
                <p className="text-gray-900">{selectedTenant.subdomain}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Subscription Plan</label>
                <p className="text-gray-900 capitalize">{selectedTenant.subscription_plan}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Users</label>
                <p className="text-gray-900">
                  {tenantUsers.length} / {selectedTenant.max_users}
                  {tenantUsers.length >= selectedTenant.max_users && (
                    <span className="text-red-600 text-sm ml-1">(At Limit)</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Patients</label>
                <p className="text-gray-900">
                  {tenantPatientStats?.total || 0} / {selectedTenant.max_patients}
                  {(tenantPatientStats?.total || 0) >= selectedTenant.max_patients && (
                    <span className="text-red-600 text-sm ml-1">(At Limit)</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(selectedTenant.created_at).toLocaleDateString()}</p>
              </div>
              
              {/* Tenant Users */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Users ({tenantUsers.length})</h3>
                <div className="space-y-2">
                  {tenantUsers.length > 0 ? (
                    tenantUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.user_profiles?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">{user.user_profiles?.email || 'No email'}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {user.role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No users assigned to this tenant</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tenant Patients Summary */}
              {tenantPatientStats && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Patients ({tenantPatientStats.total})</h3>
                  {tenantPatientStats.total > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(tenantPatientStats.by_condition).map(([condition, count]) => (
                        <div key={condition} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{condition}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <span className="text-xs text-blue-600">Recent admissions (30 days): {tenantPatientStats.recent_admissions}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No patients in this tenant</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a tenant to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Tenant Modal */}
      {showCreateForm && (
        <CreateTenantModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadDashboardData();
          }}
        />
      )}

      {/* Edit Tenant Modal */}
      {showEditForm && selectedTenant && (
        <EditTenantModal
          tenant={selectedTenant}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            loadDashboardData();
          }}
        />
      )}
        </>
      ) : activeTab === 'settings' ? (
        /* Tenant Settings Tab */
        <TenantSettings />
      ) : (
        /* Bulk Label Print Tab */
        <BulkLabelPrint selectedTenant={selectedTenant} />
      )}
    </div>
  );
};

// Create Tenant Modal Component
const CreateTenantModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    subscription_plan: 'basic' as 'basic' | 'premium' | 'enterprise',
    max_users: 10,
    max_patients: 100,
    admin_email: '', // Changed from admin_user_id to admin_email
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAdmins, setAvailableAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Load available admins when component mounts
  useEffect(() => {
    loadAvailableAdmins();
  }, []);

  const loadAvailableAdmins = async () => {
    try {
      setLoadingAdmins(true);
      
      // Try the new RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_admin_users');
      
      if (!rpcError && rpcData) {
        setAvailableAdmins(rpcData.map((user: any) => ({
          id: user.user_id,
          email: user.email,
          first_name: user.email.split('@')[0], // Use email prefix as name fallback
          last_name: '',
          role: 'admin'
        })));
        return;
      }
      
      // Fallback: Try to get users with admin roles from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .in('role', ['admin', 'super_admin'])
        .eq('is_active', true)
        .order('email');
      
      if (!profileError && profileData) {
        setAvailableAdmins(profileData);
        return;
      }
      
      console.error('Error loading admins:', { rpcError, profileError });
      setError('Could not load available admins. You can still enter an email manually.');
      setAvailableAdmins([]);
      
    } catch (err) {
      console.error('Error loading available admins:', err);
      setError('Could not load available admins. You can still enter an email manually.');
      setAvailableAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const findUserByEmail = async (email: string): Promise<string | null> => {
    if (!email) return null;
    
    try {
      // First try the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('find_user_by_email', { 
        email_param: email 
      });
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData[0].user_id;
      }
      
      // Fallback: Try profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (!profileError && profileData) {
        return profileData.id;
      }
      
      console.error('User not found:', { email, rpcError, profileError });
      return null;
      
    } catch (err) {
      console.error('Error finding user by email:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, find the user ID from the email
      const adminUserId = await findUserByEmail(formData.admin_email);
      if (!adminUserId) {
        setError('Admin user not found with the provided email');
        setLoading(false);
        return;
      }

      const tenantData = {
        ...formData,
        admin_user_id: adminUserId, // Convert email to user_id
        status: 'active' as const,
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
      };

      // Remove admin_email from tenantData since it's not part of the Tenant type
      const { admin_email, ...finalTenantData } = tenantData;

      const { error } = await createTenant(finalTenantData);
      if (error) {
        throw new Error(error.message);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
              onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin User Email
            </label>
            {loadingAdmins ? (
              <div className="text-sm text-gray-500">Loading available admins...</div>
            ) : (
              <>
                {availableAdmins.length > 0 && (
                  <select
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                  >
                    <option value="">Select an admin user</option>
                    {availableAdmins.map((admin) => (
                      <option key={admin.id} value={admin.email}>
                        {admin.first_name} {admin.last_name} ({admin.email}) - {admin.role}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  placeholder="Enter admin email address"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {availableAdmins.length > 0 
                    ? "Select from dropdown or enter email manually" 
                    : "Enter the email address of the admin user"}
                </div>
              </>
            )}
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

// Edit Tenant Modal Component
const EditTenantModal: React.FC<{
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ tenant, onClose, onSuccess }) => {
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
      const { error } = await updateTenant(tenant.id, formData);
      if (error) {
        throw new Error(error.message);
      }

      onSuccess();
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Users
            </label>
            <input
              type="number"
              value={formData.max_users}
              onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Patients
            </label>
            <input
              type="number"
              value={formData.max_patients}
              onChange={(e) => setFormData({ ...formData, max_patients: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="1"
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
              {loading ? 'Updating...' : 'Update Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManagementDashboard;
