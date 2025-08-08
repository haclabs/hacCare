// FORCE TENANT CONTEXT REFRESH - Paste this in browser console (F12 > Console)
// This will clear all cached data and force the TenantContext to reload

console.log('🔄 Starting tenant context force refresh...');

// Clear all localStorage tenant-related data
Object.keys(localStorage).forEach(key => {
  if (key.includes('tenant') || key.includes('supabase')) {
    console.log('Clearing:', key);
    localStorage.removeItem(key);
  }
});

// Clear sessionStorage
sessionStorage.clear();

// Force reload without cache
console.log('🔄 Forcing page reload...');
window.location.reload(true);

// Alternative: If you want to try without reload first
// Try this instead of reload:
/*
console.log('🔄 Attempting context refresh without reload...');

// If you have access to React context refresh function
if (window.refreshTenantContext) {
  window.refreshTenantContext();
}

// Wait 2 seconds then check
setTimeout(() => {
  console.log('Current tenant context:', window.currentTenant);
}, 2000);
*/
