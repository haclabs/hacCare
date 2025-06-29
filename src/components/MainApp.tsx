import React, { useState } from 'react';
import { Header } from './Layout/Header';
import { Sidebar } from './Layout/Sidebar';
import { PatientCard } from './Patients/PatientCard';
import { PatientDetail } from './Patients/PatientDetail';
import { AlertPanel } from './Alerts/AlertPanel';
import { QuickStats } from './Dashboard/QuickStats';
import { UserManagement } from './Users/UserManagement';
import { mockPatients, mockAlerts } from '../data/mockData';
import { Patient, Alert } from '../types';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
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
            <QuickStats patients={mockPatients} alerts={alerts} />
            
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
                  />
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'user-management':
        return <UserManagement />;
      
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
      <Header 
        unreadAlerts={unreadAlerts}
        onAlertsClick={() => setShowAlerts(true)}
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

      <AlertPanel
        alerts={alerts}
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
        onAcknowledge={handleAcknowledgeAlert}
      />
    </div>
  );
};