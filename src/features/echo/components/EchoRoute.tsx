import React, { Suspense, lazy, useState } from 'react';
import { TenantProvider } from '../../../contexts/TenantContext';
import { PatientProvider } from '../../../contexts/PatientContext';
import { ProtectedRoute } from '../../../components/Auth/ProtectedRoute';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import { shouldShowDeviceFrame } from '../echoMode';
import { EchoDeviceFrame } from './EchoDeviceFrame';

const EchoApp = lazy(() => import('./EchoApp'));

/** Route element for /echo/* — same provider stack as /app/*, minus the desktop shell. */
export const EchoRoute: React.FC = () => {
  // Laptops get a phone-sized preview; its iframe loads this route again, unframed
  const [framed] = useState(shouldShowDeviceFrame);
  if (framed) return <EchoDeviceFrame />;

  return (
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
};
