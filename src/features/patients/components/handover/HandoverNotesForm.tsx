/**
 * Handover Notes Form Component
 * 
 * A comprehensive form for creating SBAR (Situation, Background, Assessment, Recommendations) 
 * handover notes following healthcare communication standards.
 */

import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Clock, 
  AlertTriangle, 
  Save,
  MessageSquare
} from 'lucide-react';
import { CreateHandoverNoteData } from '../../../../services/patient/handoverService';
import { secureLogger } from '../../../../lib/security/secureLogger';

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
  const submittingRef = useRef(false);
  const [formData, setFormData] = useState({
    nursingNotes: '',
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
    
    if (!formData.studentName.trim()) {
      alert('Please enter your student name before submitting.');
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const { studentName, nursingNotes, ...rest } = formData;
      await onSave({
        patient_id: patientId,
        ...rest,
        nursing_notes: nursingNotes || undefined,
        student_name: studentName,
        created_by: currentUser.id,
        created_by_name: currentUser.name,
        created_by_role: currentUser.role
      });
      
      // Reset form
      setFormData({
        nursingNotes: '',
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
      secureLogger.error('Error saving handover note:', error);
      alert('Failed to save handover note. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev => ({ ...prev, shift: getCurrentShift() }));
  }, []);

  if (!isOpen) return null;

  const sbarSections = [
    {
      key: 'situation',
      title: 'Situation',
      placeholder: 'Briefly identify the current situation and purpose of communication. Include patient name, reason for handover, current status...',
      description: 'What is happening right now? State the facts clearly and concisely.'
    },
    {
      key: 'background',
      title: 'Background',
      placeholder: 'Provide relevant context - patient history, current symptoms, recent treatments, medications, test results...',
      description: 'What led to the current situation? Include relevant medical history and context.'
    },
    {
      key: 'assessment',
      title: 'Assessment',
      placeholder: 'Present your professional assessment and clinical judgment of the patient\'s condition and concerns...',
      description: 'What do you think is happening? Share your professional clinical assessment.'
    },
    {
      key: 'recommendations',
      title: 'Recommendations',
      placeholder: 'Propose specific actions, interventions, follow-up care, monitoring requirements, or next steps...',
      description: 'What should be done? Provide clear, actionable recommendations.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-3 rounded-xl bg-blue-50">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">SBAR Handover Notes</h2>
                <p className="text-sm text-gray-500 mt-0.5">Situation · Background · Assessment · Recommendations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Patient Info */}
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{patientName}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{new Date().toLocaleString()}</span>
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{currentUser.name} ({currentUser.role})</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {/* Metadata Controls */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-semibold text-gray-800">Handover Details</h3>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Nursing Notes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-sm font-semibold text-gray-800">Nursing Notes</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">General nursing observations and clinical notes.</p>
            </div>
            <div className="px-5 py-4">
            <textarea
              value={formData.nursingNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, nursingNotes: e.target.value }))}
              placeholder="Document general nursing observations, care provided, patient response..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            </div>
          </div>

          {/* SBAR Sections */}
          <div className="space-y-4">
            {sbarSections.map((section) => (
                <div key={section.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                    <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{section.description}</p>
                  </div>
                  <div className="px-5 py-4">
                  <textarea
                    value={formData[section.key as keyof typeof formData] as string}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      [section.key]: e.target.value 
                    }))}
                    placeholder={section.placeholder}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  </div>
                </div>
            ))}
          </div>

          {/* Student Verification */}
          <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.studentName}
              onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
              className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none"
              placeholder="Enter your full name"
              required
            />
            <p className="text-xs text-gray-500">
              By entering your name, you verify that all information above is correct and you performed this handover.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.studentName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
