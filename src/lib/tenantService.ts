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
    // Add cache busting by adding a timestamp to force fresh data
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      return { data: null, error };
    }

    console.log(`📊 Fetched ${data?.length || 0} tenants from database at ${new Date().toISOString()}`);
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
 * Permanently delete tenant and all related data
 * WARNING: This is irreversible and will delete all tenant data
 */
export async function permanentlyDeleteTenant(tenantId: string): Promise<{ error: any }> {
  try {
    // First, check if tenant exists
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      return { error: fetchError || new Error('Tenant not found') };
    }

    console.log(`🗑️ Starting permanent deletion for tenant: ${tenant.name}`);

    // Delete in strict order to handle all possible foreign key constraints:
    
    // 1. Delete tenant users first (they reference tenants)
    console.log('1️⃣ Deleting tenant users...');
    const { error: tenantUsersError } = await supabase
      .from('tenant_users')
      .delete()
      .eq('tenant_id', tenantId);

    if (tenantUsersError) {
      console.error('Error deleting tenant users:', tenantUsersError);
      return { error: tenantUsersError };
    }

    // 2. Get all patients for this tenant
    console.log('2️⃣ Getting patients for tenant...');
    const { data: patients } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('tenant_id', tenantId);

    if (patients && patients.length > 0) {
      const patientIdStrings = patients.map(p => p.patient_id);
      console.log(`Found ${patients.length} patients to clean up`);

      // 3. Delete patient-related data by patient_id
      const cleanupOperations = [
        {
          table: 'medication_administrations',
          column: 'patient_id',
          ids: patientIdStrings,
          description: 'medication administrations'
        },
        {
          table: 'patient_notes',
          column: 'patient_id',
          ids: patientIdStrings,
          description: 'patient notes'
        }
      ];

      for (const { table, column, ids, description } of cleanupOperations) {
        try {
          console.log(`3️⃣ Deleting ${description}...`);
          const { error: cleanupError } = await supabase
            .from(table)
            .delete()
            .in(column, ids);

          if (cleanupError) {
            console.warn(`Error cleaning ${description}:`, cleanupError);
          } else {
            console.log(`✓ Deleted ${description}`);
          }
        } catch (e) {
          console.warn(`Failed to clean ${description}:`, e);
        }
      }
    }

  // 4. Delete patients for this tenant
  console.log('4️⃣ Deleting patients...');
  const { error: patientsError } = await supabase
    .from('patients')
    .delete()
    .eq('tenant_id', tenantId);

  if (patientsError) {
    console.error('Error deleting patients:', patientsError);
    return { error: patientsError };
  }
  console.log('✓ Deleted patients');

  // 5. Try to find and delete any other references
  // Only check tables that are likely to exist in your database
  const knownTenantReferences = [
    'patient_vitals',   // should have tenant_id
    'patient_notes',    // should have tenant_id
    'patient_medications', // should have tenant_id
    'medication_administrations', // should have tenant_id
    'patient_images',   // should have tenant_id
  ];

  // Tables that might exist (check first before attempting delete)
  const possibleTenantReferences: string[] = [
    // Skip user_profiles and audit_logs as they don't have tenant_id
    // Skip tables that definitely don't exist in your database
    // All cleanup is now handled by the knownTenantReferences above
  ];

  // Clean known tables first
  for (const table of knownTenantReferences) {
    try {
      console.log(`5️⃣ Cleaning ${table}...`);
      const { error: refError } = await supabase
        .from(table)
        .delete()
        .eq('tenant_id', tenantId);

      if (refError) {
        if (refError.message.includes('does not exist') || refError.code === 'PGRST106') {
          console.log(`ℹ️  ${table} doesn't exist`);
        } else if (refError.message.includes('column')) {
          console.log(`ℹ️  ${table} has no tenant_id column`);
        } else {
          console.warn(`⚠️  Error cleaning ${table}:`, refError.message);
        }
      } else {
        console.log(`✓ Cleaned ${table}`);
      }
    } catch (e) {
      console.log(`ℹ️  Skipping ${table} (doesn't exist)`);
    }
  }

  // Check possible tables with verification first
  for (const table of possibleTenantReferences) {
    try {
      console.log(`5️⃣ Checking if ${table} exists...`);
      
      // First, try a simple select to see if table exists and has tenant_id
      const { data: checkData, error: checkError } = await supabase
        .from(table)
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);

      if (checkError) {
        if (checkError.code === 'PGRST106' || checkError.message.includes('does not exist')) {
          console.log(`ℹ️  ${table} doesn't exist`);
        } else if (checkError.message.includes('column')) {
          console.log(`ℹ️  ${table} has no tenant_id column`);
        } else {
          console.log(`ℹ️  Skipping ${table}: ${checkError.message}`);
        }
        continue;
      }

      // If we get here, table exists and has tenant_id column
      if (checkData && checkData.length > 0) {
        console.log(`🧹 Found data in ${table}, deleting...`);
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('tenant_id', tenantId);

        if (deleteError) {
          console.warn(`⚠️  Error cleaning ${table}:`, deleteError.message);
        } else {
          console.log(`✓ Cleaned ${table}`);
        }
      } else {
        console.log(`ℹ️  ${table} has no records for this tenant`);
      }
    } catch (e) {
      console.log(`ℹ️  Skipping ${table} (error during check)`);
    }
  }

  // 6. Finally, attempt to delete the tenant itself
  console.log(`6️⃣ Attempting to delete tenant: ${tenantId}`);
  
  // Try with bypass RLS for this critical operation
  const { data: deleteData, error: deleteError } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)
    .select();

  console.log('Delete response:', { deleteData, deleteError });

  if (deleteError) {
    console.error('❌ Error permanently deleting tenant:', deleteError);
    return { error: deleteError };
  }

  if (!deleteData || deleteData.length === 0) {
    console.error('❌ No tenant was deleted - tenant may not exist or deletion was blocked');
    return { error: new Error('Tenant deletion failed - no records were deleted') };
  }

  console.log(`✅ Tenant "${tenant.name}" permanently deleted successfully (${deleteData.length} record(s))`);
  
  // Small delay to ensure database transaction is committed
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { error: null };
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { error: null };

  } catch (error) {
    console.error('Error permanently deleting tenant:', error);
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
    // Use the RPC function to avoid RLS conflicts
    const { data, error } = await supabase
      .rpc('get_tenant_users', { target_tenant_id: tenantId });

    if (error) {
      console.error('Error fetching tenant users:', error);
      return { data: null, error };
    }

    // Transform the data to match the expected TenantUser interface
    const tenantUsers: TenantUser[] = data?.map((row: any) => {
      console.log('🛠️ Processing row:', row);
      
      const user = {
        id: `${row.user_id}-${row.tenant_id}`, // Generate a unique ID
        user_id: row.user_id,
        tenant_id: row.tenant_id,
        role: row.role,
        permissions: row.permissions, // This is now TEXT[] instead of JSONB
        is_active: row.is_active,
        created_at: new Date().toISOString(), // These fields might not be returned by RPC
        updated_at: new Date().toISOString(),
        user_profiles: {
          id: row.user_id,
          email: row.email,
          full_name: row.first_name && row.last_name 
            ? `${row.first_name} ${row.last_name}`.trim()
            : row.email, // Fallback to email if names not available
          avatar_url: null
        }
      };
      
      console.log('✅ Transformed user:', user);
      return user;
    }) || [];

    return { data: tenantUsers, error: null };
  } catch (error) {
    console.error('Error in getTenantUsers:', error);
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
    // Use the RPC function to avoid RLS conflicts
    const { data: tenantData, error: tenantError } = await supabase
      .rpc('get_user_current_tenant', { target_user_id: userId });

    if (tenantError) {
      return { data: null, error: tenantError };
    }

    if (!tenantData || tenantData.length === 0) {
      return { data: null, error: new Error(`User ${userId} is not associated with any active tenant`) };
    }

    // Get the full tenant details using the tenant_id
    const { data: tenant, error: fullTenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantData[0].tenant_id)
      .single();

    if (fullTenantError) {
      return { data: null, error: fullTenantError };
    }

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
 * Get tenant by subdomain
 */
export async function getTenantBySubdomain(subdomain: string): Promise<{ data: Tenant | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as Tenant, error: null };
  } catch (error) {
    console.error('Error fetching tenant by subdomain:', error);
    return { data: null, error };
  }
}

/**
 * Clear super admin tenant selection (view all tenants)
 */
export function clearSuperAdminTenantSelection(): void {
  localStorage.removeItem('superAdminSelectedTenant');
}
