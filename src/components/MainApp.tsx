import React, { useState } from 'react';
import { Header } from './Layout/Header';
import { Sidebar } from './Layout/Sidebar';
import { PatientCard } from './Patients/PatientCard';
import { PatientDetail } from './Patients/PatientDetail';
import { HospitalBracelet } from './Patients/HospitalBracelet';
import { PatientManagement } from './Patients/PatientManagement';
import { UserManagement } from './Users/UserManagement';
import { Documentation } from './Documentation/Documentation';
import { Changelog } from './Changelog/Changelog';
import { Settings } from './Settings/Settings';
import { usePatients } from '../contexts/PatientContext';
import { useAlerts } from '../contexts/AlertContext';
import { Patient } from '../types';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [braceletPatient, setBraceletPatient] = useState<Patient | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  
  // Get patients and alerts from context
  const { patients, error: dbError } = usePatients();
  const { alerts, acknowledgeAlert } = useAlerts();

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const unreadAlerts = alerts.filter(alert => !alert.acknowledged).length;

  const renderContent = () => {
    if (selectedPatient) {
      return (
        <PatientDetail
          patient={selectedPatient}
          onBack={() => setSelectedPatient(null)}
        />
      );
    }

    switch (activeTab) {
      case 'patients':
        return (
          <div className="space-y-6">
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
                      onClick={() => setSelectedPatient(patient)}
                      onShowBracelet={() => setBraceletPatient(patient)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'user-management':
        return <UserManagement />;
      
      case 'patient-management':
        return <PatientManagement />;
      
      case 'documentation':
        return <Documentation />;
      
      case 'changelog':
        return <Changelog />;
      
      case 'settings':
        return <Settings />;
      
      case 'schedule':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Management</h2>
            <p className="text-gray-600">Shift scheduling and task management system coming soon...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        unreadAlerts={unreadAlerts}
        onAlertsClick={() => setShowAlerts(true)}
        dbError={dbError}
      />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>

      {showAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-96 h-full shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h2>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span>×</span>
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {alerts.map(alert => (
                <div key={alert.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{alert.patientName}</p>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
                      {alert.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {alerts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {braceletPatient && (
        <HospitalBracelet
          patient={braceletPatient}
          onClose={() => setBraceletPatient(null)}
        />
      )}
    </div>
  );
};