import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>
);