import React, { Suspense, lazy } from 'react';
import { TenantProvider } from '../../../contexts/TenantContext';
import { PatientProvider } from '../../../contexts/PatientContext';
import { ProtectedRoute } from '../../../components/Auth/ProtectedRoute';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';

const RoverApp = lazy(() => import('./RoverApp'));

/** Route element for /rover/* — same provider stack as /app/*, minus the desktop shell. */
export const RoverRoute: React.FC = () => (
  <TenantProvider>
    <PatientProvider>
      <ProtectedRoute>
        <Suspense fallback={<LoadingSpinner />}>
          <RoverApp />
        </Suspense>
      </ProtectedRoute>
    </PatientProvider>
  </TenantProvider>
);
