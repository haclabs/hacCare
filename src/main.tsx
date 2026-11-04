import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Hidden - uncomment to show TanStack devtools
import { SimulationAwareAuthProvider } from './contexts/auth/SimulationAwareAuthProvider';
import { PatientProvider } from './contexts/PatientContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoginForm } from './components/Auth/LoginForm';
import { PrivacyPage } from './components/Auth/PrivacyPage';
import { SetNewPassword } from './components/Auth/SetNewPassword';
import { LandingPage } from './components/LandingPage/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/api/queryClient';
import { initializeBarcodeScanner } from './lib/barcode/barcodeScanner';
import App from './App.tsx';
import './index.css';
import { testSupabaseConnection } from './lib/api/supabase';
import { getCurrentSubdomain } from './lib/infrastructure/subdomainService';
import { secureLogger } from './lib/security/secureLogger';
import { ROVER_PATH, isRoverHost } from './features/rover/roverMode';
import { RoverRoute } from './features/rover/components/RoverRoute';
// import { initializeAuth } from './lib/browserAuthFix'; // Disabled for deployment fix

// The rover. subdomain is locked to the bedside tablet view
const roverHost = isRoverHost();

// Initialize subdomain detection for production
if (import.meta.env.NODE_ENV === 'production') {
  // SECURITY NOTE: This client-side HTTPS redirect can be bypassed
  // For proper security, configure HTTPS redirect at the server/CDN level
  // This is a fallback measure only
  if (window.location.protocol !== 'https:' && import.meta.env.VITE_ENABLE_HTTPS_REDIRECT !== 'false') {
    // Assign protocol directly — no URL construction from user-controlled
    // components, which avoids Snyk's Open Redirect taint-flow rule.
    window.location.protocol = 'https:';
  }
  
  // Log subdomain for debugging
  const subdomain = getCurrentSubdomain();
  if (subdomain) {
    secureLogger.debug('Tenant subdomain detected', { subdomain });
  }
}

// Initialize barcode scanner for BCMA functionality
const cleanupBarcodeScanner = initializeBarcodeScanner();

// Initialize Supabase connection - auth persistence disabled for deployment fix
testSupabaseConnection().then((isConnected) => {
  secureLogger.info('Application initialization complete', { dbConnected: isConnected });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Top-level safety net: catches any render error not already caught by
        a route-level boundary, so the whole app can't go blank. */}
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SimulationAwareAuthProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={roverHost ? <Navigate to={ROVER_PATH} replace /> : <LandingPage />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/set-password" element={<SetNewPassword />} />
                
                {/* Bedside tablet (Rover) */}
                <Route path={`${ROVER_PATH}/*`} element={<RoverRoute />} />

                {/* Protected application routes */}
                <Route path="/app/*" element={roverHost ? <Navigate to={ROVER_PATH} replace /> : (
                  <TenantProvider>
                    <PatientProvider>
                      <ProtectedRoute>
                        <App />
                      </ProtectedRoute>
                    </PatientProvider>
                  </TenantProvider>
                )} />
              </Routes>
            </SimulationAwareAuthProvider>
          </ThemeProvider>
          {/* ReactQueryDevtools hidden - uncomment to show TanStack devtools */}
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupBarcodeScanner();
});
