import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import PatientCard from './components/Patients/PatientCard';
import { PatientDetail } from './components/Patients/PatientDetail';
import { AlertPanel } from './components/Alerts/AlertPanel'; 
import { QuickStats } from './components/Dashboard/QuickStats';
import { usePatients } from './hooks/usePatients';
import { useAlerts } from './hooks/useAlerts';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { Patient } from './types';

// Lazy-loaded components
const HospitalBracelet = lazy(() => import('./components/Patients/HospitalBracelet').then(module => ({ default: module.HospitalBracelet })));
const PatientManagement = lazy(() => import('./components/Patients/PatientManagement').then(module => ({ default: module.PatientManagement })));
const UserManagement = lazy(() => import('./components/Users/UserManagement').then(module => ({ default: module.UserManagement })));
const Documentation = lazy(() => import('./components/Documentation/Documentation').then(module => ({ default: module.Documentation })));
const Changelog = lazy(() => import('./components/Changelog/Changelog').then(module => ({ default: module.Changelog })));
const Settings = lazy(() => import('./components/Settings/Settings').then(module => ({ default: module.Settings })));

/**
 * Main Application Component
 * 
 * The root component that manages the overall application state and routing.
 * Handles navigation between different sections, patient management, and
 * alert system coordination.
 * 
 * Features:
 * - Tab-based navigation system
 * - Patient selection and detail views
 * - Real-time alert management and notifications
 * - Role-based content rendering
 * - Hospital bracelet generation
 * 
 * @returns {JSX.Element} The main application component
 */
function App() {
  // Application state management
  const [activeTab, setActiveTab] = useState('patients');
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(false);

  // Get patients, alerts, and connection status from context
  const { patients, error: dbError } = usePatients();
  const { alerts, error: alertError, loading: alertLoading } = useAlerts();
  
  // Determine if we're in an offline state
  const isOffline = !!dbError && dbError.includes('connection');

  /**
   * Handle tab change - clear selected patient when navigating away from patient detail
   * @param {string} tab - The new active tab
   */
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Clear selected patient when navigating to a different tab
    navigate('/');
  };

  /**
   * Handle patient selection
   * @param {Patient} patient - The selected patient
   */
  const handlePatientSelect = (patient: Patient) => {
    navigate(`/patient/${patient.id}`);
  };

  /**
   * Render main content based on active tab
   * Handles routing between different application sections
   * 
   * @returns {JSX.Element} The content for the current active tab
   */
  const renderContent = () => {
    // Route to appropriate content based on active tab
    switch (activeTab) {
      case 'patients':
        return (
          <div className="space-y-6">
            {/* Dashboard Statistics */}
            <QuickStats patients={patients} alerts={alerts} />
            
            {/* Patient List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Patients</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {patients.length} patients assigned
                </div>
              </div>
              
              {dbError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Database Connection Error</h3>
                  <p className="text-red-600 dark:text-red-400">{dbError}</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-2">Please check your Supabase connection and try again.</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No Patients Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">No patients are currently assigned to you.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {patients.map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onClick={() => handlePatientSelect(patient)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'patient-management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PatientManagement />
          </Suspense>
        );

      case 'user-management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement />
          </Suspense>
        );

      case 'documentation':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Documentation />
          </Suspense>
        );

      case 'changelog':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Changelog />
          </Suspense>
        );
      
      case 'schedule':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Schedule Management</h2>
            <p className="text-gray-600 dark:text-gray-400">Shift scheduling and task management system coming soon...</p>
          </div>
        );
      
      case 'settings':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Settings />
          </Suspense>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Application Header */}
      <Header 
        onAlertsClick={() => setShowAlerts(true)}
        dbError={dbError} 
        isOffline={isOffline}
      />
      
      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar Navigation - Always visible */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/patient/:id" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PatientDetail />
              </Suspense>
            } />
            <Route path="*" element={renderContent()} />
          </Routes>
        </main>
      </div>

      {/* Alert Panel Overlay */}
      <AlertPanel
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
      />

      {/* Wrap HospitalBracelet in Suspense */}
      {braceletPatient && (
        <Suspense fallback={<LoadingSpinner />}>
          <HospitalBracelet
            patient={braceletPatient}
            onClose={() => setBraceletPatient(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;