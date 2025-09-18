import React, { useState } from 'react';
import { Header } from './Layout/Header';
import { Sidebar } from './Layout/Sidebar';
import { PatientManagement } from './Patients/PatientManagement';
import { UserManagement } from './Users/UserManagement';
import { Documentation } from './Documentation/Documentation';
import { Changelog } from './Changelog/Changelog';
import { Settings } from './Settings/Settings';
import SimulationSubTenantManager from './Simulation/SimulationSubTenantManager';
import { useTenant } from '../contexts/TenantContext';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const { currentTenant } = useTenant();

  const renderTab = () => {
    switch (activeTab) {
      case 'patients':
        return <PatientManagement />;
      case 'simulations':
        return <SimulationSubTenantManager currentTenantId={currentTenant?.id || ''} />;
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
