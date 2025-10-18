import React from 'react';
import { X, Brain, Heart, Stethoscope, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface AssessmentDetailProps {
  assessment: any;
  onClose?: () => void;
}

export const AssessmentDetail: React.FC<AssessmentDetailProps> = ({ assessment, onClose }) => {
  if (!assessment) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessment Selected</h3>
        <p className="text-gray-600">Please select an assessment to view details.</p>
      </div>
    );
  }
  
  // Get icon based on assessment type
  const getAssessmentIcon = () => {
    switch (assessment.assessment_type) {
      case 'physical': return Stethoscope;
      case 'pain': return Heart;
      case 'neurological': return Brain;
      default: return Stethoscope;
    }
  };

  // Get color based on assessment type
  const getAssessmentColor = () => {
    switch (assessment.assessment_type) {
      case 'physical': return 'blue';
      case 'pain': return 'red';
      case 'neurological': return 'purple';
      default: return 'blue';
    }
  };

  // Get priority color
  const getPriorityColor = () => {
    switch (assessment.priority_level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'routine': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const Icon = getAssessmentIcon();
  const color = getAssessmentColor();

  // Parse assessment content to extract specific fields
  const parseAssessmentContent = () => {
    const content = assessment.assessment_notes || '';
    const fields: Record<string, string> = {};
    
    // Try to extract fields from the content based on common patterns
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const [_, key, value] = match;
        fields[key.trim()] = value.trim();
      }
    });
    
    return fields;
  };

  const assessmentFields = parseAssessmentContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-${color}-200 bg-${color}-50`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)} Assessment
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {format(new Date(assessment.assessment_date), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Assessment Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Assessed By</p>
                <p className="text-sm text-gray-600">{assessment.nurse_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Assessment Date</p>
                <p className="text-sm text-gray-600">{format(new Date(assessment.assessment_date), 'MMMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Priority Level */}
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor()}`}>
              {assessment.priority_level.charAt(0).toUpperCase() + assessment.priority_level.slice(1)} Priority
            </span>
            
            {assessment.follow_up_required && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium border border-yellow-200">
                Follow-up Required
              </span>
            )}
          </div>

          {/* Type-specific Assessment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Assessment Details</h3>
            
            {assessment.assessment_type === 'physical' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assessmentFields['General Appearance'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">General Appearance</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['General Appearance']}</p>
                  </div>
                )}
                
                {assessmentFields['Level of Consciousness'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Level of Consciousness</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Level of Consciousness']}</p>
                  </div>
                )}
                
                {assessmentFields['Respiratory'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Respiratory Assessment</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Respiratory']}</p>
                  </div>
                )}
                
                {assessmentFields['Cardiovascular'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Cardiovascular Assessment</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Cardiovascular']}</p>
                  </div>
                )}
              </div>
            )}
            
            {assessment.assessment_type === 'pain' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assessmentFields['Pain Scale'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Pain Scale</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Pain Scale']}</p>
                  </div>
                )}
                
                {assessmentFields['Pain Location'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Pain Location</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Pain Location']}</p>
                  </div>
                )}
                
                {assessmentFields['Pain Quality'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Pain Quality</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Pain Quality']}</p>
                  </div>
                )}
                
                {assessmentFields['Duration'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Duration</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Duration']}</p>
                  </div>
                )}
              </div>
            )}
            
            {assessment.assessment_type === 'neurological' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assessmentFields['Glasgow Coma Scale'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Glasgow Coma Scale</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Glasgow Coma Scale']}</p>
                  </div>
                )}
                
                {assessmentFields['Pupil Response'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Pupil Response</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Pupil Response']}</p>
                  </div>
                )}
                
                {assessmentFields['Motor Function'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Motor Function</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Motor Function']}</p>
                  </div>
                )}
                
                {assessmentFields['Cognitive Function'] && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Cognitive Function</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{assessmentFields['Cognitive Function']}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assessment Notes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Assessment Notes</h3>
            <div className="mt-3 bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">{assessment.assessment_notes}</p>
            </div>
          </div>

          {/* Recommendations */}
          {assessment.recommendations && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Recommendations</h3>
              <div className="mt-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 whitespace-pre-line">{assessment.recommendations}</p>
              </div>
            </div>
          )}

          {/* Follow-up Requirements */}
          {assessment.follow_up_required && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-medium text-yellow-900">Follow-up Required</h3>
              </div>
              <p className="text-yellow-800">
                This assessment requires follow-up. Please schedule a follow-up assessment according to unit protocol.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose || (() => {})}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};