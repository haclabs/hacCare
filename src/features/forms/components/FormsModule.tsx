/**
 * Modular Forms Module
 * 
 * This module provides a self-contained clinical forms system with:
 * - Dynamic form generation for various assessments
 * - Nursing assessments and admission forms
 * - Real-time validation and clinical alerts
 * - Integration with patient data and care plans
 */

import React, { useState, useEffect } from 'react';
import { FileText, Clipboard, Stethoscope, User, Save } from 'lucide-react';
import { DynamicForm } from '../../../components/forms/DynamicForm';
import { schemaEngine } from '../../../lib/infrastructure/schemaEngine';
import { nursingAssessmentSchema, admissionAssessmentSchema, bowelAssessmentSchema } from '../../../schemas/formsSchemas';
import { Patient } from '../../../types';
import { FormData, ValidationResult, FormGenerationContext } from '../../types/schema';

interface FormsModuleProps {
  patient: Patient;
  onAssessmentSave: (assessment: any) => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

type FormsView = 'nursing-assessment' | 'admission-assessment' | 'bowel-assessment' | 'custom-forms' | 'history';

export const FormsModule: React.FC<FormsModuleProps> = ({
  patient,
  onAssessmentSave,
  currentUser
}) => {
  const [activeView, setActiveView] = useState<FormsView>('nursing-assessment');
  const [isLoading, setIsLoading] = useState(false);
  const [savedForms, setSavedForms] = useState<any[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState<any[]>([]);
  const [schemasRegistered, setSchemasRegistered] = useState(false);

  // Register schemas immediately on component mount
  useEffect(() => {
    const registerSchemas = () => {
      try {
        schemaEngine.registerSchema(nursingAssessmentSchema);
        schemaEngine.registerSchema(admissionAssessmentSchema);
        schemaEngine.registerSchema(bowelAssessmentSchema);
        setSchemasRegistered(true);
        console.log('✅ Forms schemas registered successfully');
      } catch (error) {
        console.error('❌ Error registering schemas:', error);
        setSchemasRegistered(false);
      }
    };

    registerSchemas();
  }, []);

  // Generate form context with patient and clinical data
  const generateFormContext = (): FormGenerationContext => {
    return {
      patient: {
        id: patient.id,
        age: calculateAge(patient.date_of_birth),
        gender: patient.gender,
        allergies: patient.allergies,
        currentMedications: patient.medications?.map(m => m.name) || [],
        condition: patient.condition
      },
      user: currentUser ? {
        id: currentUser.id,
        role: currentUser.role,
        department: 'nursing',
        permissions: ['assessment_create', 'assessment_edit', 'assessment_view']
      } : undefined,
      clinical: {
        currentVitals: patient.vitals[0] || null,
        recentAssessments: completedAssessments,
        activeMedications: patient.medications || []
      },
      form: {
        mode: 'create',
        autoSave: true
      }
    };
  };

  // Handle assessment form submission
  const handleAssessmentSubmission = async (data: FormData, validation: ValidationResult) => {
    if (!validation.valid) {
      console.error('Form validation failed:', validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      const assessment = {
        id: `assessment-${Date.now()}`,
        patientId: patient.id,
        type: activeView,
        data,
        submittedBy: currentUser?.name || '',
        submittedAt: new Date().toISOString(),
        validation
      };

      // Save assessment
      onAssessmentSave(assessment);
      setCompletedAssessments(prev => [assessment, ...prev]);

      console.log('Assessment saved successfully');
    } catch (error) {
      console.error('Error saving assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form auto-save
  const handleFormAutoSave = (data: FormData) => {
    const draftAssessment = {
      id: `draft-${activeView}-${Date.now()}`,
      patientId: patient.id,
      type: activeView,
      data,
      isDraft: true,
      lastSaved: new Date().toISOString()
    };

    setSavedForms(prev => {
      const filtered = prev.filter(form => 
        !(form.type === activeView && form.isDraft)
      );
      return [draftAssessment, ...filtered];
    });
  };

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Get available form types
  const getFormTypes = () => [
    {
      id: 'nursing-assessment',
      title: 'Nursing Assessment',
      description: 'Comprehensive nursing assessment with multiple categories',
      icon: Stethoscope,
      schemaId: 'nursing-assessment-v1'
    },
    {
      id: 'admission-assessment',
      title: 'Admission Assessment',
      description: 'Initial patient assessment upon hospital admission',
      icon: User,
      schemaId: 'admission-assessment-v1'
    },
    {
      id: 'bowel-assessment',
      title: 'Bowel Record',
      description: 'Bowel movement assessment and continence tracking',
      icon: FileText,
      schemaId: 'bowel-assessment-v1'
    }
  ];

  // Render form type selector
  const renderFormTypeSelector = () => {
    const formTypes = getFormTypes();

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {formTypes.map((formType) => {
          const Icon = formType.icon;
          const isActive = activeView === formType.id;

          return (
            <button
              key={formType.id}
              onClick={() => setActiveView(formType.id as FormsView)}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <Icon className={`h-8 w-8 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <h3 className={`text-lg font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                    {formType.title}
                  </h3>
                  <p className={`text-sm mt-1 ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                    {formType.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // Render assessment history
  const renderAssessmentHistory = () => {
    if (completedAssessments.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Completed</h3>
          <p className="text-gray-600">Complete your first assessment using the forms above.</p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Assessment History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {completedAssessments.map((assessment) => (
            <div key={assessment.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {assessment.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </h4>
                  <p className="text-gray-600 mt-1">
                    Completed by {assessment.submittedBy}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(assessment.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    View
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render saved drafts
  const renderSavedDrafts = () => {
    const drafts = savedForms.filter(form => form.isDraft);
    if (drafts.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Save className="h-5 w-5 text-yellow-600" />
          <h3 className="text-medium font-medium text-yellow-800">Saved Drafts</h3>
        </div>
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">
                {draft.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} 
                - Saved {new Date(draft.lastSaved).toLocaleString()}
              </span>
              <button 
                onClick={() => {
                  setActiveView(draft.type);
                  // Load draft data into form
                }}
                className="text-sm text-yellow-600 hover:text-yellow-800"
              >
                Continue
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinical Assessment Forms</h2>
          <p className="text-gray-600">Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('nursing-assessment')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView.includes('assessment')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clipboard className="h-4 w-4 inline mr-2" />
            Assessments
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            History
          </button>
        </div>
      </div>

      {/* Saved Drafts */}
      {renderSavedDrafts()}

      {/* Current View Content */}
      {activeView === 'history' ? (
        renderAssessmentHistory()
      ) : (
        <div className="space-y-6">
          {renderFormTypeSelector()}
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {activeView === 'nursing-assessment' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Comprehensive Nursing Assessment</h3>
                {schemasRegistered ? (
                  <DynamicForm
                    schemaId="nursing-assessment-v1"
                    initialData={{
                      patientId: patient.patient_id,
                      nurseName: currentUser?.name || '',
                      assessmentDate: new Date().toISOString().slice(0, 16)
                    }}
                    context={generateFormContext()}
                    onSubmit={handleAssessmentSubmission}
                    onChange={handleFormAutoSave}
                    autoSave={true}
                    autoSaveInterval={60000} // Auto-save every minute
                    className="max-w-none"
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading assessment form...</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeView === 'admission-assessment' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Patient Admission Assessment</h3>
                {schemasRegistered ? (
                  <DynamicForm
                    schemaId="admission-assessment-v1"
                    initialData={{
                      patientId: patient.patient_id,
                      admissionDate: new Date().toISOString().slice(0, 16)
                    }}
                    context={generateFormContext()}
                    onSubmit={handleAssessmentSubmission}
                    onChange={handleFormAutoSave}
                    autoSave={true}
                    autoSaveInterval={60000}
                    className="max-w-none"
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading assessment form...</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeView === 'bowel-assessment' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Bowel Movement Record</h3>
                {schemasRegistered ? (
                  <DynamicForm
                    schemaId="bowel-assessment-v1"
                    initialData={{
                      patientId: patient.patient_id,
                      nurseName: currentUser?.name || '',
                      recordedAt: new Date().toISOString().slice(0, 16)
                    }}
                    context={generateFormContext()}
                    onSubmit={handleAssessmentSubmission}
                    onChange={handleFormAutoSave}
                    autoSave={true}
                    autoSaveInterval={60000}
                    className="max-w-none"
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading bowel record form...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-900">Saving assessment...</span>
          </div>
        </div>
      )}
    </div>
  );
};
