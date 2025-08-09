// =============================================================================
// BROWSER CONSOLE AUTH DEBUGGING SCRIPT
// =============================================================================
// Copy and paste this into your browser console while on the hacCare app
// =============================================================================

console.log('🔍 STARTING COMPREHENSIVE AUTH DEBUG');

// Function to check auth state in detail
async function debugAuthChain() {
    console.log('\n1️⃣ === SUPABASE CLIENT CHECK ===');
    
    try {
        // Check if supabase is available
        if (typeof window.supabase === 'undefined') {
            console.log('❌ Supabase not available on window object');
            console.log('✋ Trying to access via import...');
            
            // Try to access from React DevTools or global scope
            const reactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            if (reactDevTools) {
                console.log('🔧 React DevTools detected');
            }
        }
        
        // Check Supabase configuration
        console.log('🔧 Environment check:');
        console.log('- URL:', window.location.origin);
        console.log('- NODE_ENV:', process?.env?.NODE_ENV || 'unknown');
        
    } catch (e) {
        console.error('❌ Error checking Supabase client:', e);
    }
    
    console.log('\n2️⃣ === LOCAL STORAGE CHECK ===');
    
    try {
        // Check localStorage for auth tokens
        const authKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
                authKeys.push(key);
            }
        }
        
        console.log('🔑 Auth-related localStorage keys:', authKeys);
        
        authKeys.forEach(key => {
            const value = localStorage.getItem(key);
            try {
                const parsed = JSON.parse(value);
                console.log(`📝 ${key}:`, {
                    hasAccessToken: !!parsed?.access_token,
                    hasRefreshToken: !!parsed?.refresh_token,
                    hasUser: !!parsed?.user,
                    userEmail: parsed?.user?.email || 'none',
                    expiresAt: parsed?.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'none'
                });
            } catch {
                console.log(`📝 ${key}: (not JSON)`, value?.substring(0, 100) + '...');
            }
        });
        
        // Check super admin tenant selection
        const selectedTenant = localStorage.getItem('superAdminSelectedTenant');
        console.log('🏢 Super admin selected tenant:', selectedTenant || 'none');
        
    } catch (e) {
        console.error('❌ Error checking localStorage:', e);
    }
    
    console.log('\n3️⃣ === REACT CONTEXT CHECK ===');
    
    try {
        // Try to access React contexts via DevTools
        const root = document.querySelector('#root');
        if (root && root._reactInternalFiber) {
            console.log('⚛️ React root found');
        } else if (root && root._reactInternalInstance) {
            console.log('⚛️ React root found (legacy)');
        } else {
            console.log('⚛️ React root structure unknown');
        }
        
        // Check for auth context in global scope
        if (window.authContext) {
            console.log('🔐 Auth context found:', window.authContext);
        } else {
            console.log('🔐 No auth context in global scope');
        }
        
    } catch (e) {
        console.error('❌ Error checking React contexts:', e);
    }
    
    console.log('\n4️⃣ === NETWORK CHECK ===');
    
    try {
        // Check if we can reach Supabase
        const supabaseUrl = 'https://your-project.supabase.co'; // Replace with your URL
        
        console.log('🌐 Testing network connectivity...');
        
        // Test basic connectivity
        const response = await fetch(supabaseUrl + '/rest/v1/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Supabase connectivity:', response.status, response.statusText);
        
    } catch (e) {
        console.error('❌ Network error:', e.message);
    }
    
    console.log('\n5️⃣ === RECOMMENDATIONS ===');
    
    // Provide recommendations based on findings
    console.log('💡 Based on the debug information above:');
    console.log('');
    console.log('✅ If you see auth tokens → Check expiration and refresh');
    console.log('❌ If no auth tokens → User needs to sign in');
    console.log('🔄 If tokens expired → Clear localStorage and re-authenticate');
    console.log('🏢 If selectedTenant is stuck → Clear localStorage.superAdminSelectedTenant');
    console.log('⚛️ If React contexts missing → Check component tree and providers');
    
    console.log('\n6️⃣ === QUICK FIXES ===');
    
    // Provide quick fix functions
    window.clearAuth = () => {
        console.log('🧹 Clearing all auth data...');
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        localStorage.removeItem('superAdminSelectedTenant');
        console.log('✅ Auth data cleared. Refresh the page.');
    };
    
    window.clearTenantSelection = () => {
        console.log('🏢 Clearing tenant selection...');
        localStorage.removeItem('superAdminSelectedTenant');
        console.log('✅ Tenant selection cleared. Refresh the page.');
    };
    
    console.log('🛠️ Available quick fixes:');
    console.log('- clearAuth() - Clear all auth data');
    console.log('- clearTenantSelection() - Clear tenant selection');
}

// Run the debug
debugAuthChain();

// Monitor auth changes
let authStateChanges = 0;
const originalConsoleLog = console.log;

// Intercept console logs to catch auth state changes
console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Auth state changed') || 
        message.includes('👤') || 
        message.includes('🔄') ||
        message.includes('TENANT CONTEXT')) {
        authStateChanges++;
        console.warn(`🔍 AUTH DEBUG [${authStateChanges}]:`, ...args);
    }
    originalConsoleLog.apply(console, args);
};

console.log('\n✅ AUTH DEBUGGING SCRIPT LOADED');
console.log('📊 Monitoring auth state changes...');
console.log('🔄 Refresh the page to see auth initialization sequence');
