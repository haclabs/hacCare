import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building, CreditCard, Users, Tag } from 'lucide-react';
import { supabase, UserProfile, UserRole } from '../../../../lib/api/supabase';
import { parseAuthError } from '../../../../utils/authErrorParser';
import { useAuth } from '../../../../hooks/useAuth';
import { getAllTenants } from '../../../../services/admin/tenantService';
import { getPrograms, getUserPrograms, bulkAssignUserToPrograms, type Program } from '../../../../services/admin/programService';
import { Tenant } from '../../../../types';

interface UserFormProps {
  user?: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSuccess }) => {
  const { hasRole } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    role: user?.role || 'nurse' as UserRole,
    department: user?.department || '',
    license_number: user?.license_number || '',
    phone: user?.phone || '',
    is_active: user?.is_active ?? true,
    simulation_only: user?.simulation_only ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'nurse' as UserRole,
        department: user.department || '',
        license_number: user.license_number || '',
        phone: user.phone || '',
        is_active: user.is_active ?? true,
        simulation_only: user.simulation_only ?? false,
      });
    }
  }, [user]);

  // Load tenants for super admin
  useEffect(() => {
    if (hasRole('super_admin')) {
      loadTenants();
    }
  }, [hasRole]);

  // Load programs when tenant is selected or when editing user
  useEffect(() => {
    if (selectedTenantId) {
      loadPrograms(selectedTenantId);
    }
  }, [selectedTenantId]);

  // Load user's existing programs when editing
  useEffect(() => {
    if (user?.id) {
      loadUserPrograms(user.id);
    }
  }, [user]);

  // Initialize selected tenant when user changes
  useEffect(() => {
    if (user?.id && hasRole('super_admin')) {
      // Load the user's current tenant
      const loadUserTenant = async () => {
        try {
          const { data, error } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data && !error && data.tenant_id) {
            setSelectedTenantId(data.tenant_id);
          }
        } catch (error) {
          console.error('Error loading user tenant:', error);
        }
      };
      loadUserTenant();
    }
  }, [user, hasRole]);

  const loadTenants = async () => {
    try {
      const { data: allTenants, error } = await getAllTenants();
      if (error) {
        console.error('Error loading tenants:', error);
        setError('Failed to load tenants');
        return;
      }
      setTenants(allTenants || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      setError('Failed to load tenants');
    }
  };

  const loadPrograms = async (tenantId: string) => {
    const { data, error } = await getPrograms(tenantId);
    if (!error && data) {
      setPrograms(data);
    }
  };

  const loadUserPrograms = async (userId: string) => {
    const { data, error } = await getUserPrograms(userId);
    if (!error && data) {
      setSelectedProgramIds(data.map(up => up.program_id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (user) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            // Note: department field removed - now using user_programs junction table
            license_number: formData.license_number,
            phone: formData.phone,
            is_active: formData.is_active,
            simulation_only: formData.simulation_only,
          })
          .eq('id', user.id);

        if (updateError) {
          setError(parseAuthError(updateError));
          return;
        }

        // Handle tenant assignment for super admin
        if (hasRole('super_admin') && selectedTenantId) {
          try {
            const { error: assignError } = await supabase
              .rpc('assign_user_to_tenant', {
                user_id_param: user.id,
                tenant_id_param: selectedTenantId
              });

            if (assignError) {
              console.error('Error assigning user to tenant:', assignError);
              setError('User updated but failed to assign to tenant: ' + parseAuthError(assignError));
              return;
            }
          } catch (assignError: any) {
            console.error('Error in tenant assignment:', assignError);
            setError('User updated but failed to assign to tenant: ' + parseAuthError(assignError));
            return;
          }
        }
      } else {
        // Create new user
        if (!formData.email || !formData.password) {
          setError('Email and password are required');
          return;
        }

        // For super admin, require tenant selection
        if (hasRole('super_admin') && !selectedTenantId) {
          setError('Please select a tenant for this user');
          return;
        }

        // Log what we're about to send
        console.log('Creating user with data:', {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
        });

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
            }
          }
        });

        if (authError) {
          setError(parseAuthError(authError));
          return;
        }

        if (authData.user) {
          // For admin-created users, immediately confirm their email so they can login
          try {
            const { error: confirmError } = await supabase
              .rpc('confirm_user_email', {
                target_user_id: authData.user.id
              });

            if (confirmError) {
              console.error('Error confirming user email:', confirmError);
              // Don't fail the creation, just warn
              console.warn('User created but email not confirmed. They may need to confirm via email.');
            }
          } catch (confirmError: any) {
            console.error('Error in email confirmation:', confirmError);
            // Continue with user creation even if confirmation fails
          }

          // Wait for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 800));

          // Use RPC function to update profile (bypasses RLS)
          console.log('Updating user profile via RPC:', {
            id: authData.user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
          });

          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('update_user_profile_admin', {
              p_user_id: authData.user.id,
              p_first_name: formData.first_name || null,
              p_last_name: formData.last_name || null,
              p_role: formData.role,
              p_department: formData.department || null,
              p_license_number: formData.license_number || null,
              p_phone: formData.phone || null,
              p_is_active: formData.is_active,
              p_simulation_only: formData.simulation_only
            });

          console.log('RPC update result:', { data: rpcResult, error: rpcError });

          if (rpcError) {
            console.error('❌ Profile update error:', rpcError);
            setError('User created but profile update failed: ' + parseAuthError(rpcError));
            // Don't return - continue with tenant assignment
          } else {
            console.log('✅ Profile updated successfully via RPC');
          }

          // Assign user to tenant (for super admin or default tenant)
          const tenantToAssign = hasRole('super_admin') ? selectedTenantId : null;
          if (tenantToAssign) {
            try {
              const { error: assignError } = await supabase
                .rpc('assign_user_to_tenant', {
                  user_id_param: authData.user.id,
                  tenant_id_param: tenantToAssign
                });

              if (assignError) {
                console.error('Error assigning new user to tenant:', assignError);
                setError('User created but failed to assign to tenant: ' + parseAuthError(assignError));
                return;
              }
            } catch (assignError: any) {
              console.error('Error in new user tenant assignment:', assignError);
              setError('User created but failed to assign to tenant: ' + parseAuthError(assignError));
              return;
            }
          }
        }
      }

      // Handle program assignments for instructors and coordinators
      const userId = user?.id || authData?.user?.id;
      if (userId && (formData.role === 'instructor' || formData.role === 'coordinator') && selectedProgramIds.length > 0) {
        const { error: programError } = await bulkAssignUserToPrograms(userId, selectedProgramIds);
        if (programError) {
          console.error('Error assigning programs:', programError);
          setError('User saved but failed to assign programs: ' + parseAuthError(programError));
          return;
        }
      }

      onSuccess();
    } catch (error: any) {
      setError(parseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const canEditRole = hasRole('super_admin') || (hasRole('admin') && formData.role === 'nurse');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!user}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              disabled={!canEditRole}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="nurse">Nurse</option>
              {hasRole(['admin', 'super_admin', 'coordinator']) && <option value="instructor">Instructor</option>}
              {hasRole(['admin', 'super_admin']) && <option value="admin">Admin</option>}
              {hasRole(['super_admin', 'coordinator']) && <option value="coordinator">Coordinator</option>}
              {hasRole('super_admin') && <option value="super_admin">Super Admin</option>}
            </select>
          </div>

          {hasRole('super_admin') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required={!user} // Required for new users
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
              {!user && (
                <p className="text-xs text-gray-500 mt-1">
                  Select which tenant this user will belong to
                </p>
              )}
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  Changing tenant will reassign the user
                </p>
              )}
            </div>
          )}

          {/* Program Assignment for Instructors and Coordinators */}
          {(formData.role === 'instructor' || formData.role === 'coordinator') && programs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Assigned Programs
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-2">
                {programs.map((program) => (
                  <label key={program.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProgramIds.includes(program.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProgramIds([...selectedProgramIds, program.id]);
                        } else {
                          setSelectedProgramIds(selectedProgramIds.filter(id => id !== program.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-blue-600">{program.code}</span> - {program.name}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === 'instructor' 
                  ? 'Instructors will only see simulations and templates for their assigned programs'
                  : 'Coordinators can see all programs but filter views by these programs'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Medical-Surgical, ICU, Emergency"
              />
            </div>
          </div>

          {formData.role === 'nurse' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Number
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="RN-12345"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="simulation_only"
              checked={formData.simulation_only}
              onChange={(e) => setFormData({ ...formData, simulation_only: e.target.checked })}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="simulation_only" className="ml-2 block text-sm text-gray-900">
              Simulation-Only User
              <span className="ml-1 text-xs text-gray-500">(Auto-routes to simulation lobby on login)</span>
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active User
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};