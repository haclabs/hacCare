import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PatientProvider>
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      </PatientProvider>
    </AuthProvider>
  </StrictMode>
);