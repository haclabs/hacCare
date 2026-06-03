import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Building2, TrendingUp, AlertCircle, Trash2, Edit3, Settings, Tag, Play, FileText } from 'lucide-react';
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
import ProgramManagement from './ProgramManagement';
import { secureLogger } from '../../../../lib/security/secureLogger';

// ── Tenant row sub-component ────────────────────────────────────────────────
interface TenantRowProps {
  tenant: Tenant;
  isSelected: boolean;
  onSelect: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (id: string, permanent: boolean) => void;
}

const TenantRow: React.FC<TenantRowProps> = ({ tenant, isSelected, onSelect, onEdit, onDelete }) => (
  <div
    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
      isSelected ? 'bg-violet-50 border-l-2 border-violet-500' : 'border-l-2 border-transparent'
    }`}
    onClick={() => onSelect(tenant)}
  >
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{tenant.name}</p>
      <p className="text-xs text-gray-400 truncate">{tenant.subdomain}</p>
    </div>
    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
        tenant.status === 'active' ? 'bg-green-100 text-green-700'
        : tenant.status === 'inactive' ? 'bg-gray-100 text-gray-500'
        : 'bg-red-100 text-red-600'
      }`}>{tenant.status}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(tenant); }}
        className="p-1 text-gray-300 hover:text-blue-600 transition-colors"
        title="Edit"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>
      <div className="relative group">
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-gray-300 hover:text-red-600 transition-colors"
          title="Delete options"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
          <div className="py-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(tenant.id, false); }}
              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              Deactivate
              <div className="text-[10px] text-gray-400">Hide tenant, keep data</div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(tenant.id, true); }}
              className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              Delete Permanently
              <div className="text-[10px] text-red-400">Remove all data forever</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'settings'>('overview');
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

      // Filter out program tenants from overview (they appear in Programs tab)
      const nonProgramTenants = (tenantsResult.data || []).filter(
        tenant => tenant.tenant_type !== 'program'
      );
      setTenants(nonProgramTenants);
      setStats(statsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, []);

  const handleSelectTenant = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    
    try {
      // Load tenant users
      const { data: users, error: usersError } = await getTenantUsers(tenant.id);
      
      if (usersError) {
        secureLogger.error('Error loading tenant users:', usersError);
      } else {
        setTenantUsers(users || []);
      }

      // Load tenant patient stats
      const { data: patientStats, error: patientError } = await getTenantPatientStats(tenant.id);
      
      if (patientError) {
        secureLogger.error('❌ Error loading tenant patient stats:', patientError);
      } else {
        secureLogger.debug('✅ Loaded patient stats:', patientStats);
        setTenantPatientStats(patientStats);
      }
    } catch (err) {
      secureLogger.error('💥 Exception loading tenant data:', err);
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
      
      secureLogger.debug(`Starting ${actionText} for tenant:`, tenantId);
      
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
      
      secureLogger.debug(`✓ ${actionText} completed, refreshing dashboard...`);
      
      // Force refresh the dashboard data
      await loadDashboardData();
      
      // Clear selected tenant if it was the one deleted
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null);
      }
      
      secureLogger.debug('✓ Dashboard refreshed');
      
    } catch (err) {
      secureLogger.error(`Error in ${actionText}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${actionText} tenant`);
    } finally {
      setLoading(false);
    }
  };

  const groupedTenants = useMemo(() => ({
    institutions: tenants.filter(t =>
      t.tenant_type === 'institution' || t.tenant_type === 'production' ||
      t.tenant_type === 'hospital'    || t.tenant_type === 'clinic'
    ),
    templates: tenants.filter(t => t.tenant_type === 'simulation_template'),
    activeSimulations: tenants.filter(t => t.tenant_type === 'simulation_active'),
  }), [tenants]);

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
    <div className="min-h-full bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 bg-violet-100 rounded-xl">
              <Building2 className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Management Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage tenants and monitor system health</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-0.5 px-8">
          {([
            { id: 'overview' as const,  label: 'Tenant Overview',  Icon: Building2 },
            { id: 'programs' as const,  label: 'Programs',          Icon: Tag },
            { id: 'settings' as const,  label: 'Tenant Settings',   Icon: Settings },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'overview' ? (
          <>
            {/* Stats row */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg"><Building2 className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="text-xs text-gray-500">Total Tenants</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_tenants}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                    <div>
                      <p className="text-xs text-gray-500">Active Tenants</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.active_tenants}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg"><Users className="h-5 w-5 text-purple-600" /></div>
                    <div>
                      <p className="text-xs text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      stats.system_health === 'healthy' ? 'bg-green-50' :
                      stats.system_health === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                    }`}>
                      <AlertCircle className={`h-5 w-5 ${
                        stats.system_health === 'healthy' ? 'text-green-600' :
                        stats.system_health === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">System Health</p>
                      <p className={`text-lg font-bold capitalize ${
                        stats.system_health === 'healthy' ? 'text-green-600' :
                        stats.system_health === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>{stats.system_health}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grouped tenant list + detail panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: grouped lists */}
              <div className="lg:col-span-2 space-y-4">

                {/* Organizations */}
                {groupedTenants.institutions.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                      <div className="p-1.5 bg-blue-50 rounded-lg"><Building2 className="h-4 w-4 text-blue-600" /></div>
                      <span className="text-sm font-semibold text-gray-900">Organizations</span>
                      <span className="ml-auto text-xs text-gray-400 font-medium">{groupedTenants.institutions.length}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {groupedTenants.institutions.map((tenant) => (
                        <TenantRow
                          key={tenant.id}
                          tenant={tenant}
                          isSelected={selectedTenant?.id === tenant.id}
                          onSelect={handleSelectTenant}
                          onEdit={(t) => { setSelectedTenant(t); setShowEditForm(true); }}
                          onDelete={handleDeleteTenant}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Simulation Templates */}
                {groupedTenants.templates.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                      <div className="p-1.5 bg-amber-50 rounded-lg"><FileText className="h-4 w-4 text-amber-600" /></div>
                      <span className="text-sm font-semibold text-gray-900">Simulation Templates</span>
                      <span className="ml-auto text-xs text-gray-400 font-medium">{groupedTenants.templates.length}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {groupedTenants.templates.map((tenant) => (
                        <TenantRow
                          key={tenant.id}
                          tenant={tenant}
                          isSelected={selectedTenant?.id === tenant.id}
                          onSelect={handleSelectTenant}
                          onEdit={(t) => { setSelectedTenant(t); setShowEditForm(true); }}
                          onDelete={handleDeleteTenant}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Simulations */}
                {groupedTenants.activeSimulations.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                      <div className="p-1.5 bg-green-50 rounded-lg"><Play className="h-4 w-4 text-green-600" /></div>
                      <span className="text-sm font-semibold text-gray-900">Active Simulations</span>
                      <span className="ml-auto text-xs text-gray-400 font-medium">{groupedTenants.activeSimulations.length}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {groupedTenants.activeSimulations.map((tenant) => (
                        <TenantRow
                          key={tenant.id}
                          tenant={tenant}
                          isSelected={selectedTenant?.id === tenant.id}
                          onSelect={handleSelectTenant}
                          onEdit={(t) => { setSelectedTenant(t); setShowEditForm(true); }}
                          onDelete={handleDeleteTenant}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: detail panel */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                {selectedTenant ? (
                  <>
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h2 className="text-sm font-semibold text-gray-900">{selectedTenant.name}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{selectedTenant.subdomain}</p>
                    </div>
                    <div className="p-5 space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Plan</span>
                        <span className="font-medium text-gray-900 capitalize">{selectedTenant.subscription_plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Users</span>
                        <span className={`font-medium ${
                          tenantUsers.length >= selectedTenant.max_users ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {tenantUsers.length} / {selectedTenant.max_users}
                          {tenantUsers.length >= selectedTenant.max_users && <span className="ml-1 text-xs">(limit)</span>}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Patients</span>
                        <span className={`font-medium ${
                          (tenantPatientStats?.total || 0) >= selectedTenant.max_patients ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {tenantPatientStats?.total || 0} / {selectedTenant.max_patients}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span className="font-medium text-gray-900">{new Date(selectedTenant.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Users list */}
                      {tenantUsers.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Users ({tenantUsers.length})</p>
                          <div className="space-y-1.5">
                            {tenantUsers.map((user) => (
                              <div key={user.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-xs font-medium text-gray-900">{user.user_profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-[11px] text-gray-400">{user.user_profiles?.email || '—'}</p>
                                </div>
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">{user.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Patient breakdown */}
                      {tenantPatientStats && tenantPatientStats.total > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Patients by Condition</p>
                          <div className="space-y-1">
                            {Object.entries(tenantPatientStats.by_condition).map(([cond, count]) => (
                              <div key={cond} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{cond}</span>
                                <span className="font-medium text-gray-900">{count}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-blue-600 mt-2">Recent (30d): {tenantPatientStats.recent_admissions}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Building2 className="h-10 w-10 mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">Select a tenant to view details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modals */}
            {showCreateForm && (
              <CreateTenantModal
                onClose={() => setShowCreateForm(false)}
                onSuccess={() => { setShowCreateForm(false); loadDashboardData(); }}
              />
            )}
            {showEditForm && selectedTenant && (
              <EditTenantModal
                tenant={selectedTenant}
                onClose={() => setShowEditForm(false)}
                onSuccess={() => { setShowEditForm(false); loadDashboardData(); }}
              />
            )}
          </>
        ) : activeTab === 'programs' ? (
          <ProgramManagement />
        ) : (
          <TenantSettings />
        )}
      </div>
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

  useEffect(() => {
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
        
        secureLogger.error('Error loading admins:', { rpcError, profileError });
        setError('Could not load available admins. You can still enter an email manually.');
        setAvailableAdmins([]);
        
      } catch (err) {
        secureLogger.error('Error loading available admins:', err);
        setError('Could not load available admins. You can still enter an email manually.');
        setAvailableAdmins([]);
      } finally {
        setLoadingAdmins(false);
      }
    };
    loadAvailableAdmins();
  }, []);

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
      
      secureLogger.error('User not found:', { email, rpcError, profileError });
      return null;
      
    } catch (err) {
      secureLogger.error('Error finding user by email:', err);
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
