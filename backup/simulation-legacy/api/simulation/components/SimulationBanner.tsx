/**
 * ===========================================================================
 * SIMULATION BANNER
 * ===========================================================================
 * Red banner displayed at the top when user is in simulation mode
 * ===========================================================================
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';

const SimulationBanner: React.FC = () => {
  const { currentTenant } = useTenant();

  // Only show banner if current tenant name indicates it's a simulation
  // (simulation tenants have names like "SIM-templatename-timestamp")
  if (!currentTenant || !currentTenant.name.startsWith('SIM-')) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 shadow-lg print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-wide">
              Simulation Mode
            </span>
          </div>
          <div className="hidden md:block text-sm">
            You are currently in a training simulation environment
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            Simulation: <span className="font-bold">{currentTenant.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationBanner;
