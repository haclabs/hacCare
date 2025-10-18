import React, { useState, useEffect } from 'react';
import { fetchPatientAssessments, PatientAssessment } from '../../../../services/patient/assessmentService';
import { AssessmentDetail } from '../AssessmentDetail';
import { AssessmentForm } from '../forms/AssessmentForm';
import { BowelRecordForm } from '../forms/BowelRecordForm';
import { BowelRecordsList } from '../bowel/BowelRecordsList';
import { Brain, Heart, Stethoscope, Plus, RefreshCw, FileText } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface PatientAssessmentsTabProps {
  patientId: string;
  patientName: string;
}

export const PatientAssessmentsTab: React.FC<PatientAssessmentsTabProps> = ({ 
  patientId,
  patientName
}) => {
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<PatientAssessment | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showBowelForm, setShowBowelForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessments();
  }, [patientId]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatientAssessments(patientId);
      setAssessments(data);
    } catch (err: any) {
      console.error('Error loading assessments:', err);
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentSaved = () => {
    setShowAssessmentForm(false);
    loadAssessments();
  };

  const handleBowelRecordSaved = () => {
    setShowBowelForm(false);
    // No need to reload assessments since bowel records are separate
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'physical': return Stethoscope;
      case 'pain': return Heart;
      case 'neurological': return Brain;
      default: return Stethoscope;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MMM dd, yyyy HH:mm') : 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Patient Assessments</h3>
        <button
          onClick={loadAssessments}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Clinical Assessments Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Assessments</h4>
            </div>
            <button
              onClick={() => setShowAssessmentForm(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-6">
              <RefreshCw className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                onClick={loadAssessments}
                className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-6">
              <Stethoscope className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No assessments recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.slice(0, 5).map((assessment) => {
                const Icon = getAssessmentIcon(assessment.assessment_type);
                return (
                  <div 
                    key={assessment.id} 
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(assessment.assessment_date)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{assessment.nurse_name}</p>
                  </div>
                );
              })}
              {assessments.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{assessments.length - 5} more assessments
                </p>
              )}
            </div>
          )}
        </div>

        {/* Vitals Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Vitals</h4>
            </div>
            <button
              onClick={() => {/* Open vitals form */}}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </button>
          </div>
          
          <div className="text-center py-6">
            <Heart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Vitals handled separately</p>
            <p className="text-xs text-gray-400 mt-1">See Patient Overview for vitals</p>
          </div>
        </div>

        {/* Bowel Record Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Bowel Record</h4>
            </div>
            <button
              onClick={() => setShowBowelForm(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </button>
          </div>

          {/* Bowel Records List */}
          <BowelRecordsList patientId={patientId} />
        </div>
      </div>

      {/* Assessment Form Modal */}
      {showAssessmentForm && (
        <AssessmentForm
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowAssessmentForm(false)}
          onSave={handleAssessmentSaved}
        />
      )}

      {/* Bowel Record Form Modal */}
      {showBowelForm && (
        <BowelRecordForm
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowBowelForm(false)}
          onSave={handleBowelRecordSaved}
        />
      )}

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <AssessmentDetail
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
        />
      )}
    </div>
  );
};