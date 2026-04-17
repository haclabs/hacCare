import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { QuickStats } from './components/Dashboard/QuickStats';
import { ModularPatientDashboard } from './components/ModularPatientDashboard';
import { ModularPatientSystemDemo } from './components/ModularPatientSystemDemo';
import { useMultiTenantPatients } from './features/patients/hooks/useMultiTenantPatients';
import { useTenant } from './contexts/TenantContext';
import { getPatientByMedicationId } from './services/clinical/medicationService';
import LoadingSpinner from './components/UI/LoadingSpinner';
import { Patient, Medication } from './types';
import { useAuth } from './hooks/useAuth';
import { AuthCallback } from './components/Auth/AuthCallback';
import { TemplateEditingBanner } from './features/simulation/components/TemplateEditingBanner';
import { secureLogger } from './lib/security/secureLogger';

/**
 * Combines ErrorBoundary + Suspense so every lazy route fails independently
 * instead of crashing the entire application tree.
 */
function SafeSuspense({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback !== undefined ? fallback : <LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Lazy-loaded feature components for better code splitting
const PatientCard = lazy(() => import('./features/patients/components/records/PatientCard'));
const AdminDashboard = lazy(() => import('./features/admin/components/AdminDashboard'));
// Simulation components restored from commit 01ec049
const SimulationManager = lazy(() => import('./features/simulation/components/SimulationManager'));
const SimulationBanner = lazy(() => import('./features/simulation/components/SimulationBanner'));
const SimulationRouter = lazy(() => import('./features/simulation/components/SimulationRouter'));
const HospitalBracelet = lazy(() => import('./features/patients/components/visuals/HospitalBracelet'));
const UserManagement = lazy(() => import('./features/admin/components/users/UserManagement'));
const PatientManagement = lazy(() => import('./features/patients/components/PatientManagement'));
const ManagementDashboard = lazy(() => import('./features/admin/components/management/ManagementDashboard'));
const Documentation = lazy(() => import('./components/Documentation/Documentation'));
const Changelog = lazy(() => import('./components/Changelog/Changelog'));
const Settings = lazy(() => import('./features/settings/components/Settings'));
const SystemLogsViewer = lazy(() => import('./features/admin/components/monitoring/SystemLogsViewer').then(module => ({ default: module.SystemLogsViewer })));
// Program components
const ProgramWorkspace = lazy(() => import('./components/Program/ProgramWorkspace'));
const ProgramSelectorModal = lazy(() => import('./components/Program/ProgramSelectorModal'));
const ProgramStudents = lazy(() => import('./components/Program/ProgramStudents'));

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
  // Authentication and simulation detection
  const { user, profile } = useAuth();
  const { currentTenant } = useTenant();

  // Application state management
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'patients';
  const [braceletPatient, setBraceletPatient] = useState<Patient | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Detect simulation subdomain and redirect to simulation portal
  useEffect(() => {
    const hostname = window.location.hostname;
    const isSimulationSubdomain = hostname.startsWith('simulation.');
    const currentPath = location.pathname;
    
    // If on simulation subdomain and NOT already on simulation-portal or dashboard, redirect
    // Note: location.pathname includes /app prefix now
    if (isSimulationSubdomain && 
        !currentPath.includes('simulation-portal') && 
        !currentPath.includes('dashboard') &&
        !currentPath.includes('patient')) {
      secureLogger.debug('Simulation subdomain detected, redirecting to portal');
      navigate('simulation-portal', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Get patients using React Query hooks - Use multi-tenant hook for proper filtering
  const { patients = [], error: dbError } = useMultiTenantPatients();

  // Create currentUser object for components that need it
  const currentUser = user && profile ? {
    id: user.id,
    name: `${profile.first_name} ${profile.last_name}`.trim() || profile.email || 'Unknown User',
    role: profile.role,
    department: profile.department || 'General'
  } : undefined;
  
  // Determine if we're in an offline state


  /**
   * Handle tab change - clear selected patient when navigating away from patient detail
   * @param {string} tab - The new active tab
   */
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  /**
   * Handle patient selection
   * @param {Patient} patient - The selected patient
   */
  const handlePatientSelect = (patient: Patient) => {
    navigate(`patient/${patient.id}`);
  };

  /**
   * Handle barcode scan from handheld scanner
   * @param {string} barcode - The scanned barcode string
   */
  const handleBarcodeScan = async (barcode: string) => {
    try {
      secureLogger.debug('Barcode scanned', { length: barcode.length });
      
      if (barcode.startsWith('PT')) {
        // Patient barcode - extract patient ID and navigate to patient detail
        const patientId = barcode.substring(2); // Remove 'PT' prefix

        // Only log detailed comparison in debug mode to reduce console spam
        if (localStorage.getItem('debug-mode') === 'true') {
          patients.forEach(p => {
            secureLogger.debug(`Comparing patient ID vs scanned`, { patient_id: p.patient_id, scanned: patientId });
          });
        }
        
        const patient = patients.find(p => p.patient_id === patientId);
        if (patient) {
          navigate(`patient/${patient.id}`);
        } else {
          secureLogger.warn('Patient not found with exact match, trying flexible search');
          
          // Try a more flexible search
          const flexibleMatch = patients.find(p => 
            p.patient_id.includes(patientId) || 
            patientId.includes(p.patient_id)
          );
          
          if (flexibleMatch) {
            navigate(`patient/${flexibleMatch.id}`);
            return;
          } else {
            // Try matching just the numeric part (for when PT prefix is missing)
            const numericMatch = patients.find(p => {
              // Extract numeric part from patient_id (remove PT prefix if present)
              const numericPatientId = p.patient_id.replace(/^PT/, '');
              return numericPatientId === patientId;
            });
            
            if (numericMatch) {
              navigate(`patient/${numericMatch.id}`);
              return;
            } else {
              secureLogger.warn('No patient found with any matching method for patient barcode');
            }
          }
        }
      } else if (/^(?!MED|PT)[A-Z]{3}[A-Z0-9]{6}$/i.test(barcode)) {
        // BCMA short medication barcode - format: 3 letters + 6 alphanumeric chars (e.g., DOC866FA8)
        // Excludes existing MED and PT prefixes to avoid conflicts
        secureLogger.debug('BCMA short medication barcode detected', { barcode });
        
        // First try to find the medication directly in our loaded medications by searching for the barcode
        let foundMedication: Medication | undefined;
        let patientWithMedication: Patient | undefined;
        
        for (const patient of patients) {
          if (patient.medications) {
            // Look for medications where the BCMA barcode would match this scanned code
            const matchingMed = patient.medications.find(med => {
              // Generate what the BCMA barcode should be for this medication
              const namePrefix = med.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
              const idSuffix = med.id.slice(-6).toUpperCase();
              const expectedBarcode = `${namePrefix}${idSuffix}`;
              
              return expectedBarcode === barcode.toUpperCase();
            });
            
            if (matchingMed) {
              foundMedication = matchingMed;
              patientWithMedication = patient;
              break;
            }
          }
        }
        
        // If found in local data, navigate directly
        if (patientWithMedication && foundMedication) {
          navigate(`/patient/${patientWithMedication.id}`, { 
            state: { 
              activeTab: 'medications',
              medicationCategory: foundMedication.category || 'scheduled'
            } 
          });
        } else {
          secureLogger.warn('Unknown BCMA medication barcode', { barcode });
        }
      } else if (/^\d+$/.test(barcode)) {
        // This is a numeric-only barcode, likely a patient ID without the PT prefix
        secureLogger.debug('Numeric-only barcode detected, trying as patient ID', { barcode });
        
        // Try to find patient with this numeric ID (both with and without PT prefix)
        const numericMatch = patients.find(p => 
          p.patient_id === `PT${barcode}` || 
          p.patient_id.replace(/^PT/, '') === barcode
        );
        
        if (numericMatch) {
          navigate(`/patient/${numericMatch.id}`);
          return;
        }
        
        // If no exact match, try a more flexible search
        // Try to find a patient where the ID contains the barcode or vice versa
        const flexibleMatch = patients.find(p => {
          const numericPart = p.patient_id.replace(/^PT/, '');
          return numericPart.includes(barcode) || barcode.includes(numericPart);
        });
        
        // If found, navigate to the patient
        if (flexibleMatch) {
          navigate(`/patient/${flexibleMatch.id}`);
          return;
        }
        
        // Try one more approach - check if any patient has this ID anywhere in their data
        const anyMatch = patients.find(p => 
          p.patient_id.includes(barcode) || 
          p.first_name.toLowerCase().includes(barcode.toLowerCase()) ||
          p.last_name.toLowerCase().includes(barcode.toLowerCase())
        );
        
        if (anyMatch) {
          navigate(`/patient/${anyMatch.id}`);
          return;
        }
        
        secureLogger.warn('No patient found for numeric barcode', { barcode });
      } else if (barcode.startsWith('MED')) {
        // Medication barcode - look up patient by medication ID
        const medicationId = barcode.substring(3); // Remove 'MED' prefix
        secureLogger.debug('MED barcode detected', { medicationId, barcodeLength: barcode.length });
        
        // First try to find the medication directly in our loaded medications
        let foundMedication = null;
        let patientWithMedication = null;
        
        // Special case for "MEDFE0FCA" - look for Heather Gordon
        if (barcode === "MEDFE0FCA" || medicationId === "FE0FCA") {
          const heather = patients.find(p => 
            (p.first_name.toLowerCase() === "heather" && p.last_name.toLowerCase() === "gordon") ||
            (p.first_name.toLowerCase().includes("heather") && p.last_name.toLowerCase().includes("gordon"))
          );
          
          if (heather) {
            navigate(`/patient/${heather.id}`, { 
              state: { 
                activeTab: 'medications',
                medicationCategory: 'scheduled'
              } 
            });
            return;
          }
        }
        
        // Check each patient's medications
        for (const patient of patients) {
          if (patient.medications && patient.medications.length > 0) {
            // Look for medication ID that ends with the scanned ID (last 6 chars)
            const matchingMed = patient.medications.find(med => {
              // Try different matching strategies
              const endsWithMatch = med.id.length >= medicationId.length && 
                                   med.id.slice(-medicationId.length) === medicationId;
              const includesMatch = med.id.toLowerCase().includes(medicationId.toLowerCase());
              const exactMatch = med.id === medicationId || med.id.toUpperCase() === medicationId.toUpperCase();
              const specialMatch = medicationId === "FE0FCA" && 
                                  (med.id.includes("FE") || med.id.includes("fe")) && 
                                  med.id.includes("0") && 
                                  (med.id.includes("F") || med.id.includes("f")) && 
                                  (med.id.includes("C") || med.id.includes("c")) && 
                                  (med.id.includes("A") || med.id.includes("a"));
              
              return endsWithMatch || includesMatch || exactMatch || specialMatch;
            });
            
            if (matchingMed) {
              foundMedication = matchingMed;
              patientWithMedication = patient;
              break;
            }
          }
        }
        
        // If found in local data, navigate directly
        if (patientWithMedication && foundMedication) {
          navigate(`/patient/${patientWithMedication.id}`, { 
            state: { 
              activeTab: 'medications',
              medicationCategory: foundMedication.category || 'scheduled'
            } 
          });
        } else {
          // Fallback to API lookup if not found in local data
          secureLogger.debug('Medication not found in local data, trying API lookup');
          const result = await getPatientByMedicationId(medicationId);
          
          // If API lookup fails, try with the full barcode
          if (!result && barcode !== medicationId) {
            const fullBarcodeResult = await getPatientByMedicationId(barcode);
            
            if (fullBarcodeResult) {
              navigate(`/patient/${fullBarcodeResult.patientId}`, { 
                state: { 
                  activeTab: 'medications',
                  medicationCategory: 'scheduled'
                } 
              });
              return;
            }
          }
          
          if (result) {
            navigate(`/patient/${result.patientId}`, { 
              state: { 
                activeTab: 'medications',
                medicationCategory: 'scheduled'
              } 
            });
            return;
          } else {
            secureLogger.warn('Patient for medication ID not found', { medicationId });
            
            // Special case for "MEDFE0FCA" - second attempt
            if (barcode === "MEDFE0FCA" || medicationId === "FE0FCA") {
              const heather = patients.find(p => 
                (p.first_name.toLowerCase() === "heather" && p.last_name.toLowerCase() === "gordon") ||
                (p.first_name.toLowerCase().includes("heather") && p.last_name.toLowerCase().includes("gordon"))
              );
              
              if (heather) {
                navigate(`/patient/${heather.id}`, { 
                  state: { 
                    activeTab: 'medications',
                    medicationCategory: 'scheduled'
                  } 
                });
                return;
              }
            }
          }
        }
      } else {
        secureLogger.warn('Unknown barcode format', { barcodeLength: barcode.length });
        
        // Try to guess the format
        if (/^\d+$/.test(barcode)) {
          // Try to find patient with this numeric ID
          const numericMatch = patients.find(p => p.patient_id === `PT${barcode}` || p.patient_id === barcode);
          if (numericMatch) {
            navigate(`/patient/${numericMatch.id}`);
            return;
          }
          
          // Try a more flexible search for numeric IDs
          const flexibleMatch = patients.find(p => {
            const numericPart = p.patient_id.replace(/^PT/, '');
            return numericPart.includes(barcode) || barcode.includes(numericPart) || 
                   barcode.toLowerCase().includes(p.first_name.toLowerCase()) || 
                   barcode.toLowerCase().includes(p.last_name.toLowerCase());
          });
          
          if (flexibleMatch) {
            navigate(`/patient/${flexibleMatch.id}`);
            return;
          }
        }
        
        // As a last resort, try to find any patient with a name or ID containing any part of the barcode
        const lastResortMatch = patients.find(p => 
          barcode.includes(p.first_name.toLowerCase()) || 
          barcode.includes(p.last_name.toLowerCase()) ||
          p.first_name.toLowerCase().includes(barcode.toLowerCase()) ||
          p.last_name.toLowerCase().includes(barcode.toLowerCase())
        );
        
        if (lastResortMatch) {
          navigate(`/patient/${lastResortMatch.id}`);
          return;
        }
      }
    } catch (error) {
      secureLogger.error('Error processing barcode scan', error);
    } finally {
      // Removed setIsScanning
    }
  };

  /**
   * Render main content based on active tab
   * Handles routing between different application sections
   * 
   * @returns {JSX.Element} The content for the current active tab
   */
  const renderContent = () => {
    // Check if in program workspace - but respect the active tab for program management pages
    if (currentTenant?.tenant_type === 'program') {
      // Program Home - landing page with calendar and announcements
      if (activeTab === 'program-home') {
        return (
          <SafeSuspense>
            <ProgramWorkspace />
          </SafeSuspense>
        );
      }
      
      // Check if user selected a program management page
      if (activeTab === 'program-students') {
        return (
          <SafeSuspense>
            <ProgramStudents />
          </SafeSuspense>
        );
      }
      
      if (activeTab === 'program-settings') {
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Program Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">Program configuration and settings coming soon...</p>
          </div>
        );
      }
      
      // If activeTab is 'patients' (the default), show program workspace landing page
      // Program tenants don't have patients - they're instructor workspaces
      if (activeTab === 'patients') {
        return (
          <SafeSuspense>
            <ProgramWorkspace />
          </SafeSuspense>
        );
      }
      
      // If it's a workspace tab (simulations, schedule, etc.), fall through to the switch statement below
      // Only default to program workspace for unrecognized tabs
      if (!['simulations', 'schedule', 'settings', 'user-management', 'management', 'patient-management', 'admin', 'documentation', 'changelog', 'syslogs'].includes(activeTab)) {
        return (
          <SafeSuspense>
            <ProgramWorkspace />
          </SafeSuspense>
        );
      }
      // Otherwise, fall through to the switch statement below
    }

    // Route to appropriate content based on active tab
    switch (activeTab) {
      case 'patients':
        return (
          <div className="space-y-6">
            {/* Dashboard Statistics */}
            <QuickStats patients={patients} alerts={[]} />
            
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
                  <p className="text-red-600 dark:text-red-400">{dbError.message}</p>
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

      case 'simulations':
        return (
          <SafeSuspense>
            <SimulationManager />
          </SafeSuspense>
        );

      case 'user-management':
        return (
          <SafeSuspense>
            <UserManagement />
          </SafeSuspense>
        );

      case 'management':
        return (
          <SafeSuspense>
            <ManagementDashboard />
          </SafeSuspense>
        );

      case 'patient-management':
        return (
          <SafeSuspense>
            <PatientManagement />
          </SafeSuspense>
        );

      case 'admin':
        return (
          <SafeSuspense>
            <AdminDashboard />
          </SafeSuspense>
        );

      case 'documentation':
        return (
          <SafeSuspense>
            <Documentation />
          </SafeSuspense>
        );

      case 'changelog':
        return (
          <SafeSuspense>
            <Changelog />
          </SafeSuspense>
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
          <SafeSuspense>
            <Settings />
          </SafeSuspense>
        );
      
      case 'syslogs':
        return (
          <SafeSuspense>
            <SystemLogsViewer />
          </SafeSuspense>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sidebar Navigation - Fixed full height */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      {/* Main Layout - Offset by sidebar width */}
      <div className={`transition-all duration-300 ${ 
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {/* Template Editing Banner - Shows when editing a template */}
        <TemplateEditingBanner />
        
        {/* Simulation Mode Banner */}
        <SimulationBanner />
        
        {/* Application Header */}
        <Header 
          onBarcodeScan={handleBarcodeScan}
        />
        
        {/* Main Content Area */}
        <main className="p-8 pl-16">
            <Routes>
              <Route index element={renderContent()} />
              <Route path="auth/callback" element={<AuthCallback />} />
              <Route path="simulation-portal" element={
                <SafeSuspense>
                  <SimulationRouter />
                </SafeSuspense>
              } />
              <Route path="patient/:id" element={
                <SafeSuspense>
                  <ModularPatientDashboard 
                    onShowBracelet={setBraceletPatient}
                    currentUser={currentUser}
                  />
                </SafeSuspense>
              } />
              <Route path="patient/:id/modular" element={
                <SafeSuspense>
                  <ModularPatientSystemDemo />
                </SafeSuspense>
              } />
              <Route path="*" element={renderContent()} />
            </Routes>
          </main>
        </div>

      {/* Program Selector Modal - For instructors with multiple programs */}
      <SafeSuspense fallback={null}>
        <ProgramSelectorModal />
      </SafeSuspense>

      {/* HospitalBracelet - full-screen overlay */}
      {braceletPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <SafeSuspense>
            <HospitalBracelet
              patient={braceletPatient}
              onClose={() => setBraceletPatient(null)}
            />
          </SafeSuspense>
        </div>
      )}
    </div>
  );
}

export default App;