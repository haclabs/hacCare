import React, { useState } from 'react';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { PatientCard } from './components/Patients/PatientCard';
import { PatientDetail } from './components/Patients/PatientDetail';
import { HospitalBracelet } from './components/Patients/HospitalBracelet';
import { PatientManagement } from './components/Patients/PatientManagement';
import { AlertPanel } from './components/Alerts/AlertPanel';
import { QuickStats } from './components/Dashboard/QuickStats';
import { UserManagement } from './components/Users/UserManagement';
import { Documentation } from './components/Documentation/Documentation';
import { Changelog } from './components/Changelog/Changelog';
import { usePatients } from './contexts/PatientContext';
import { mockAlerts } from './data/mockData';
import { Patient, Alert } from './types';

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
 * - Alert management and notifications
 * - Role-based content rendering
 * - Hospital bracelet generation
 * 
 * @returns {JSX.Element} The main application component
 */
function App() {
  // Application state management
  const [activeTab, setActiveTab] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [braceletPatient, setBraceletPatient] = useState<Patient | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  // Get patients from context
  const { patients, error: dbError } = usePatients();

  /**
   * Handle alert acknowledgment
   * Marks an alert as acknowledged and updates the alerts list
   * 
   * @param {string} alertId - ID of the alert to acknowledge
   */
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  // Calculate unread alerts count
  const unreadAlerts = alerts.filter(alert => !alert.acknowledged).length;

  /**
   * Handle tab change - clear selected patient when navigating away from patient detail
   * @param {string} tab - The new active tab
   */
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Clear selected patient when navigating to a different tab
    if (tab !== 'patients') {
      setSelectedPatient(null);
    }
  };

  /**
   * Handle patient selection
   * @param {Patient} patient - The selected patient
   */
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab('patients'); // Ensure we're on the patients tab
  };

  /**
   * Handle back navigation from patient detail
   */
  const handleBackFromPatient = () => {
    setSelectedPatient(null);
    // Stay on the patients tab
  };

  /**
   * Render main content based on active tab
   * Handles routing between different application sections
   * 
   * @returns {JSX.Element} The content for the current active tab
   */
  const renderContent = () => {
    // Show patient detail view if a patient is selected and we're on patients tab
    if (selectedPatient && activeTab === 'patients') {
      return (
        <PatientDetail
          patient={selectedPatient}
          onBack={handleBackFromPatient}
        />
      );
    }

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
                <h2 className="text-2xl font-bold text-gray-900">My Patients</h2>
                <div className="text-sm text-gray-500">
                  {patients.length} patients assigned
                </div>
              </div>
              
              {dbError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-red-800 mb-2">Database Connection Error</h3>
                  <p className="text-red-600">{dbError}</p>
                  <p className="text-sm text-red-500 mt-2">Please check your Supabase connection and try again.</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Patients Found</h3>
                  <p className="text-gray-600">No patients are currently assigned to you.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {patients.map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onClick={() => handlePatientSelect(patient)}
                      onShowBracelet={() => setBraceletPatient(patient)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'patient-management':
        return <PatientManagement />;

      case 'user-management':
        return <UserManagement />;

      case 'documentation':
        return <Documentation />;

      case 'changelog':
        return <Changelog />;
      
      case 'schedule':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Management</h2>
            <p className="text-gray-600">Shift scheduling and task management system coming soon...</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">System preferences and configuration options coming soon...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Application Header */}
      <Header 
        unreadAlerts={unreadAlerts}
        onAlertsClick={() => setShowAlerts(true)}
        dbError={dbError}
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
          {renderContent()}
        </main>
      </div>

      {/* Alert Panel Overlay */}
      <AlertPanel
        alerts={alerts}
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
        onAcknowledge={handleAcknowledgeAlert}
      />

      {/* Hospital Bracelet Modal */}
      {braceletPatient && (
        <HospitalBracelet
          patient={braceletPatient}
          onClose={() => setBraceletPatient(null)}
        />
      )}
    </div>
  );
}

export default App;