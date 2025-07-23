import { supabase } from './supabase';
import { Tenant, TenantUser, ManagementDashboardStats } from '../types';

/**
 * Tenant Service
 * 
 * This service handles all tenant-related operations including:
 * - CRUD operations for tenants
 * - Tenant user management
 * - Multi-tenant data filtering
 * - Management dashboard statistics
 */

/**
 * Create a new tenant
 */
export async function createTenant(tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Tenant | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .insert([tenantData])
      .select();

    if (error) {
      console.error('Error creating tenant:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('No data returned from tenant creation') };
    }

    // Return the first (and should be only) created tenant
    return { data: data[0] as Tenant, error: null };
  } catch (error) {
    console.error('Error creating tenant:', error);
    return { data: null, error };
  }
}

/**
 * Get all tenants (for management dashboard)
 */
export async function getAllTenants(): Promise<{ data: Tenant[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return { data: null, error };
  }
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<{ data: Tenant | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId);

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error(`Tenant with ID ${tenantId} not found`) };
    }

    if (data.length > 1) {
      console.warn(`Warning: Found ${data.length} tenants with ID ${tenantId}. This should not happen.`);
    }

    return { data: data[0] as Tenant, error: null };
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return { data: null, error };
  }
}

/**
 * Update tenant
 */
export async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<{ data: Tenant | null; error: any }> {
  try {
    // First check if the tenant exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId);

    if (checkError) {
      return { data: null, error: checkError };
    }

    if (!existingTenant || existingTenant.length === 0) {
      return { data: null, error: new Error(`Tenant with ID ${tenantId} not found`) };
    }

    // Now perform the update
    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select();

    if (error) {
      console.error('Update error:', error);
      return { data: null, error };
    }

    // If no data is returned, it could mean no changes were made or there was an issue
    // In this case, fetch the current tenant data to verify it still exists
    if (!data || data.length === 0) {
      console.warn(`No data returned from update for tenant ${tenantId}, fetching current state...`);
      
      const { data: currentTenant, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId);
      
      if (fetchError) {
        console.error('Error fetching tenant after update:', fetchError);
        return { data: null, error: fetchError };
      }
      
      if (!currentTenant || currentTenant.length === 0) {
        return { data: null, error: new Error(`Tenant ${tenantId} not found after update`) };
      }
      
      // Return the existing tenant data
      console.log(`Successfully retrieved tenant data after update: ${currentTenant[0].name}`);
      return { data: currentTenant[0] as Tenant, error: null };
    }

    if (data.length > 1) {
      console.warn(`Warning: Update affected ${data.length} rows for tenant ${tenantId}`);
    }

    // Return the first (and hopefully only) updated row
    return { data: data[0] as Tenant, error: null };
  } catch (error) {
    console.error('Error updating tenant:', error);
    return { data: null, error };
  }
}

/**
 * Delete tenant (soft delete by setting status to inactive)
 */
export async function deleteTenant(tenantId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('tenants')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', tenantId);

    return { error };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return { error };
  }
}

/**
 * Add user to tenant
 */
export async function addUserToTenant(tenantId: string, userId: string, role: string): Promise<{ data: TenantUser | null; error: any }> {
  try {
    const tenantUser = {
      tenant_id: tenantId,
      user_id: userId,
      role,
      permissions: getDefaultPermissions(role),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    };

    const { data, error } = await supabase
      .from('tenant_users')
      .insert([tenantUser])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error adding user to tenant:', error);
    return { data: null, error };
  }
}

/**
 * Get users for a tenant
 */
