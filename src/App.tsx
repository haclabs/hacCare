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
import { mockPatients, mockAlerts } from './data/mockData';
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
   * Render main content based on active tab
   * Handles routing between different application sections
   * 
   * @returns {JSX.Element} The content for the current active tab
   */
  const renderContent = () => {
    // Show patient detail view if a patient is selected
    if (selectedPatient) {
      return (
        <PatientDetail
          patient={selectedPatient}
          onBack={() => setSelectedPatient(null)}
        />
      );
    }

    // Route to appropriate content based on active tab
    switch (activeTab) {
      case 'patients':
        return (
          <div className="space-y-6">
            {/* Dashboard Statistics */}
            <QuickStats patients={mockPatients} alerts={alerts} />
            
            {/* Patient List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Patients</h2>
                <div className="text-sm text-gray-500">
                  {mockPatients.length} patients assigned
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {mockPatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => setSelectedPatient(patient)}
                    onShowBracelet={() => setBraceletPatient(patient)}
                  />
                ))}
              </div>
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
      />
      
      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
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