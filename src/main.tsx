import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SimulationAwareAuthProvider } from './contexts/auth/SimulationAwareAuthProvider';
import { PatientProvider } from './contexts/PatientContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import { initializeBarcodeScanner } from './lib/barcodeScanner';
import App from './App.tsx';
import SimulationLogin from './components/Auth/SimulationLogin';
import SimulationDashboard from './components/Simulation/SimulationDashboard';
import './index.css';
import { testSupabaseConnection } from './lib/supabase';
import { getCurrentSubdomain } from './lib/subdomainService';
// import { initializeAuth } from './lib/browserAuthFix'; // Disabled for deployment fix

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

// Initialize barcode scanner for BCMA functionality
const cleanupBarcodeScanner = initializeBarcodeScanner();

// Initialize Supabase connection - auth persistence disabled for deployment fix
testSupabaseConnection().then((isConnected) => {
  console.log('🚀 Application initialization complete');
  console.log('📡 Database connected:', isConnected);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Routes>
            {/* Simulation-specific routes that don't need authentication */}
            <Route path="/simulation-login" element={<SimulationLogin />} />
            <Route path="/simulation-dashboard" element={<SimulationDashboard />} />
            
            {/* Main application routes */}
            <Route path="/*" element={
              <SimulationAwareAuthProvider>
                <TenantProvider>
                  <SimulationProvider>
                    <AlertProvider>
                      <PatientProvider>
                        <ProtectedRoute>
                          <App />
                        </ProtectedRoute>
                      </PatientProvider>
                    </AlertProvider>
                  </SimulationProvider>
                </TenantProvider>
              </SimulationAwareAuthProvider>
            } />
          </Routes>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupBarcodeScanner();
});
