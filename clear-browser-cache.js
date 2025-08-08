-- BROWSER STORAGE CLEAR SCRIPT
-- Copy and paste this into your browser's Developer Console (F12 > Console tab)
-- This will clear all cached tenant data and force a fresh reload

// Clear all localStorage data related to tenant context
localStorage.removeItem('supabase.auth.token');
localStorage.removeItem('superAdminSelectedTenant');
localStorage.removeItem('selectedTenant');
localStorage.removeItem('currentTenant');

// Clear sessionStorage
sessionStorage.clear();

// Clear any cached React Query data (if using)
if (window.queryClient) {
  window.queryClient.clear();
}

// Force reload the page
console.log('🔄 Clearing all cached data and reloading...');
window.location.reload(true);
