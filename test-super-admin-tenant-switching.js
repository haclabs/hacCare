/**
 * Test Super Admin Tenant Switching
 * 
 * This file demonstrates how super admins can switch between tenants
 * and view data for specific tenants or all tenants.
 */

import { 
  isSuperAdmin,
  getTenantsForSwitching,
  switchTenantContext,
  getSuperAdminSelectedTenant,
  clearSuperAdminTenantSelection
} from '../src/lib/tenantService';

// Example usage for super admin tenant switching:

async function testTenantSwitching() {
  console.log('🧪 Testing Super Admin Tenant Switching');
  
  // 1. Check if current user is super admin
  const userIsSuperAdmin = await isSuperAdmin('your-user-id-here');
  console.log('Is Super Admin:', userIsSuperAdmin);
  
  if (!userIsSuperAdmin) {
    console.log('❌ User is not a super admin - tenant switching not available');
    return;
  }
  
  // 2. Get available tenants for switching
  const { data: availableTenants, error } = await getTenantsForSwitching();
  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }
  
  console.log('Available tenants:', availableTenants);
  
  // 3. Switch to a specific tenant
  if (availableTenants && availableTenants.length > 0) {
    const firstTenant = availableTenants[0];
    console.log(`🔄 Switching to tenant: ${firstTenant.name}`);
    switchTenantContext(firstTenant.id);
    
    // Check current selection
    const selectedTenant = getSuperAdminSelectedTenant();
    console.log('Currently selected tenant:', selectedTenant);
  }
  
  // 4. Clear selection to view all tenants
  console.log('🔄 Clearing tenant selection - viewing all tenants');
  clearSuperAdminTenantSelection();
  
  const selectedAfterClear = getSuperAdminSelectedTenant();
  console.log('Selected tenant after clear:', selectedAfterClear); // Should be null
}

// Component integration example:
/*
import { TenantSwitcher } from './components/Layout/TenantSwitcher';
import { useTenant } from './contexts/TenantContext';

function YourComponent() {
  const { 
    currentTenant, 
    isMultiTenantAdmin, 
    selectedTenantId,
    switchToTenant, 
    viewAllTenants 
  } = useTenant();

  return (
    <div>
      {isMultiTenantAdmin && (
        <>
          <TenantSwitcher />
          <div className="mt-4">
            {selectedTenantId ? (
              <p>Viewing tenant: {currentTenant?.name}</p>
            ) : (
              <p>Viewing all tenants</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
*/

export { testTenantSwitching };
