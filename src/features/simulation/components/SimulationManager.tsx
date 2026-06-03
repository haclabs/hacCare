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

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Beaker, FileText, History, BookOpen } from 'lucide-react';
import ActiveSimulations from './ActiveSimulations';
import SimulationTemplates from './SimulationTemplates';
import SimulationHistory from './SimulationHistory';
import SimulationGuide from './SimulationGuide';

type TabType = 'active' | 'templates' | 'history' | 'guide';

const SimulationManager: React.FC = () => {
  const location = useLocation();
  // Check if a specific tab was requested via state
  const initialTab = (location.state as any)?.initialTab || 'active';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Update tab when location state changes
  useEffect(() => {
    if ((location.state as any)?.initialTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab((location.state as any).initialTab);
    }
  }, [location.state]);

  const tabs = [
    { id: 'active' as TabType, label: 'Active', icon: Beaker },
    { id: 'templates' as TabType, label: 'Templates', icon: FileText },
    { id: 'history' as TabType, label: 'Debrief Reports', icon: History },
    { id: 'guide' as TabType, label: 'Instructor Guide', icon: BookOpen, highlight: true },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 p-3 bg-violet-100 rounded-xl">
            <Beaker className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Simulation Training System</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create templates, run simulations, and review performance
            </p>
          </div>
        </div>
      </div>

      {/* Sticky tab navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-0.5 px-4 py-1.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isGuide = tab.id === 'guide';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 text-xs font-medium ${
                  isActive && isGuide
                    ? 'bg-emerald-50 text-emerald-700'
                    : isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          {activeTab === 'active' && <ActiveSimulations />}
          {activeTab === 'templates' && <SimulationTemplates />}
          {activeTab === 'history' && <SimulationHistory />}
          {activeTab === 'guide' && <SimulationGuide />}
        </div>
      </div>
    </div>
  );
};

export default SimulationManager;
