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
import { getPatientByMedicationId } from './lib/medicationService';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { Patient } from './types';

// Lazy-loaded components
const HospitalBracelet = lazy(() => import('./components/Patients/HospitalBracelet'));
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
  const [braceletPatient, setBraceletPatient] = useState<Patient | null>(null);
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

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
   * Handle barcode scan from handheld scanner
   * @param {string} barcode - The scanned barcode string
   */
  const handleBarcodeScan = async (barcode: string) => {
    try {
      setIsScanning(true);
      console.log('Barcode scanned:', barcode);
      
      // Log all patients for debugging
      console.log('All patients:', patients.map(p => ({ 
        id: p.id, 
        patient_id: p.patient_id, 
        name: `${p.first_name} ${p.last_name}` 
      })));
      
      if (barcode.startsWith('PT')) {
        // Patient barcode - extract patient ID and navigate to patient detail
        const patientId = barcode.substring(2); // Remove 'PT' prefix
        console.log('Extracted patient ID:', patientId);

        // Only log detailed comparison in debug mode to reduce console spam
        if (localStorage.getItem('debug-mode') === 'true') {
          patients.forEach(p => {
            console.log(`Comparing: Patient ${p.first_name} ${p.last_name} - ID: "${p.patient_id}" vs Scanned: "${patientId}"`);
          });
        }
        
        const patient = patients.find(p => p.patient_id === patientId);
        if (patient) {
          console.log('Patient found:', patient);
          navigate(`/patient/${patient.id}`);
        } else {
          console.warn(`Patient with ID ${patientId} not found`);
          
          // Try a more flexible search
          console.log('Patient not found with exact match, trying flexible search...');
          const flexibleMatch = patients.find(p => 
            p.patient_id.includes(patientId) || 
            patientId.includes(p.patient_id)
          );
          
          if (flexibleMatch) {
            console.log('Found patient with flexible matching:', flexibleMatch);
            console.log(`Match found: "${flexibleMatch.patient_id}" contains or is contained in "${patientId}"`);
            navigate(`/patient/${flexibleMatch.id}`);
            return;
          } else {
            console.log('No patient found with flexible matching, trying numeric-only matching...');
            
            // Try matching just the numeric part (for when PT prefix is missing)
            const numericMatch = patients.find(p => {
              // Extract numeric part from patient_id (remove PT prefix if present)
              const numericPatientId = p.patient_id.replace(/^PT/, '');
              return numericPatientId === patientId;
            });
            
            if (numericMatch) {
              console.log('Found patient with numeric-only matching:', numericMatch);
              console.log(`Match found: numeric part of "${numericMatch.patient_id}" matches "${patientId}"`);
              navigate(`/patient/${numericMatch.id}`);
              return;
            } else {
              console.log('No patient found with any matching method');
            }
          }
        }
      } else if (barcode.startsWith('MED')) {
        // Medication barcode - look up patient by medication ID
        const medicationId = barcode.substring(3); // Remove 'MED' prefix
        console.log('Extracted medication ID:', medicationId);
        const patient = await getPatientByMedicationId(medicationId);
        if (patient) {
          console.log('Patient found via medication:', patient);
          navigate(`/patient/${patient.patientId}`, { 
            state: { activeTab: 'medications' } 
          });
        } else {
          console.warn(`Patient for medication ID ${medicationId} not found`);
        }
      } else {
        console.log('Unknown barcode format, raw value:', barcode);
        
        // Try to guess the format
        if (/^\d+$/.test(barcode)) {
          console.log('Barcode appears to be numeric only, might be a patient ID without PT prefix');
          
          // Try to find patient with this numeric ID
          const numericMatch = patients.find(p => p.patient_id === `PT${barcode}` || p.patient_id === barcode);
          if (numericMatch) {
            console.log('Found patient with numeric ID match:', numericMatch);
            navigate(`/patient/${numericMatch.id}`);
            return;
          }
        }
        
        console.warn(`Unknown barcode format: ${barcode}`);
      }
    } catch (error) {
      console.error('Error processing barcode scan:', error);
    } finally {
      setIsScanning(false);
    }
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
        onBarcodeScan={handleBarcodeScan}
        isScanning={isScanning}
        onBarcodeScan={handleBarcodeScan}
        dbError={dbError} 
        isOffline={isOffline}
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
                <PatientDetail onShowBracelet={setBraceletPatient} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Suspense fallback={<LoadingSpinner />}>
            <HospitalBracelet
              patient={braceletPatient}
              onClose={() => setBraceletPatient(null)}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default App;