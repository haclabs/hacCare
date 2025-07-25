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

// Initialize subdomain detection for production
if (import.meta.env.NODE_ENV === 'production') {
  // Force HTTPS in production
  if (window.location.protocol !== 'https:') {
    window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}`);
  }
  
  // Log subdomain for debugging
  const subdomain = getCurrentSubdomain();
  if (subdomain) {
    console.log('🏢 Tenant subdomain detected:', subdomain);
  }
}

// Initialize Supabase connection
testSupabaseConnection().then((isConnected) => {
  if (isConnected) {
    console.log('🚀 Application started with database connection')
  } else {
    console.log('🚀 Application started in offline mode')
  }
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