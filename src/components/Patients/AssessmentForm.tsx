import React, { useState } from 'react';
import { X, Save, Stethoscope, Activity, Heart, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { createAssessment, PatientAssessment } from '../../lib/assessmentService';
import { useAuth } from '../../hooks/useAuth';

/**
 * Assessment Form Component
 * 
 * Form for creating patient assessments with proper validation
 * and integration with the patient record system.
 * 
 * Features:
 * - Multiple assessment types (Physical, Pain, Neurological)
 * - Priority level assignment
 * - Rich text content area
 * - Automatic timestamp and nurse assignment
 * - Form validation and error handling
 * - Database integration for saving assessments
 */
interface AssessmentFormProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSave: (assessment: PatientAssessment) => void;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  patientId,
  patientName,
  onClose,
  onSave
}) => {
  const { user, profile } = useAuth();
  
  // Form state management
  const [assessmentType, setAssessmentType] = useState<'physical' | 'pain' | 'neurological'>('physical');
  const [formData, setFormData] = useState({
    general_appearance: '',                // Physical
    level_of_consciousness: '',            // Physical
    respiratory_assessment: '',            // Physical
    cardiovascular_assessment: '',         // Physical
    
    pain_scale: '0',                       // Pain
    pain_location: '',                     // Pain
    pain_quality: '',                      // Pain
    
    glasgow_coma_scale: '',                // Neurological
    motor_function: '',                    // Neurological
    cognitive_function: '',                // Neurological
    
    assessment_notes: '',                  // Common
    recommendations: '',                   // Common
    follow_up_required: false,             // Common
    priority_level: 'routine'              // Common
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Update form field value
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
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (assessmentType === 'physical') {
      if (!formData.general_appearance.trim()) {
        newErrors.general_appearance = 'General appearance assessment is required';
      }
      if (!formData.respiratory_assessment.trim()) {
        newErrors.respiratory_assessment = 'Respiratory assessment is required';
      }
      if (!formData.cardiovascular_assessment.trim()) {
        newErrors.cardiovascular_assessment = 'Cardiovascular assessment is required';
      }
    }

    if (assessmentType === 'pain') {
      if (!formData.pain_location.trim()) {
        newErrors.pain_location = 'Pain location is required';
      }
      if (!formData.pain_quality.trim()) {
        newErrors.pain_quality = 'Pain quality description is required';
      }
    }

    if (assessmentType === 'neurological') {
      if (!formData.motor_function.trim()) {
        newErrors.motor_function = 'Motor function assessment is required';
      }
      if (!formData.cognitive_function.trim()) {
        newErrors.cognitive_function = 'Cognitive function assessment is required';
      }
    }

    if (!formData.assessment_notes.trim()) {
      newErrors.assessment_notes = 'Assessment notes are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user || !profile) {
      alert('User information not available. Please try logging in again.');
      return;
    }

    setLoading(true);
    
    try {
      // Create assessment object
      const assessmentData: PatientAssessment = {
        patient_id: patientId,
        nurse_id: user.id,
        nurse_name: `${profile.first_name} ${profile.last_name}`,
        assessment_type: assessmentType,
        assessment_date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        ...formData
      };

      console.log('Submitting assessment:', assessmentData);
      
      // Save to database
      const savedAssessment = await createAssessment(assessmentData);
      
      console.log('Assessment saved successfully:', savedAssessment);
      
      // Call the onSave callback
      onSave(savedAssessment);
      
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      alert(`Failed to save assessment: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render assessment type selector
   */
  const renderAssessmentTypeSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <button
        type="button"
        onClick={() => setAssessmentType('physical')}
        className={`p-4 border rounded-lg text-left transition-colors ${
          assessmentType === 'physical'
            ? 'border-blue-500 bg-blue-50 text-blue-900'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Stethoscope className="h-6 w-6 text-blue-600" />
          <h4 className="font-medium">Physical Assessment</h4>
        </div>
        <p className="text-sm text-gray-600">Head-to-toe physical examination</p>
      </button>

      <button
        type="button"
        onClick={() => setAssessmentType('pain')}
        className={`p-4 border rounded-lg text-left transition-colors ${
          assessmentType === 'pain'
            ? 'border-red-500 bg-red-50 text-red-900'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Heart className="h-6 w-6 text-red-600" />
          <h4 className="font-medium">Pain Assessment</h4>
        </div>
        <p className="text-sm text-gray-600">Pain scale and management evaluation</p>
      </button>

      <button
        type="button"
        onClick={() => setAssessmentType('neurological')}
        className={`p-4 border rounded-lg text-left transition-colors ${
          assessmentType === 'neurological'
            ? 'border-purple-500 bg-purple-50 text-purple-900'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h4 className="font-medium">Neurological Assessment</h4>
        </div>
        <p className="text-sm text-gray-600">Cognitive and neurological function</p>
      </button>
    </div>
  );

  /**
   * Render physical assessment fields
   */
  const renderPhysicalAssessment = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            General Appearance *
          </label>
          <textarea
            value={formData.general_appearance}
            onChange={(e) => updateField('general_appearance', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.general_appearance ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe patient's overall appearance, posture, hygiene..."
          />
          {errors.general_appearance && (
            <p className="text-red-600 text-xs mt-1">{errors.general_appearance}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level of Consciousness
          </label>
          <select
            value={formData.level_of_consciousness}
            onChange={(e) => updateField('level_of_consciousness', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Alert and oriented x3">Alert and oriented x3</option>
            <option value="Alert and oriented x2">Alert and oriented x2</option>
            <option value="Alert and oriented x1">Alert and oriented x1</option>
            <option value="Lethargic">Lethargic</option>
            <option value="Obtunded">Obtunded</option>
            <option value="Stuporous">Stuporous</option>
            <option value="Comatose">Comatose</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Respiratory Assessment *
          </label>
          <textarea
            value={formData.respiratory_assessment}
            onChange={(e) => updateField('respiratory_assessment', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.respiratory_assessment ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Breathing pattern, lung sounds, oxygen saturation..."
          />
          {errors.respiratory_assessment && (
            <p className="text-red-600 text-xs mt-1">{errors.respiratory_assessment}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cardiovascular Assessment *
          </label>
          <textarea
            value={formData.cardiovascular_assessment}
            onChange={(e) => updateField('cardiovascular_assessment', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.cardiovascular_assessment ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Heart sounds, rhythm, peripheral pulses, edema..."
          />
          {errors.cardiovascular_assessment && (
            <p className="text-red-600 text-xs mt-1">{errors.cardiovascular_assessment}</p>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Render pain assessment fields
   */
  const renderPainAssessment = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pain Scale (0-10)
          </label>
          <select
            value={formData.pain_scale}
            onChange={(e) => updateField('pain_scale', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i.toString()}>{i} - {i === 0 ? 'No pain' : i <= 3 ? 'Mild' : i <= 6 ? 'Moderate' : 'Severe'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pain Location *
          </label>
          <input
            type="text"
            value={formData.pain_location}
            onChange={(e) => updateField('pain_location', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.pain_location ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Lower back, Right shoulder"
          />
          {errors.pain_location && (
            <p className="text-red-600 text-xs mt-1">{errors.pain_location}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pain Duration
          </label>
          <input
            type="text"
            value={formData.pain_duration}
            onChange={(e) => updateField('pain_duration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 2 hours, 3 days, chronic"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pain Quality/Description *
        </label>
        <textarea
          value={formData.pain_quality}
          onChange={(e) => updateField('pain_quality', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.pain_quality ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Describe the pain: sharp, dull, throbbing, burning, cramping..."
        />
        {errors.pain_quality && (
          <p className="text-red-600 text-xs mt-1">{errors.pain_quality}</p>
        )}
      </div>
    </div>
  );

  /**
   * Render neurological assessment fields
   */
  const renderNeurologicalAssessment = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Glasgow Coma Scale
          </label>
          <select
            value={formData.glasgow_coma_scale}
            onChange={(e) => updateField('glasgow_coma_scale', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 3} value={(i + 3).toString()}>{i + 3}/15</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pupil Response
          </label>
          <select
            value={formData.pupil_response}
            onChange={(e) => updateField('pupil_response', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PERRL">PERRL (Pupils Equal, Round, Reactive to Light)</option>
            <option value="Unequal pupils">Unequal pupils</option>
            <option value="Non-reactive">Non-reactive</option>
            <option value="Sluggish response">Sluggish response</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motor Function *
          </label>
          <textarea
            value={formData.motor_function}
            onChange={(e) => updateField('motor_function', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.motor_function ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Muscle strength, coordination, movement..."
          />
          {errors.motor_function && (
            <p className="text-red-600 text-xs mt-1">{errors.motor_function}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cognitive Function *
          </label>
          <textarea
            value={formData.cognitive_function}
            onChange={(e) => updateField('cognitive_function', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.cognitive_function ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Memory, attention, orientation, speech..."
          />
          {errors.cognitive_function && (
            <p className="text-red-600 text-xs mt-1">{errors.cognitive_function}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Patient Assessment</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Patient: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Assessment Type Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Select Assessment Type</h3>
            {renderAssessmentTypeSelector()}
          </div>

          {/* Assessment Fields */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {assessmentType === 'physical' && 'Physical Assessment'}
              {assessmentType === 'pain' && 'Pain Assessment'}
              {assessmentType === 'neurological' && 'Neurological Assessment'}
            </h3>
            
            {assessmentType === 'physical' && renderPhysicalAssessment()}
            {assessmentType === 'pain' && renderPainAssessment()}
            {assessmentType === 'neurological' && renderNeurologicalAssessment()}
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assessment Notes *
              </label>
              <textarea
                value={formData.assessment_notes}
                onChange={(e) => updateField('assessment_notes', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.assessment_notes ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Additional observations, concerns, or notes..."
              />
              {errors.assessment_notes && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.assessment_notes}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recommendations
              </label>
              <textarea
                value={formData.recommendations}
                onChange={(e) => updateField('recommendations', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Care recommendations, follow-up actions..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority Level
                </label>
                <select
                  value={formData.priority_level}
                  onChange={(e) => updateField('priority_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  checked={formData.follow_up_required}
                  onChange={(e) => updateField('follow_up_required', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="follow_up_required" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Follow-up assessment required
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
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
              <span>{loading ? 'Saving...' : 'Save Assessment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};