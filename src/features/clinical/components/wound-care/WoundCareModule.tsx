/**
 * Wound Care Module
 * 
 * A comprehensive wound assessment and management system that provides:
 * - Wound assessment forms with detailed documentation
 * - Photo documentation capabilities  
 * - Treatment tracking and care plans
 * - Healing progress monitoring
 * - Integration with patient records
 * 
 * Features:
 * - Structured wound assessment forms
 * - Photo upload and management
 * - Treatment history tracking
 * - Measurement and sizing tools
 * - Care plan recommendations
 * - Progress reporting
 */

import React, { useState, useEffect } from 'react';
import { Camera, Plus, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { WoundAssessment, WoundTreatment, Patient } from '../../../../types';
import { WoundCareService } from '../../../../services/patient/woundCareService';
import { WoundAssessmentForm } from './WoundAssessmentForm';

interface WoundCareModuleProps {
  patient: Patient;
  onPatientUpdate?: (updatedData: Partial<Patient>) => void;
}

type WoundCareView = 'dashboard' | 'new-assessment' | 'edit-assessment' | 'treatments';

export const WoundCareModule: React.FC<WoundCareModuleProps> = ({
  patient,
  onPatientUpdate
}) => {
  const [activeView, setActiveView] = useState<WoundCareView>('dashboard');
  const [assessments, setAssessments] = useState<WoundAssessment[]>([]);
  const [treatments, setTreatments] = useState<WoundTreatment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<WoundAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load wound care data
  useEffect(() => {
    loadWoundCareData();
  }, [patient.id]);

  const loadWoundCareData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [assessmentsData, treatmentsData] = await Promise.all([
        WoundCareService.getAssessmentsByPatient(patient.id),
        WoundCareService.getTreatmentsByPatient(patient.id)
      ]);
      
      setAssessments(assessmentsData);
      setTreatments(treatmentsData);
    } catch (err) {
      console.error('Error loading wound care data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wound care data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentSave = async (assessment: Omit<WoundAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const savedAssessment = await WoundCareService.createAssessment({
        ...assessment,
        patient_id: patient.id
      });
      
      setAssessments(prev => [savedAssessment, ...prev]);
      setActiveView('dashboard');
      
      // Update patient data if callback provided
      if (onPatientUpdate) {
        onPatientUpdate({ 
          wound_assessments: [savedAssessment, ...assessments]
        });
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assessment');
    }
  };

  const handleAssessmentUpdate = async (id: string, updates: Partial<WoundAssessment>) => {
    try {
      const updatedAssessment = await WoundCareService.updateAssessment(id, updates);
      
      setAssessments(prev => 
        prev.map(assessment => 
          assessment.id === id ? updatedAssessment : assessment
        )
      );
      
      setSelectedAssessment(null);
      setActiveView('dashboard');
    } catch (err) {
      console.error('Error updating assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assessment');
    }
  };

  // Navigation buttons
  const navigationButtons = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: TrendingUp,
      description: 'View wound assessments and progress'
    },
    {
      id: 'new-assessment',
      label: 'New Assessment',
      icon: Plus,
      description: 'Create new wound assessment'
    },
    {
      id: 'treatments',
      label: 'Treatments',
      icon: Calendar,
      description: 'View and manage treatments'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading wound care data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Error Loading Data</h3>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
            <button
              onClick={loadWoundCareData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Camera className="h-7 w-7 text-orange-600 mr-3" />
              Wound Care Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive wound assessment and treatment tracking for {patient.first_name} {patient.last_name}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {assessments.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {treatments.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Treatments</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-2">
          {navigationButtons.map((button) => {
            const Icon = button.icon;
            const isActive = activeView === button.id;
            
            return (
              <button
                key={button.id}
                onClick={() => setActiveView(button.id as WoundCareView)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={button.description}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{button.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {activeView === 'dashboard' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Wound Care Dashboard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {patient.first_name} {patient.last_name} - Active Assessments: {assessments.length}
                </p>
              </div>
              <button
                onClick={() => setActiveView('new-assessment')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>
            
            {/* Assessment List */}
            {assessments.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No wound assessments found</p>
                <button
                  onClick={() => setActiveView('new-assessment')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Assessment</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {assessment.wound_location} - {assessment.wound_type}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {assessment.length_cm} x {assessment.width_cm} x {assessment.depth_cm} cm
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {assessment.assessment_notes}
                        </p>
                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                          <span>Assessed: {new Date(assessment.assessment_date).toLocaleDateString()}</span>
                          <span>By: {assessment.assessor_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setActiveView('edit-assessment');
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'new-assessment' && (
          <WoundAssessmentForm
            patient={patient}
            onSave={handleAssessmentSave}
            onCancel={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'edit-assessment' && selectedAssessment && (
          <WoundAssessmentForm
            patient={patient}
            assessment={selectedAssessment}
            onSave={(assessment) => handleAssessmentUpdate(selectedAssessment.id, assessment)}
            onCancel={() => {
              setSelectedAssessment(null);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'treatments' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Treatment History
            </h3>
            {treatments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No treatments recorded yet</p>
                <button
                  onClick={() => setActiveView('new-assessment')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start First Assessment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {treatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {treatment.treatment_type}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(treatment.administered_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {treatment.procedure_notes}
                    </p>
                    {treatment.products_used && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Products: {treatment.products_used}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
