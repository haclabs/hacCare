/**
 * Program Context Banner
 * Shows when instructor is working in their program tenant workspace
 * Provides context and allows switching to other program tenants
 */

import React, { useState } from 'react';
import { BookOpen, ChevronDown, Check } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export const ProgramContextBanner: React.FC = () => {
  const { currentTenant, programTenants } = useTenant();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Only show for program tenants
  if (!currentTenant || currentTenant.tenant_type !== 'program') {
    return null;
  }

  // Get the current program info
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant.id);

  if (!currentProgram) {
    return null;
  }

  const handleSwitchProgram = (tenantId: string) => {
    // Save preference to localStorage
    localStorage.setItem('current_program_tenant', tenantId);
    // Reload to trigger TenantContext to load the new program tenant
    window.location.reload();
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md relative">
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <span className="font-medium">Program Workspace:</span>
              <span className="ml-2">{currentProgram.program_name}</span>
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
                {currentProgram.program_code}
              </span>
            </div>
          </div>

          {/* Program Switcher Dropdown */}
          {programTenants.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                Switch Program
                <ChevronDown className={`h-4 w-4 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showSwitcher && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSwitcher(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                    <div className="p-2">
                      {programTenants.map((program) => {
                        const isCurrent = program.tenant_id === currentTenant.id;
                        return (
                          <button
                            key={program.tenant_id}
                            onClick={() => {
                              if (!isCurrent) {
                                handleSwitchProgram(program.tenant_id);
                              }
                              setShowSwitcher(false);
                            }}
                            disabled={isCurrent}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                              isCurrent
                                ? 'bg-blue-50 dark:bg-blue-900/20 cursor-default'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-sm ${
                                isCurrent
                                  ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                                  : 'bg-gray-400 dark:bg-gray-600'
                              }`}>
                                {program.program_code.substring(0, 2)}
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {program.program_name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {program.program_code}
                                </div>
                              </div>
                            </div>
                            {isCurrent && (
                              <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramContextBanner;
