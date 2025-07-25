/**
 * Modern Patient Management Integration
 * 
 * This component provides a modern alternative to the existing PatientDetail tabs,
 * utilizing the new modular patient management system. It can be used as:
 * 1. A complete replacement for PatientDetail
 * 2. An additional tab within the existing system
 * 3. A standalone patient management interface
 */

import React, { useState, useEffect } from 'react';
import { Activity, Pill, FileText, Settings, Grid3X3, ChevronRight } from 'lucide-react';
import { ModularPatientDashboard } from './ModularPatientDashboard';
import { Patient } from '../types';

interface ModernPatientManagementProps {
  patient: Patient;
  onPatientUpdate: (patientData: Partial<Patient>) => void;
  mode?: 'standalone' | 'integrated' | 'tab';
  currentUser?: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
  onClose?: () => void;
}

export const ModernPatientManagement: React.FC<ModernPatientManagementProps> = ({
  patient,
  onPatientUpdate,
  mode = 'standalone',
  currentUser,
  onClose
}) => {
  const [isModularView, setIsModularView] = useState(false);
  const [patientData, setPatientData] = useState<Patient>(patient);

  // Update patient data when prop changes
  useEffect(() => {
    setPatientData(patient);
  }, [patient]);

  // Handle patient data updates from modular system
  const handleModularPatientUpdate = (updatedData: Partial<Patient>) => {
    const updated = { ...patientData, ...updatedData };
    setPatientData(updated);
    onPatientUpdate(updatedData);
  };

  // Render comparison view showing traditional vs modular approach
  const renderComparisonView = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Patient Management Options</h3>
              <p className="text-gray-600 mt-1">
                Choose between the traditional interface or the new modular system
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Settings className="h-4 w-4" />
              <span>Interface Options</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traditional Interface Option */}
            <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Grid3X3 className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Traditional Interface</h4>
                  <p className="text-sm text-gray-600">Standard patient detail tabs</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  Fixed form layouts
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  Traditional tab navigation
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  Established workflow
                </div>
              </div>

              <button
                onClick={() => setIsModularView(false)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  !isModularView
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Use Traditional Interface
              </button>
            </div>

            {/* Modular Interface Option */}
            <div className="border border-blue-200 rounded-lg p-6 hover:border-blue-300 transition-colors bg-blue-50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Modular System</h4>
                  <p className="text-sm text-blue-700">Dynamic forms with JSON schemas</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Dynamic form generation
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  JSON schema-driven
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Real-time validation
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Clinical safety checks
                </div>
              </div>

              <button
                onClick={() => setIsModularView(true)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isModularView
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                Use Modular System
                <ChevronRight className="h-4 w-4 inline ml-2" />
              </button>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Feature Comparison</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600">Feature</th>
                    <th className="text-center py-2 text-gray-600">Traditional</th>
                    <th className="text-center py-2 text-blue-600">Modular</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 text-gray-900">Dynamic Forms</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2 text-blue-600">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-900">JSON Schema Validation</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2 text-blue-600">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-900">Clinical Safety Checks</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2 text-blue-600">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-900">Real-time Validation</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2 text-blue-600">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-900">Customizable Fields</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2 text-blue-600">✅</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-900">Backward Compatibility</td>
                    <td className="text-center py-2 text-gray-600">✅</td>
                    <td className="text-center py-2 text-blue-600">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If modular view is selected, render the full modular dashboard
  if (isModularView) {
    return (
      <ModularPatientDashboard
        patient={patientData}
        onPatientUpdate={handleModularPatientUpdate}
        onClose={() => {
          if (mode === 'standalone' && onClose) {
            onClose();
          } else {
            setIsModularView(false);
          }
        }}
        currentUser={currentUser}
      />
    );
  }

  // Render comparison/selection view for integrated mode
  if (mode === 'integrated') {
    return renderComparisonView();
  }

  // For tab mode, render a preview of modular capabilities
  if (mode === 'tab') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Modern Patient Management</h3>
              <p className="text-blue-700">Experience the new modular system with dynamic forms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Dynamic Vitals</h4>
              </div>
              <p className="text-sm text-gray-600">JSON schema-driven vital signs with real-time validation</p>
            </div>

            <div className="bg-white border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Pill className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-gray-900">Smart MAR</h4>
              </div>
              <p className="text-sm text-gray-600">Medication administration with safety checks and reconciliation</p>
            </div>

            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-gray-900">Dynamic Forms</h4>
              </div>
              <p className="text-sm text-gray-600">Clinical assessments with conditional logic and validation</p>
            </div>
          </div>

          <button
            onClick={() => setIsModularView(true)}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            Launch Modular System
            <ChevronRight className="h-5 w-5 ml-2" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Vitals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {patientData.vitals?.length || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Medications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {patientData.medications?.length || 0}
                </p>
              </div>
              <Pill className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Patient Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {patientData.condition}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default standalone mode - render comparison view
  return renderComparisonView();
};
