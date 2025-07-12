import React, { useState } from 'react';
import { X, Save, FileText, AlertTriangle, User } from 'lucide-react';
import { PatientNote } from '../../types';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

/**
 * Patient Note Form Component
 * 
 * Form for creating and editing patient notes with proper validation
 * and integration with the patient record system.
 * 
 * Features:
 * - Note type selection (Assessment, Medication, Vital Signs, etc.)
 * - Priority level assignment
 * - Rich text content area
 * - Automatic timestamp and nurse assignment
 * - Form validation and error handling
 * 
 * @param {Object} props - Component props
 * @param {PatientNote | null} props.note - Existing note to edit (null for new note)
 * @param {string} props.patientId - ID of the patient
 * @param {string} props.patientName - Name of the patient for display
 * @param {Function} props.onClose - Callback when form is closed
 * @param {Function} props.onSave - Callback when note is saved
 */
interface PatientNoteFormProps {
  note?: PatientNote | null;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSave: (note: PatientNote) => void;
  onCancel: () => void;
}

export const PatientNoteForm: React.FC<PatientNoteFormProps> = ({
  note,
  patientId,
  patientName,
  onClose,
  onSave,
  onCancel
}) => {
  const { user, profile } = useAuth();
  
  // Form state management
  const [formData, setFormData] = useState({
    type: note?.type || 'General',
    content: note?.content || '', 
    priority: note?.priority || 'Medium'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Update form field value
   * @param {string} field - Field name to update
   * @param {any} value - New value for the field
   */
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  /**
   * Validate form data
   * @returns {boolean} True if form is valid
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Note content is required';
    }

    if (formData.content.trim().length < 10) {
      newErrors.content = 'Note content must be at least 10 characters';
    }

    if (formData.content.trim().length > 2000) {
      newErrors.content = 'Note content must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * @param {React.FormEvent} e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Create note object
      const noteData: PatientNote = {
        id: note?.id || `note-${Date.now()}`, 
        created_at: note?.created_at || format(new Date(), 'yyyy-MM-dd HH:mm:ss'), 
        nurse_id: user?.id || 'unknown-user',
        nurse_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown User',
        type: formData.type as PatientNote['type'],
        content: formData.content.trim(),
        priority: formData.priority as PatientNote['priority']
      };

      await onSave(noteData);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get priority color styling
   * @param {string} priority - Priority level
   * @returns {string} CSS classes for priority styling
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {note ? 'Edit Note' : 'Add New Note'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Patient: {patientName}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Note Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Note Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="General">General</option>
                  <option value="Assessment">Assessment</option>
                  <option value="Medication">Medication</option>
                  <option value="Vital Signs">Vital Signs</option>
                  <option value="Incident">Incident</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => updateField('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Priority Preview */}
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(formData.priority)}`}>
                {formData.priority} Priority
              </span>
            </div>
          </div>

          {/* Note Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => updateField('content', e.target.value)}
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.content ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter detailed note content here..."
              required
            />
            {errors.content && (
              <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.content}</p>
            )}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Minimum 10 characters</span>
              <span>{formData.content.length}/2000 characters</span>
            </div>
          </div>

          {/* Note Metadata */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-600" />
              {note ? 'Edit Note' : 'New Note'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <p>
                <strong>Nurse:</strong> {profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown'}
                </p>
                <p>
                  <strong>Date:</strong> {format(new Date(), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p>
                  <strong>Time:</strong> {format(new Date(), 'HH:mm')}
                </p>
                <p>
                  <strong>Patient:</strong> {patientName}
                </p>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-blue-800 dark:text-blue-300 font-medium text-sm">Documentation Guidelines</p>
            </div>
            <ul className="text-blue-700 dark:text-blue-400 text-xs space-y-1">
              <li>• Be objective and factual in your documentation</li>
              <li>• Include relevant observations, interventions, and patient responses</li>
              <li>• Use appropriate medical terminology and abbreviations</li>
              <li>• Document in chronological order when possible</li>
              <li>• Include patient quotes when relevant (use quotation marks)</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : note ? 'Update Note' : 'Add Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
  )
}