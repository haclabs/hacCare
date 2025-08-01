import React, { useState } from 'react';
import { Header } from './Layout/Header';
import { Sidebar } from './Layout/Sidebar';
import { PatientManagement } from './Patients/PatientManagement';
import { UserManagement } from './Users/UserManagement';
import { Documentation } from './Documentation/Documentation';
import { Changelog } from './Changelog/Changelog';
import { Settings } from './Settings/Settings';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('patients');

  const renderTab = () => {
    switch (activeTab) {
      case 'patients':
        return <PatientManagement />;
      case 'users':
        return <UserManagement />;
      case 'docs':
        return <Documentation />;
      case 'changelog':
        return <Changelog />;
      case 'settings':
        return <Settings />;
      default:
        return <div className="text-red-500">Unknown tab selected</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      <div className="flex flex-col flex-1">
        <Header onAlertsClick={() => {}} />
        <main className="p-4 overflow-y-auto">{renderTab()}</main>
      </div>
    </div>
  );
};
