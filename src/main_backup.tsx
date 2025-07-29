import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/auth/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import './index.css';
import { testSupabaseConnection } from './lib/supabase';
import { getCurrentSubdomain } from './lib/subdomainService';
import { initializeAuth } from './lib/browserAuthFix';de } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/auth/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import './index.css';
import { testSupabaseConnection } from './lib/supabase';
import { getCurrentSubdomain } from './lib/subdomainService';
import { initializeAuthPersistence } from './lib/directAuthFix';

// Initialize subdomain detection for production
if (import.meta.env.NODE_ENV === 'production') {
  // SECURITY NOTE: This client-side HTTPS redirect can be bypassed
  // For proper security, configure HTTPS redirect at the server/CDN level
  // This is a fallback measure only
  if (window.location.protocol !== 'https:' && import.meta.env.VITE_ENABLE_HTTPS_REDIRECT !== 'false') {
    window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}`);
  }
  
  // Log subdomain for debugging
  const subdomain = getCurrentSubdomain();
  if (subdomain) {
    console.log('🏢 Tenant subdomain detected:', subdomain);
  }
}

// Initialize Supabase connection and authentication persistence
Promise.all([
  testSupabaseConnection(),
  initializeAuthPersistence()
]).then(([isConnected, authRestored]) => {
  console.log('🚀 Application initialization complete');
  console.log('📡 Database connected:', isConnected);
  console.log('� Auth session restored:', authRestored);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              <AlertProvider>
                <PatientProvider>
                  <ProtectedRoute>
                    <App />
                  </ProtectedRoute>
                </PatientProvider>
              </AlertProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);