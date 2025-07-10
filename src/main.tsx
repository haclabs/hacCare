import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import App from './App.tsx';
import './index.css';
import { initializeSupabase } from './lib/supabase'

// Initialize Supabase connection
initializeSupabase().then((isConnected) => {
  if (isConnected) {
    console.log('🚀 Application started with database connection')
  } else {
    console.log('🚀 Application started in offline mode')
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>
);