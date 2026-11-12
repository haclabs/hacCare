import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useMatch } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useTenant } from '../../../contexts/TenantContext';
import { ECHO_PATH, setEchoPreferred } from '../echoMode';
import { EchoHeader } from './EchoHeader';
import { EchoSimulationList } from './EchoSimulationList';
import { EchoScanPatient } from './EchoScanPatient';
import { EchoPatient } from './EchoPatient';
import { EchoCameraProvider } from './EchoCamera';

/**
 * Echo — the bedside tablet (or phone) shell. Deliberately limited: pick a simulation, scan a
 * wristband, then work from that patient's bedside tabs (MAR, vitals, I&O, orders). No sidebar.
 */
const EchoApp: React.FC = () => {
  const { currentTenant, loading } = useTenant();
  const inSimulation = currentTenant?.tenant_type === 'simulation_active';
  // Only block on the first load — a background tenant refresh must not unmount an open BCMA scan
  const initialLoad = loading && !currentTenant;
  const onPatientPage = !!useMatch(`${ECHO_PATH}/patient/*`);

  // Opening Echo once makes this device an Echo device: later sign-ins land back here
  useEffect(() => {
    setEchoPreferred(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <EchoHeader />
      {/* Bottom padding keeps the floating camera button off the last row */}
      <main className={inSimulation ? 'pb-24' : undefined}>
        <ErrorBoundary>
          {initialLoad ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-haccare-teal" />
            </div>
          ) : (
            <EchoCameraProvider showButton={inSimulation} aboveTabBar={onPatientPage}>
              <Routes>
                <Route index element={inSimulation ? <EchoScanPatient /> : <EchoSimulationList />} />
                <Route
                  path="patient/:id/:tab?"
                  element={inSimulation ? <EchoPatient /> : <Navigate to={ECHO_PATH} replace />}
                />
                <Route path="*" element={<Navigate to={ECHO_PATH} replace />} />
              </Routes>
            </EchoCameraProvider>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default EchoApp;
