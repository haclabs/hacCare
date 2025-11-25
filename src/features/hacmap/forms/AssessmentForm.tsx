/**
 * Assessment Form - Document device/wound assessments over time
 * Supports both device and wound assessment with appropriate fields
 */

import React, { useState, useEffect } from 'react';
import type { Assessment, CreateAssessmentInput } from '../../../types/hacmap';

interface AssessmentFormProps {
  recordType: 'device' | 'wound';
  recordId: string;
  patientId: string;
  tenantId: string;
  assessment?: Assessment;
  onSave: (data: CreateAssessmentInput) => Promise<void>;
  onCancel: () => void;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  recordType,
  recordId,
  patientId,
  tenantId,
  assessment,
  onSave,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateAssessmentInput>>({
    student_name: '',
    assessed_at: new Date().toISOString().slice(0, 16),
    site_condition: '',
    pain_level: undefined,
    notes: '',
    // Wound-specific
    wound_length_cm: undefined,
    wound_width_cm: undefined,
    wound_depth_cm: undefined,
    wound_appearance: [],
    drainage_type: [],
    drainage_amount: '',
    surrounding_skin: [],
    treatment_applied: '',
    dressing_type: '',
    // Device-specific
    device_functioning: undefined,
    output_amount_ml: undefined,
  });

