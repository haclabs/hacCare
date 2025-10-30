/**
 * ===========================================================================
 * SIMULATION SYSTEM V2.0 - MAIN MANAGER COMPONENT
 * ===========================================================================
 * Main interface for simulation management with 3 tabs:
 * - Active: Running simulations
 * - Templates: Simulation templates
 * - History: Completed simulations with debrief
 * ===========================================================================
 */

import React, { useState } from 'react';
import { Beaker, FileText, History, AlertCircle } from 'lucide-react';
import ActiveSimulations from './ActiveSimulations';
import SimulationTemplates from './SimulationTemplates';
import SimulationHistory from './SimulationHistory';

type TabType = 'active' | 'templates' | 'history';

const SimulationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const tabs = [
    { id: 'active' as TabType, label: 'Active', icon: Beaker },
    { id: 'templates' as TabType, label: 'Templates', icon: FileText },
    { id: 'history' as TabType, label: 'History', icon: History },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Beaker className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Simulation Training System
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create templates, run simulations, and review performance
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Admin Access:</strong> Only administrators and super admins can access this simulation management interface.
                Simulation-only users will only see simulations they are assigned to.
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeTab === 'active' && <ActiveSimulations />}
          {activeTab === 'templates' && <SimulationTemplates />}
          {activeTab === 'history' && <SimulationHistory />}
        </div>
      </div>
    </div>
  );
};

export default SimulationManager;
