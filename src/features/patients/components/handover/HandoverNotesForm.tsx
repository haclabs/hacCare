/**
 * Handover Notes Form Component
 * 
 * A comprehensive form for creating SBAR (Situation, Background, Assessment, Recommendations) 
 * handover notes following healthcare communication standards.
 */

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Save,
  Info,
  Activity,
  Target,
  MessageSquare
} from 'lucide-react';
import { CreateHandoverNoteData } from '../../../../services/patient/handoverService';

interface HandoverNotesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: CreateHandoverNoteData) => Promise<void>;
  patientId: string;
  patientName: string;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export const HandoverNotesForm: React.FC<HandoverNotesFormProps> = ({
  isOpen,
  onClose,
  onSave,
  patientId,
  patientName,
  currentUser
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    situation: '',
    background: '',
    assessment: '',
    recommendations: '',
    shift: 'day' as 'day' | 'evening' | 'night',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    studentName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.situation.trim() || !formData.background.trim() || 
        !formData.assessment.trim() || !formData.recommendations.trim() || 
        !formData.studentName.trim()) {
      alert('Please fill in all SBAR sections and student name before submitting.');
      return;
    }

    setLoading(true);
    try {
      const { studentName, ...rest } = formData;
      await onSave({
        patient_id: patientId,
        ...rest,
        student_name: studentName,
        created_by: currentUser.id,
        created_by_name: currentUser.name,
        created_by_role: currentUser.role
      });
      
      // Reset form
      setFormData({
        situation: '',
        background: '',
        assessment: '',
        recommendations: '',
        shift: 'day',
        priority: 'medium',
        studentName: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving handover note:', error);
      alert('Failed to save handover note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 15) return 'day';
    if (hour >= 15 && hour < 23) return 'evening';
    return 'night';
  };

  // Set default shift on component mount
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, shift: getCurrentShift() }));
  }, []);

  if (!isOpen) return null;

  const sbarSections = [
    {
      key: 'situation',
      title: 'Situation',
      icon: Info,
      placeholder: 'Briefly identify the current situation and purpose of communication. Include patient name, reason for handover, current status...',
      description: 'What is happening right now? State the facts clearly and concisely.',
      color: 'blue'
    },
    {
      key: 'background',
      title: 'Background',
      icon: FileText,
      placeholder: 'Provide relevant context - patient history, current symptoms, recent treatments, medications, test results...',
      description: 'What led to the current situation? Include relevant medical history and context.',
      color: 'green'
    },
    {
      key: 'assessment',
      title: 'Assessment',
      icon: Activity,
      placeholder: 'Present your professional assessment and clinical judgment of the patient\'s condition and concerns...',
      description: 'What do you think is happening? Share your professional clinical assessment.',
      color: 'yellow'
    },
    {
      key: 'recommendations',
      title: 'Recommendations',
      icon: Target,
      placeholder: 'Propose specific actions, interventions, follow-up care, monitoring requirements, or next steps...',
      description: 'What should be done? Provide clear, actionable recommendations.',
      color: 'purple'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">SBAR Handover Notes</h2>
                <p className="text-blue-100">Situation • Background • Assessment • Recommendations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Patient Info */}
          <div className="mt-4 p-4 bg-white/10 rounded-lg">
            <div className="flex items-center space-x-4">
              <User className="h-5 w-5 text-blue-200" />
              <span className="font-semibold">Patient: {patientName}</span>
              <Clock className="h-5 w-5 text-blue-200 ml-4" />
              <span>Created: {new Date().toLocaleString()}</span>
              <User className="h-5 w-5 text-blue-200 ml-4" />
              <span>By: {currentUser.name} ({currentUser.role})</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Shift
              </label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="day">Day Shift (7 AM - 3 PM)</option>
                <option value="evening">Evening Shift (3 PM - 11 PM)</option>
                <option value="night">Night Shift (11 PM - 7 AM)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low - Routine handover</option>
                <option value="medium">Medium - Standard priority</option>
                <option value="high">High - Important attention needed</option>
                <option value="urgent">Urgent - Immediate action required</option>
              </select>
            </div>
          </div>

          {/* SBAR Sections */}
          <div className="space-y-6">
            {sbarSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <div key={section.key} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      section.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      section.color === 'green' ? 'bg-green-100 text-green-600' :
                      section.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                  </div>
                  
                  <textarea
                    value={formData[section.key as keyof typeof formData] as string}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      [section.key]: e.target.value 
                    }))}
                    placeholder={section.placeholder}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>
              );
            })}
          </div>

          {/* Student Verification */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-yellow-900 mb-2">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Enter your full name"
              required
            />
            <p className="text-xs text-yellow-700 mt-2">
              By entering your name, you verify that all information above is correct and you performed this handover.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Handover Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
