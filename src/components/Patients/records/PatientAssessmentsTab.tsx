import React, { useState, useEffect } from 'react';
import { fetchPatientAssessments, PatientAssessment } from '../../lib/assessmentService';
import { AssessmentDetail } from './AssessmentDetail';
import { AssessmentForm } from './AssessmentForm';
import { Brain, Heart, Stethoscope, Plus, RefreshCw, Clock, User } from 'lucide-react';
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

  const handleAssessmentSaved = (assessment: PatientAssessment) => {
    setShowAssessmentForm(false);
    loadAssessments();
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'physical': return Stethoscope;
      case 'pain': return Heart;
      case 'neurological': return Brain;
      default: return Stethoscope;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'routine': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Patient Assessments</h3>
        <div className="flex space-x-3">
          <button
            onClick={loadAssessments}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAssessmentForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Assessment</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Loading assessments...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-2">{error}</p>
          <button
            onClick={loadAssessments}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : assessments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Recorded</h3>
          <p className="text-gray-600 mb-6">Start recording patient assessments to track their condition.</p>
          <button
            onClick={() => setShowAssessmentForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record First Assessment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((assessment) => {
            const Icon = getAssessmentIcon(assessment.assessment_type);
            return (
              <div 
                key={assessment.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAssessment(assessment)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      assessment.assessment_type === 'physical' ? 'bg-blue-100' :
                      assessment.assessment_type === 'pain' ? 'bg-red-100' :
                      'bg-purple-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        assessment.assessment_type === 'physical' ? 'text-blue-600' :
                        assessment.assessment_type === 'pain' ? 'text-red-600' :
                        'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)} Assessment
                      </h4>
                      <div className="flex items-center text-xs text-gray-500 space-x-2">
                        <span>{formatDate(assessment.assessment_date)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(assessment.priority_level)}`}>
                    {assessment.priority_level.charAt(0).toUpperCase() + assessment.priority_level.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <User className="h-4 w-4" />
                  <span>{assessment.nurse_name}</span>
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-2">
                  {assessment.assessment_notes.substring(0, 120)}
                  {assessment.assessment_notes.length > 120 ? '...' : ''}
                </p>
                
                {assessment.follow_up_required && (
                  <div className="mt-2 flex items-center space-x-1 text-xs text-amber-600">
                    <Clock className="h-3 w-3" />
                    <span>Follow-up required</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assessment Form Modal */}
      {showAssessmentForm && (
        <AssessmentForm
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowAssessmentForm(false)}
          onSave={handleAssessmentSaved}
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