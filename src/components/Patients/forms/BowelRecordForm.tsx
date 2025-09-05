import React, { useState } from 'react';
import { X, Save, FileText, Clock } from 'lucide-react';
import { createBowelRecord, BowelRecord } from '../../../lib/bowelRecordService';
import { useAuth } from '../../../hooks/useAuth';
import { formatLocalTime } from '../../../utils/time';

/**
 * Bowel Record Form Component
 * 
 * Form for creating bowel movement records with proper validation
 * and integration with the patient record system.
 */
interface BowelRecordFormProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSave: (record: BowelRecord) => void;
}

export const BowelRecordForm: React.FC<BowelRecordFormProps> = ({
  patientId,
  patientName,
  onClose,
  onSave
}) => {
  const { user, profile } = useAuth();
  
  // Form state management
  const [formData, setFormData] = useState({
    bowel_incontinence: 'Continent' as const,
    stool_appearance: 'Normal' as const,
    stool_consistency: 'Formed' as const,
    stool_colour: 'Brown' as const,
    stool_amount: 'Moderate' as const,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Current date/time for display and recording
  const currentDateTime = new Date();

  /**
   * Update form field with validation
   */
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.notes.trim()) {
      newErrors.notes = 'Notes are required';
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

    try {
      setLoading(true);
      
      const bowelRecord: BowelRecord = {
        patient_id: patientId,
        nurse_id: user?.id || '',
        nurse_name: profile ? `${profile.first_name} ${profile.last_name}` : (user?.email || 'Unknown'),
        recorded_at: currentDateTime.toISOString(),
        bowel_incontinence: formData.bowel_incontinence,
        stool_appearance: formData.stool_appearance,
        stool_consistency: formData.stool_consistency,
        stool_colour: formData.stool_colour,
        stool_amount: formData.stool_amount,
        notes: formData.notes.trim()
      };

      const createdRecord = await createBowelRecord(bowelRecord);
      onSave(createdRecord);
    } catch (error: any) {
      console.error('Error creating bowel record:', error);
      setErrors({ submit: error.message || 'Failed to save bowel record' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bowel Record</h2>
              <p className="text-sm text-gray-600">{patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Current Time Display */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Recording Time: {formatLocalTime(currentDateTime, 'dd MMM yyyy - HH:mm')}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Bowel Incontinence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bowel Incontinence *
            </label>
            <select
              value={formData.bowel_incontinence}
              onChange={(e) => updateField('bowel_incontinence', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Continent">Continent</option>
              <option value="Incontinent">Incontinent</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* Grid for remaining fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stool Appearance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stool Appearance *
              </label>
              <select
                value={formData.stool_appearance}
                onChange={(e) => updateField('stool_appearance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Normal">Normal</option>
                <option value="Abnormal">Abnormal</option>
                <option value="Blood present">Blood present</option>
                <option value="Mucus present">Mucus present</option>
              </select>
            </div>

            {/* Stool Consistency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stool Consistency *
              </label>
              <select
                value={formData.stool_consistency}
                onChange={(e) => updateField('stool_consistency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Formed">Formed</option>
                <option value="Loose">Loose</option>
                <option value="Watery">Watery</option>
                <option value="Hard">Hard</option>
                <option value="Soft">Soft</option>
              </select>
            </div>

            {/* Stool Colour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stool Colour *
              </label>
              <select
                value={formData.stool_colour}
                onChange={(e) => updateField('stool_colour', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Brown">Brown</option>
                <option value="Green">Green</option>
                <option value="Yellow">Yellow</option>
                <option value="Black">Black</option>
                <option value="Red">Red</option>
                <option value="Clay colored">Clay colored</option>
              </select>
            </div>

            {/* Stool Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stool Amount *
              </label>
              <select
                value={formData.stool_amount}
                onChange={(e) => updateField('stool_amount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="None">None</option>
                <option value="Small">Small</option>
                <option value="Moderate">Moderate</option>
                <option value="Large">Large</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes *
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.notes ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Additional observations, patient comfort level, any other relevant information..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
