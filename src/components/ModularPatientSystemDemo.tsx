/**
 * Modular Patient System Demo
 * 
 * This component provides a complete demonstration of the modular patient management
 * system, showcasing all three modules and their integration capabilities.
 * 
 * Use this component to:
 * - Test the modular system functionality
 * - Demonstrate features to stakeholders
 * - Validate integration with existing systems
 */

import React, { useState } from 'react';
import { Play, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import { ModularPatientDashboard } from '../components/ModularPatientDashboard';
import { ModernPatientManagement } from '../components/ModernPatientManagement';
import { Patient } from '../types';

// Demo patient data
const DEMO_PATIENT: Patient = {
  id: 'demo-patient-1',
  patient_id: 'PT-2024-001',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1975-05-15',
  gender: 'Male',
  condition: 'Stable',
  admission_date: '2024-01-15T08:00:00Z',
  blood_type: 'A+',
  room_number: '302',
  bed_number: 'A',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_relationship: 'Spouse',
  emergency_contact_phone: '(555) 123-4567',
  assigned_nurse: 'Sarah Johnson',
  diagnosis: 'Post-operative recovery',
  allergies: ['Penicillin', 'Latex'],
  vitals: [
    {
      id: 'vital-1',
      temperature: 98.6,
      bloodPressure: {
        systolic: 120,
        diastolic: 80
      },
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      recorded_at: new Date().toISOString()
    }
  ],
  medications: [
    {
      id: 'med-1',
      patient_id: 'demo-patient-1',
      name: 'Acetaminophen',
      dosage: '500mg',
      frequency: 'Every 6 hours',
      route: 'Oral',
      status: 'Active',
      prescribed_by: 'Dr. Smith',
      start_date: '2024-01-15',
      next_due: '2024-01-15T14:00:00Z'
    },
    {
      id: 'med-2',
      patient_id: 'demo-patient-1',
      name: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'Every 8 hours as needed',
      route: 'Oral',
      status: 'Active',
      prescribed_by: 'Dr. Smith',
      start_date: '2024-01-15',
      next_due: '2024-01-15T16:00:00Z'
    }
  ],
  notes: [
    {
      id: 'note-1',
      patient_id: 'demo-patient-1',
      content: 'Patient recovering well from surgery. Vital signs stable.',
      nurse_name: 'Sarah Johnson',
      created_at: new Date().toISOString(),
      type: 'General',
      priority: 'Medium'
    }
  ]
};

// Demo user
const DEMO_USER = {
  id: 'user-demo',
  name: 'Sarah Johnson',
  role: 'nurse',
  department: 'surgical'
};

interface DemoProps {
  onClose?: () => void;
}

export const ModularPatientSystemDemo: React.FC<DemoProps> = ({ onClose }) => {
  const [demoMode, setDemoMode] = useState<'overview' | 'dashboard' | 'comparison'>('overview');
  const [patientData, setPatientData] = useState<Patient>(DEMO_PATIENT);
  const [demoStats, setDemoStats] = useState({
    vitalsRecorded: 1,
    medicationsAdministered: 0,
    assessmentsCompleted: 0,
    totalInteractions: 1
  });

  // Handle patient data updates
  const handlePatientUpdate = (updatedData: Partial<Patient>) => {
    const updated = { ...patientData, ...updatedData };
    setPatientData(updated);

    // Update demo stats
    setDemoStats(prev => ({
      ...prev,
      vitalsRecorded: updatedData.vitals ? updatedData.vitals.length : prev.vitalsRecorded,
      totalInteractions: prev.totalInteractions + 1
    }));
  };

  // Render demo overview
  const renderDemoOverview = () => {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Modular Patient System</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the future of healthcare data management with dynamic forms, 
            real-time validation, and clinical safety features.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <h3 className="text-xl font-semibold text-blue-900">Dynamic Forms</h3>
            </div>
            <ul className="space-y-2 text-blue-800">
              <li>• JSON schema-driven form generation</li>
              <li>• Real-time validation and feedback</li>
              <li>• Conditional field logic</li>
              <li>• Healthcare-specific components</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="h-8 w-8 text-green-600" />
              <h3 className="text-xl font-semibold text-green-900">Clinical Safety</h3>
            </div>
            <ul className="space-y-2 text-green-800">
              <li>• Drug interaction checking</li>
              <li>• Allergy verification</li>
              <li>• Clinical value alerts</li>
              <li>• Audit trail logging</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Info className="h-8 w-8 text-purple-600" />
              <h3 className="text-xl font-semibold text-purple-900">Integration</h3>
            </div>
            <ul className="space-y-2 text-purple-800">
              <li>• Backward compatible design</li>
              <li>• Gradual migration support</li>
              <li>• API integration ready</li>
              <li>• Modular architecture</li>
            </ul>
          </div>
        </div>

        {/* Demo Options */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Choose Your Demo Experience</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setDemoMode('dashboard')}
              className="p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Full Dashboard</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Experience the complete modular patient dashboard with all three modules: 
                Vitals, Medications, and Clinical Forms.
              </p>
              <div className="text-sm text-blue-600 font-medium">
                Launch Interactive Demo →
              </div>
            </button>

            <button
              onClick={() => setDemoMode('comparison')}
              className="p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Integration Preview</h3>
              </div>
              <p className="text-gray-600 mb-4">
                See how the modular system integrates with existing interfaces 
                and compare traditional vs. modern approaches.
              </p>
              <div className="text-sm text-purple-600 font-medium">
                View Integration Options →
              </div>
            </button>
          </div>
        </div>

        {/* Demo Stats */}
        <div className="max-w-2xl mx-auto bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Current Demo Session</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{demoStats.vitalsRecorded}</p>
              <p className="text-sm text-gray-600">Vitals Recorded</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{demoStats.medicationsAdministered}</p>
              <p className="text-sm text-gray-600">Meds Administered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{demoStats.assessmentsCompleted}</p>
              <p className="text-sm text-gray-600">Assessments Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{demoStats.totalInteractions}</p>
              <p className="text-sm text-gray-600">Total Actions</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {demoMode === 'overview' && (
        <div className="py-12 px-6">
          {renderDemoOverview()}
        </div>
      )}

      {demoMode === 'dashboard' && (
        <ModularPatientDashboard
          patient={patientData}
          onPatientUpdate={handlePatientUpdate}
          currentUser={DEMO_USER}
          onClose={() => setDemoMode('overview')}
        />
      )}

      {demoMode === 'comparison' && (
        <div className="py-8 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <button
                onClick={() => setDemoMode('overview')}
                className="mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to Overview
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Integration Comparison</h2>
              <p className="text-gray-600 mt-2">
                See how the modular system compares to traditional interfaces
              </p>
            </div>
            
            <ModernPatientManagement
              patient={patientData}
              onPatientUpdate={handlePatientUpdate}
              mode="integrated"
              currentUser={DEMO_USER}
            />
          </div>
        </div>
      )}

      {/* Close button for external usage */}
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors z-50"
        >
          <span className="sr-only">Close demo</span>
          ✕
        </button>
      )}
    </div>
  );
};
