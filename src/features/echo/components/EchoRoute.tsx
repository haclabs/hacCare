import React, { Suspense, lazy } from 'react';
import { TenantProvider } from '../../../contexts/TenantContext';
import { PatientProvider } from '../../../contexts/PatientContext';
import { ProtectedRoute } from '../../../components/Auth/ProtectedRoute';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';

const EchoApp = lazy(() => import('./EchoApp'));

/** Route element for /echo/* — same provider stack as /app/*, minus the desktop shell. */
export const EchoRoute: React.FC = () => (
  <TenantProvider>
    <PatientProvider>
      <ProtectedRoute>
        <Suspense fallback={<LoadingSpinner />}>
          <EchoApp />
        </Suspense>
      </ProtectedRoute>
    </PatientProvider>
  </TenantProvider>
);
