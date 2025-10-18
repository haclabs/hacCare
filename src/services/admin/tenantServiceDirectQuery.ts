// Alternative getTenantUsers function that bypasses RPC
// Add this to tenantService.ts temporarily to test

import { supabase } from '../../lib/api/supabase';
import { TenantUser } from '../../types';

export async function getTenantUsersDirectQuery(tenantId: string): Promise<{ data: TenantUser[] | null; error: any }> {
  try {
    console.log('🔧 getTenantUsersDirectQuery called with tenantId:', tenantId);
    
    // Query tenant_users and user_profiles directly
    const { data, error } = await supabase
      .from('tenant_users')
      .select(`
        user_id,
        tenant_id,
        role,
        permissions,
        is_active,
        created_at,
        updated_at,
        user_profiles:user_id (
          id,
          email,
          first_name,
          last_name,
          is_active
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    console.log('📊 Direct query result:', { data, error });

    if (error) {
      console.error('❌ Direct query error:', error);
      return { data: null, error };
    }

    // Transform the data
    const tenantUsers: TenantUser[] = data?.map((row: any) => {
      console.log('🛠️ Processing direct query row:', row);
      
      const userProfile = row.user_profiles;
      const user = {
        id: `${row.user_id}-${row.tenant_id}`,
        user_id: row.user_id,
        tenant_id: row.tenant_id,
        role: row.role,
        permissions: row.permissions || [],
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_profiles: userProfile ? {
          id: userProfile.id,
          email: userProfile.email,
          full_name: userProfile.first_name && userProfile.last_name 
            ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
            : userProfile.email,
          avatar_url: undefined
        } : null
      };
      
      console.log('✅ Transformed direct query user:', user);
      return user;
    }) || [];

    console.log('🎯 Final direct query tenantUsers array:', tenantUsers);
    console.log('📊 Total users found via direct query:', tenantUsers.length);

    return { data: tenantUsers, error: null };
  } catch (error) {
    console.error('💥 Exception in getTenantUsersDirectQuery:', error);
    return { data: null, error };
  }
}