  useEffect(() => {
    if (assessment) {
      setFormData({
        student_name: assessment.student_name,
        assessed_at: assessment.assessed_at.slice(0, 16),
        site_condition: assessment.site_condition || '',
        pain_level: assessment.pain_level,
        notes: assessment.notes || '',
        wound_length_cm: assessment.wound_length_cm,
        wound_width_cm: assessment.wound_width_cm,
        wound_depth_cm: assessment.wound_depth_cm,
        wound_appearance: assessment.wound_appearance || [],
        drainage_type: assessment.drainage_type || [],
        drainage_amount: assessment.drainage_amount || '',
        surrounding_skin: assessment.surrounding_skin || [],
        treatment_applied: assessment.treatment_applied || '',
        dressing_type: assessment.dressing_type || '',
        device_functioning: assessment.device_functioning,
        output_amount_ml: assessment.output_amount_ml,
      });
    }
  }, [assessment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_name?.trim()) {
      alert('Student name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        device_id: recordType === 'device' ? recordId : null,
        wound_id: recordType === 'wound' ? recordId : null,
        patient_id: patientId,
        tenant_id: tenantId,
        assessed_at: formData.assessed_at,
        student_name: formData.student_name.trim(),
        site_condition: formData.site_condition || undefined,
        pain_level: formData.pain_level,
        notes: formData.notes || undefined,
        wound_length_cm: formData.wound_length_cm,
        wound_width_cm: formData.wound_width_cm,
        wound_depth_cm: formData.wound_depth_cm,
        wound_appearance: formData.wound_appearance || undefined,
        drainage_type: formData.drainage_type,
        drainage_amount: formData.drainage_amount || undefined,
        surrounding_skin: formData.surrounding_skin || undefined,
        treatment_applied: formData.treatment_applied || undefined,
        dressing_type: formData.dressing_type || undefined,
        device_functioning: formData.device_functioning,
        output_amount_ml: formData.output_amount_ml,
      });
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Failed to save assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrainageTypeToggle = (type: string) => {
    const current = formData.drainage_type || [];
    const newTypes = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFormData({ ...formData, drainage_type: newTypes });
  };

  const handleSurroundingSkinToggle = (condition: string) => {
    const current = formData.surrounding_skin || [];
    const newConditions = current.includes(condition)
      ? current.filter(c => c !== condition)
      : [...current, condition];
    setFormData({ ...formData, surrounding_skin: newConditions });
  };

  const handleWoundAppearanceToggle = (appearance: string) => {
    const current = formData.wound_appearance || [];
    const newAppearances = current.includes(appearance)
      ? current.filter(a => a !== appearance)
      : [...current, appearance];
    setFormData({ ...formData, wound_appearance: newAppearances });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-md p-4 text-sm text-purple-800">
        <p className="font-medium">
          {recordType === 'device' ? 'Device Assessment' : 'Wound Assessment'}
        </p>
        <p>Document the current status and any changes since last assessment</p>
      </div>

      {/* Assessment Date/Time */}
      <div>
        <label htmlFor="assessedAt" className="block text-sm font-medium text-gray-700 mb-1">
          Assessment Date & Time
        </label>
        <input
          id="assessedAt"
          type="datetime-local"
          value={formData.assessed_at}
          onChange={(e) => setFormData({ ...formData, assessed_at: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Common Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Site Condition / Surrounding Skin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {recordType === 'device' ? 'Site Condition' : 'Surrounding Skin'}
          </label>
          {recordType === 'wound' ? (
            <div className="flex flex-wrap gap-2">
              {['intact', 'erythema', 'edema', 'purulent', 'dry', 'macerated', 'other'].map(condition => (
                <label key={condition} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.surrounding_skin?.includes(condition) || false}
                    onChange={() => handleSurroundingSkinToggle(condition)}
                    className="mr-2"
                  />
                  {condition === 'erythema' ? 'Erythema (Redness)' :
                   condition === 'edema' ? 'Edema (Swelling)' :
                   condition.charAt(0).toUpperCase() + condition.slice(1)}
                </label>
              ))}
            </div>
          ) : (
            <select
              value={formData.site_condition}
              onChange={(e) => setFormData({ ...formData, site_condition: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select condition...</option>
              <option value="intact">Intact</option>
              <option value="erythema">Erythema (Redness)</option>
              <option value="edema">Edema (Swelling)</option>
              <option value="purulent">Purulent</option>
              <option value="dry">Dry</option>
              <option value="macerated">Macerated</option>
              <option value="other">Other</option>
            </select>
          )}
        </div>

        {/* Pain Level */}
        <div>
          <label htmlFor="painLevel" className="block text-sm font-medium text-gray-700 mb-1">
            Pain Level (0-10)
          </label>
          <input
            id="painLevel"
            type="number"
            min="0"
            max="10"
            value={formData.pain_level ?? ''}
            onChange={(e) => setFormData({ ...formData, pain_level: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="0-10"
          />
        </div>
      </div>

      {/* Device-Specific Fields */}
      {recordType === 'device' && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900">Device Status</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Functioning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Functioning Properly?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.device_functioning === true}
                    onChange={() => setFormData({ ...formData, device_functioning: true })}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.device_functioning === false}
                    onChange={() => setFormData({ ...formData, device_functioning: false })}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            </div>

            {/* Output Amount */}
            <div>
              <label htmlFor="outputAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Output Amount (mL)
              </label>
              <input
                id="outputAmount"
                type="number"
                min="0"
                value={formData.output_amount_ml ?? ''}
                onChange={(e) => setFormData({ ...formData, output_amount_ml: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="For drains/tubes"
              />
            </div>
          </div>
        </div>
      )}

      {/* Wound-Specific Fields */}
      {recordType === 'wound' && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900">Wound Measurements</h4>
          
          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-1">
                Length (cm)
              </label>
              <input
                id="length"
                type="number"
                step="0.1"
                min="0"
                value={formData.wound_length_cm ?? ''}
                onChange={(e) => setFormData({ ...formData, wound_length_cm: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                Width (cm)
              </label>
              <input
                id="width"
                type="number"
                step="0.1"
                min="0"
                value={formData.wound_width_cm ?? ''}
                onChange={(e) => setFormData({ ...formData, wound_width_cm: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1">
                Depth (cm)
              </label>
              <input
                id="depth"
                type="number"
                step="0.1"
                min="0"
                value={formData.wound_depth_cm ?? ''}
                onChange={(e) => setFormData({ ...formData, wound_depth_cm: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Wound Appearance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wound Appearance
            </label>
            <div className="flex flex-wrap gap-2">
              {['clean', 'granulating', 'epithelializing', 'slough', 'eschar', 'necrotic', 'infected'].map(appearance => (
                <label key={appearance} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.wound_appearance?.includes(appearance) || false}
                    onChange={() => handleWoundAppearanceToggle(appearance)}
                    className="mr-2"
                  />
                  {appearance.charAt(0).toUpperCase() + appearance.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Drainage Type (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drainage Type
            </label>
            <div className="flex flex-wrap gap-2">
              {['serous', 'sanguineous', 'serosanguineous', 'purulent', 'none'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.drainage_type?.includes(type) || false}
                    onChange={() => handleDrainageTypeToggle(type)}
                    className="mr-2"
                  />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Drainage Amount */}
          <div>
            <label htmlFor="drainageAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Drainage Amount
            </label>
            <select
              id="drainageAmount"
              value={formData.drainage_amount}
              onChange={(e) => setFormData({ ...formData, drainage_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select amount...</option>
              <option value="none">None</option>
              <option value="scant">Scant</option>
              <option value="small">Small</option>
              <option value="moderate">Moderate</option>
              <option value="large">Large</option>
              <option value="copious">Copious</option>
            </select>
          </div>

          {/* Treatment Applied */}
          <div>
            <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-1">
              Treatment Applied
            </label>
            <input
              id="treatment"
              type="text"
              value={formData.treatment_applied}
              onChange={(e) => setFormData({ ...formData, treatment_applied: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Irrigation, debridement, etc."
            />
          </div>

          {/* Dressing Type */}
          <div>
            <label htmlFor="dressing" className="block text-sm font-medium text-gray-700 mb-1">
              Dressing Type Applied
            </label>
            <input
              id="dressing"
              type="text"
              value={formData.dressing_type}
              onChange={(e) => setFormData({ ...formData, dressing_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Hydrocolloid, foam, gauze, etc."
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Any additional observations or concerns..."
        />
      </div>

      {/* Student Name Verification */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <label htmlFor="studentName" className="block text-sm font-medium text-yellow-900 mb-2">
          Student Name <span className="text-red-500">*</span>
        </label>
        <input
          id="studentName"
          type="text"
          value={formData.student_name}
          onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
          className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Enter your full name"
          required
        />
        <p className="text-xs text-yellow-700 mt-2">
          By entering your name, you verify this assessment is accurate.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Assessment'}
        </button>
      </div>
    </form>
  );
};