export async function getTenantUsers(tenantId: string): Promise<{ data: TenantUser[] | null; error: any }> {
  try {
    // Now we can use proper joins with foreign keys
    const { data, error } = await supabase
      .from('tenant_users')
      .select(`
        *,
        user_profiles!tenant_users_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          role,
          department,
          license_number,
          phone,
          is_active
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tenant users with foreign keys:', error);
      // Fallback to manual join if foreign key join fails
      return getTenantUsersManual(tenantId);
    }

    return { data: data as TenantUser[], error: null };
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return { data: null, error };
  }
}

/**
 * Fallback method for getting tenant users (manual join)
 */
async function getTenantUsersManual(tenantId: string): Promise<{ data: TenantUser[] | null; error: any }> {
  try {
    // First get tenant users
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (tenantUsersError) {
      return { data: null, error: tenantUsersError };
    }

    if (!tenantUsers || tenantUsers.length === 0) {
      return { data: [], error: null };
    }

    // Get user IDs
    const userIds = tenantUsers.map(tu => tu.user_id);

    // Fetch user profiles separately (updated column names)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, role, department, license_number, phone, is_active')
      .in('id', userIds);

    if (profilesError) {
      // If profiles can't be fetched, return tenant users without profile data
      console.warn('Could not fetch user profiles:', profilesError);
      return { data: tenantUsers as TenantUser[], error: null };
    }

    // Combine the data manually
    const enrichedUsers = tenantUsers.map(tenantUser => ({
      ...tenantUser,
      user_profiles: userProfiles?.find(profile => profile.id === tenantUser.user_id) || null
    })) as TenantUser[];

    return { data: enrichedUsers, error: null };
  } catch (error) {
    console.error('Error fetching tenant users manually:', error);
    return { data: null, error };
  }
}

/**
 * Remove user from tenant
 */
export async function removeUserFromTenant(tenantId: string, userId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('tenant_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    return { error };
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    return { error };
  }
}

/**
 * Get management dashboard statistics
 */
export async function getManagementDashboardStats(): Promise<{ data: ManagementDashboardStats | null; error: any }> {
  try {
    // Get tenant counts
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, status');

    if (tenantsError) throw tenantsError;

    const totalTenants = tenants?.length || 0;
    const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact' });

    if (usersError) throw usersError;

    // Get total patients
    const { count: totalPatients, error: patientsError } = await supabase
      .from('patients')
      .select('id', { count: 'exact' });

    if (patientsError) throw patientsError;

    // Calculate growth rate (simplified - you might want to implement proper time-based calculations)
    const growthRate = activeTenants > 0 ? ((activeTenants / totalTenants) * 100) : 0;

    const stats: ManagementDashboardStats = {
      total_tenants: totalTenants,
      active_tenants: activeTenants,
      total_users: totalUsers || 0,
      total_patients: totalPatients || 0,
      monthly_revenue: 0, // This would come from a billing system
      growth_rate: growthRate,
      system_health: activeTenants > 0 ? 'healthy' : 'warning'
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { data: null, error };
  }
}

/**
 * Get all users available to be tenant admins
 */
export async function getAvailableAdminUsers(): Promise<{ data: { id: string; email: string; first_name: string; last_name: string; role: string; }[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, role')
      .in('role', ['admin', 'super_admin']) // Only users who can be tenant admins
      .eq('is_active', true)
      .order('email');

    return { data, error };
  } catch (error) {
    console.error('Error fetching available admin users:', error);
    return { data: null, error };
  }
}

/**
 * Get current user's tenant
 */
export async function getCurrentUserTenant(userId: string): Promise<{ data: Tenant | null; error: any }> {
  try {
    const { data: tenantUsers, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select(`
        tenant_id,
        tenants!tenant_users_tenant_id_fkey (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (tenantUserError) {
      return { data: null, error: tenantUserError };
    }

    if (!tenantUsers || tenantUsers.length === 0) {
      return { data: null, error: new Error(`User ${userId} is not associated with any active tenant`) };
    }

    if (tenantUsers.length > 1) {
      console.warn(`Warning: User ${userId} belongs to ${tenantUsers.length} tenants. Returning the first one.`);
    }

    const tenant = (tenantUsers[0]?.tenants as unknown) as Tenant;
    return { data: tenant, error: null };
  } catch (error) {
    console.error('Error fetching current user tenant:', error);
    return { data: null, error };
  }
}

/**
 * Filter data by tenant
 */
export function filterByTenant<T extends { tenant_id?: string }>(data: T[], tenantId: string): T[] {
  return data.filter(item => item.tenant_id === tenantId);
}

/**
 * Get default permissions for a role
 */
function getDefaultPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    admin: [
      'patients:read',
      'patients:write',
      'patients:delete',
      'users:read',
      'users:write',
      'users:delete',
      'medications:read',
      'medications:write',
      'medications:delete',
      'alerts:read',
      'alerts:write',
      'settings:read',
      'settings:write'
    ],
    doctor: [
      'patients:read',
      'patients:write',
      'medications:read',
      'medications:write',
      'alerts:read',
      'alerts:write'
    ],
    nurse: [
      'patients:read',
      'patients:write',
      'medications:read',
      'medications:write',
      'alerts:read',
      'alerts:write'
    ],
    viewer: [
      'patients:read',
      'alerts:read'
    ]
  };

  return permissions[role] || permissions.viewer;
}

/**
 * Check if user has permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === 'super_admin';
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

/**
 * Get all tenants for super admin tenant switching
 */
export async function getTenantsForSwitching(): Promise<{ data: Pick<Tenant, 'id' | 'name' | 'status'>[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name');

    return { data, error };
  } catch (error) {
    console.error('Error fetching tenants for switching:', error);
    return { data: null, error };
  }
}

/**
 * Switch tenant context for super admin (client-side only)
 * This doesn't change database relationships, just the viewing context
 */
export function switchTenantContext(tenantId: string | null): void {
  if (tenantId) {
    localStorage.setItem('superAdminSelectedTenant', tenantId);
  } else {
    localStorage.removeItem('superAdminSelectedTenant');
  }
}

/**
 * Get currently selected tenant for super admin
 */
export function getSuperAdminSelectedTenant(): string | null {
  return localStorage.getItem('superAdminSelectedTenant');
}

/**
 * Clear super admin tenant selection (view all tenants)
 */
export function clearSuperAdminTenantSelection(): void {
  localStorage.removeItem('superAdminSelectedTenant');
}
