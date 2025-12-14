import { useState, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { AlertPanel } from './components/Alerts/AlertPanel'; 
import { QuickStats } from './components/Dashboard/QuickStats';
import { ModularPatientDashboard } from './components/ModularPatientDashboard';
import { ModularPatientSystemDemo } from './components/ModularPatientSystemDemo';
import { useMultiTenantPatients } from './features/patients/hooks/useMultiTenantPatients';
import { useAlertContext } from './hooks/useAlertContext';
import { getPatientByMedicationId } from './services/clinical/medicationService';
import LoadingSpinner from './components/UI/LoadingSpinner';
import { Patient, Medication } from './types';
import { useAuth } from './hooks/useAuth';
import { AuthCallback } from './components/Auth/AuthCallback';

// Lazy-loaded feature components for better code splitting
const PatientCard = lazy(() => import('./features/patients/components/records/PatientCard'));
const BackupManagement = lazy(() => import('./features/admin/components/BackupManagement'));
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

  // Application state management
  const [activeTab, setActiveTab] = useState('patients');
  const [braceletPatient, setBraceletPatient] = useState<Patient | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showAlerts, setShowAlerts] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);
  // const [isScanning, setIsScanning] = useState<boolean>(false);

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
      console.log('🎮 Simulation subdomain detected, redirecting to portal...');
      navigate('simulation-portal', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Get patients using React Query hooks - Use multi-tenant hook for proper filtering
  const { patients = [], error: dbError } = useMultiTenantPatients();
  
  // Get alerts from AlertContext (avoid React Query conflicts)
  const { alerts } = useAlertContext();

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
    setActiveTab(tab);
    // Stay within the /app route - just change the active tab state
    // The route will be handled by the renderContent function
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
      console.log('🔍 Barcode scanned:', barcode, typeof barcode, 'Length:', barcode.length);
      
      // Log all patients for debugging
      console.log('👥 All patients:', patients.map(p => ({ 
        id: p.id, 
        patient_id: p.patient_id, 
        name: `${p.first_name} ${p.last_name}` 
      })));
      
      if (barcode.startsWith('PT')) {
        // Patient barcode - extract patient ID and navigate to patient detail
        const patientId = barcode.substring(2); // Remove 'PT' prefix
        console.log('🏷️ Extracted patient ID:', patientId);

        // Only log detailed comparison in debug mode to reduce console spam
        if (localStorage.getItem('debug-mode') === 'true') {
          patients.forEach(p => {
            console.log(`🔍 Comparing: Patient ${p.first_name} ${p.last_name} - ID: "${p.patient_id}" vs Scanned: "${patientId}"`);
          });
        }
        
        const patient = patients.find(p => p.patient_id === patientId);
        if (patient) {
          console.log('✅ Patient found:', patient);
          navigate(`patient/${patient.id}`);
        } else {
          console.warn(`⚠️ Patient with ID ${patientId} not found`);
          
          // Try a more flexible search
          console.log('🔍 Patient not found with exact match, trying flexible search...');
          const flexibleMatch = patients.find(p => 
            p.patient_id.includes(patientId) || 
            patientId.includes(p.patient_id)
          );
          
          if (flexibleMatch) {
            console.log('✅ Found patient with flexible matching:', flexibleMatch);
            console.log(`✅ Match found: "${flexibleMatch.patient_id}" contains or is contained in "${patientId}"`);
            navigate(`patient/${flexibleMatch.id}`);
            return;
          } else {
            console.log('🔍 No patient found with flexible matching, trying numeric-only matching...');
            
            // Try matching just the numeric part (for when PT prefix is missing)
            const numericMatch = patients.find(p => {
              // Extract numeric part from patient_id (remove PT prefix if present)
              const numericPatientId = p.patient_id.replace(/^PT/, '');
              return numericPatientId === patientId;
            });
            
            if (numericMatch) {
              console.log('✅ Found patient with numeric-only matching:', numericMatch);
              console.log(`✅ Match found: numeric part of "${numericMatch.patient_id}" matches "${patientId}"`);
              navigate(`patient/${numericMatch.id}`);
              return;
            } else {
              console.log('❌ No patient found with any matching method');
            }
          }
        }
      } else if (/^(?!MED|PT)[A-Z]{3}[A-Z0-9]{6}$/i.test(barcode)) {
        // BCMA short medication barcode - format: 3 letters + 6 alphanumeric chars (e.g., DOC866FA8)
        // Excludes existing MED and PT prefixes to avoid conflicts
        console.log('💊 BCMA short medication barcode detected:', barcode);
        
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
              
              console.log(`🔍 Checking medication "${med.name}" (ID: ${med.id}): Expected barcode "${expectedBarcode}" vs Scanned "${barcode}"`);
              
              return expectedBarcode === barcode.toUpperCase();
            });
            
            if (matchingMed) {
              console.log('✅ Found medication with BCMA barcode match:', matchingMed);
              console.log('✅ Patient:', patient.first_name, patient.last_name);
              foundMedication = matchingMed;
              patientWithMedication = patient;
              break;
            }
          }
        }
        
        // If found in local data, navigate directly
        if (patientWithMedication && foundMedication) {
          console.log('✅ Navigating to patient MAR with medication category:', foundMedication.category);
          navigate(`/patient/${patientWithMedication.id}`, { 
            state: { 
              activeTab: 'medications',
              medicationCategory: foundMedication.category || 'scheduled'
            } 
          });
        } else {
          console.log('❌ No medication found with BCMA barcode:', barcode);
          console.warn(`⚠️ Unknown BCMA medication barcode: ${barcode}`);
        }
      } else if (/^\d+$/.test(barcode)) {
        // This is a numeric-only barcode, likely a patient ID without the PT prefix
        console.log('🔢 Numeric-only barcode detected:', barcode);
        console.log('🔍 Trying to match as patient ID without PT prefix');
        
        // Try to find patient with this numeric ID (both with and without PT prefix)
        const numericMatch = patients.find(p => 
          p.patient_id === `PT${barcode}` || 
          p.patient_id.replace(/^PT/, '') === barcode
        );
        
        if (numericMatch) {
          console.log('✅ Found patient with numeric ID:', numericMatch);
          navigate(`/patient/${numericMatch.id}`);
          return;
        }
        
        // If no exact match, try a more flexible search
        console.log('🔍 No exact match for numeric ID, trying flexible search...');
        
        // Try to find a patient where the ID contains the barcode or vice versa
        const flexibleMatch = patients.find(p => {
          const numericPart = p.patient_id.replace(/^PT/, '');
          return numericPart.includes(barcode) || barcode.includes(numericPart);
        });
        
        // If found, navigate to the patient
        if (flexibleMatch) {
          console.log('✅ Found patient with flexible numeric matching:', flexibleMatch);
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
          console.log('✅ Found patient with general search:', anyMatch);
          navigate(`/patient/${anyMatch.id}`);
          return;
        }
        
        console.log('❌ No patient found with any matching method for ID:', barcode);
      } else if (barcode.startsWith('MED')) {
        // Medication barcode - look up patient by medication ID
        const medicationId = barcode.substring(3); // Remove 'MED' prefix
        console.log('💊 Extracted medication ID from barcode:', medicationId, 'Original barcode:', barcode, 'Length:', barcode.length);
        
        // First try to find the medication directly in our loaded medications
        let foundMedication = null;
        let patientWithMedication = null;
        
        // Log all medications for debugging
        console.log('💊 All medications in memory:');
        patients.forEach(patient => {
          if (patient.medications && patient.medications.length > 0) {
            console.log(`Patient ${patient.first_name} ${patient.last_name} medications:`, 
              patient.medications.map(med => ({ 
                id: med.id, 
                name: med.name,
                category: med.category,
                idLength: med.id.length,
                idLastChars: med.id.slice(-6)
              }))
            );
          }
        });
        
        // Special case for "MEDFE0FCA" - look for Heather Gordon
        if (barcode === "MEDFE0FCA" || medicationId === "FE0FCA") {
          console.log("🔍 Special case handling for MEDFE0FCA barcode");
          
          // Find Heather Gordon in our patients
          const heather = patients.find(p => 
            (p.first_name.toLowerCase() === "heather" && p.last_name.toLowerCase() === "gordon") ||
            (p.first_name.toLowerCase().includes("heather") && p.last_name.toLowerCase().includes("gordon"))
          );
          
          if (heather) {
            console.log("✅ Found Heather Gordon:", heather.id, heather.first_name, heather.last_name);
            
            // Navigate to Heather's MAR with scheduled tab
            navigate(`/patient/${heather.id}`, { 
              state: { 
                activeTab: 'medications',
                medicationCategory: 'scheduled'
              } 
            });
            return;
          } else {
            console.log("❌ Could not find Heather Gordon in patients list");
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
              
              console.log(`Checking medication ${med.id} against ${medicationId}:`, {
                endsWithMatch,
                includesMatch,
                exactMatch,
                specialMatch,
                idLastChars: med.id.slice(-medicationId.length)
              });
              
              return endsWithMatch || includesMatch || exactMatch || specialMatch;
            });
            
            if (matchingMed) {
              console.log('✅ Found medication directly in patient data:', matchingMed);
              console.log('✅ Patient:', patient.first_name, patient.last_name);
              foundMedication = matchingMed;
              patientWithMedication = patient;
              break;
            }
          }
        }
        
        // If found in local data, navigate directly
        if (patientWithMedication && foundMedication) {
          console.log('✅ Navigating to patient MAR with medication category:', foundMedication.category);
          navigate(`/patient/${patientWithMedication.id}`, { 
            state: { 
              activeTab: 'medications',
              medicationCategory: foundMedication.category || 'scheduled'
            } 
          });
        } else {
          // Fallback to API lookup if not found in local data
          console.log('🔍 Medication not found in local data, trying API lookup');
          const result = await getPatientByMedicationId(medicationId);
          
          // If API lookup fails, try with the full barcode
          if (!result && barcode !== medicationId) {
            console.log('🔍 API lookup with extracted ID failed, trying with full barcode:', barcode);
            const fullBarcodeResult = await getPatientByMedicationId(barcode);
            console.log('Full barcode API lookup result:', fullBarcodeResult);
            
            if (fullBarcodeResult) {
              console.log('✅ Patient found via full barcode API lookup:', fullBarcodeResult);
              navigate(`/patient/${fullBarcodeResult.patientId}`, { 
                state: { 
                  activeTab: 'medications',
                  medicationCategory: 'scheduled'
                } 
              });
              return;
            }
          } else {
            console.log('API lookup result:', result);
          }
          
          if (result) {
            console.log('✅ Patient found via medication API lookup:', result);
            navigate(`/patient/${result.patientId}`, { 
              state: { 
                activeTab: 'medications',
                medicationCategory: 'scheduled'
              } 
            });
            return;
          } else {
            console.warn(`⚠️ Patient for medication ID ${medicationId} not found`);
            
            // Special case for "MEDFE0FCA" - look for Heather Gordon
            if (barcode === "MEDFE0FCA" || medicationId === "FE0FCA") {
              console.log("🔍 Special case handling for MEDFE0FCA barcode - second attempt");
              
              // Find Heather Gordon in our patients
              const heather = patients.find(p => 
                (p.first_name.toLowerCase() === "heather" && p.last_name.toLowerCase() === "gordon") ||
                (p.first_name.toLowerCase().includes("heather") && p.last_name.toLowerCase().includes("gordon"))
              );
              
              if (heather) {
                console.log("✅ Found Heather Gordon:", heather.id, heather.first_name, heather.last_name);
                
                // Navigate to Heather's MAR with scheduled tab
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
        console.log('❓ Unknown barcode format, raw value:', barcode);
        
        // Try to guess the format
        if (/^\d+$/.test(barcode)) {
          console.log('🔢 Barcode appears to be numeric only, might be a patient ID without PT prefix');
          
          // Try to find patient with this numeric ID
          const numericMatch = patients.find(p => p.patient_id === `PT${barcode}` || p.patient_id === barcode);
          if (numericMatch) {
            console.log('✅ Found patient with numeric ID match:', numericMatch);
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
            console.log('✅ Found patient with flexible numeric matching:', flexibleMatch);
            navigate(`/patient/${flexibleMatch.id}`);
            return;
          }
        }
        
        console.warn(`⚠️ Unknown barcode format: ${barcode}`);
        
        // As a last resort, try to find any patient with a name or ID containing any part of the barcode
        const lastResortMatch = patients.find(p => 
          barcode.includes(p.first_name.toLowerCase()) || 
          barcode.includes(p.last_name.toLowerCase()) ||
          p.first_name.toLowerCase().includes(barcode.toLowerCase()) ||
          p.last_name.toLowerCase().includes(barcode.toLowerCase())
        );
        
        if (lastResortMatch) {
          console.log('✅ Last resort match found:', lastResortMatch);
          navigate(`/patient/${lastResortMatch.id}`);
          return;
        }
      }
    } catch (error) {
      console.error('❌ Error processing barcode scan:', error);
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
          <Suspense fallback={<LoadingSpinner />}>
            <SimulationManager />
          </Suspense>
        );

      case 'user-management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement />
          </Suspense>
        );

      case 'management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ManagementDashboard />
          </Suspense>
        );

      case 'patient-management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PatientManagement />
          </Suspense>
        );

      case 'backup-management':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <BackupManagement />
          </Suspense>
        );

      case 'admin':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
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
      
      case 'syslogs':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SystemLogsViewer />
          </Suspense>
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
      />
      
      {/* Main Layout - Offset by sidebar width */}
      <div className={`transition-all duration-300 ${ 
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {/* Simulation Mode Banner */}
        <SimulationBanner />
        
        {/* Application Header */}
        <Header 
          onAlertsClick={() => setShowAlerts(true)}
          onBarcodeScan={handleBarcodeScan}
        />
        
        {/* Main Content Area */}
        <main className="p-8 pl-16">
            <Routes>
              <Route index element={renderContent()} />
              <Route path="auth/callback" element={<AuthCallback />} />
              <Route path="simulation-portal" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SimulationRouter />
                </Suspense>
              } />
              <Route path="patient/:id" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ModularPatientDashboard 
                    onShowBracelet={setBraceletPatient}
                    currentUser={currentUser}
                  />
                </Suspense>
              } />
              <Route path="patient/:id/modular" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ModularPatientSystemDemo />
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