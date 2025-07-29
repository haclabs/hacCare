// Simple auth debug for production deployment
console.log('🚀 Auth Debug - Environment Check');
console.log('Current URL:', window.location.href);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET (length: ' + import.meta.env.VITE_SUPABASE_ANON_KEY.length + ')' : 'NOT SET');
console.log('Environment:', import.meta.env.MODE);
console.log('Production?', import.meta.env.PROD);

// Force show login immediately if there's an issue
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables - auth will fail');
}

export const debugAuthEnvironment = () => {
  return {
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    environment: import.meta.env.MODE,
    isProduction: import.meta.env.PROD
  };
};
