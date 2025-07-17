import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/auth/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import './index.css';
import { testSupabaseConnection } from './lib/supabase'

// Initialize Supabase connection
testSupabaseConnection().then((isConnected) => {
  if (isConnected) {
    console.log('🚀 Application started with database connection')
  } else {
    console.log('🚀 Application started in offline mode')
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <PatientProvider>
              <AlertProvider>
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              </AlertProvider>
            </PatientProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      {/* React Query DevTools - only in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);