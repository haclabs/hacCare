/**
 * Add Intake & Output Modal Component
 * 
 * Form for entering new intake or output events
 */

import React, { useState, useEffect } from 'react';
import { X, Droplets, Save } from 'lucide-react';
import { createIntakeOutputEvent, getCategoryDisplayName } from '../../../../services/clinical/intakeOutputService';
import type { IoDirection, IoCategory } from '../../../../services/clinical/intakeOutputService';
import { getCurrentLocalDateTimeString } from '../../../../utils/time';
import { supabase } from '../../../../lib/api/supabase';

interface AddIntakeOutputModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const INTAKE_CATEGORIES: IoCategory[] = ['oral', 'iv_fluid', 'iv_med', 'blood', 'tube_feed'];
const OUTPUT_CATEGORIES: IoCategory[] = ['urine', 'stool', 'emesis', 'drain'];

const ROUTES = {
  intake: ['PO', 'IV', 'NG', 'PEG', 'Transfusion'],
  output: ['Foley', 'Natural', 'NG', 'Surgical Drain', 'Emesis']
};

export const AddIntakeOutputModal: React.FC<AddIntakeOutputModalProps> = ({
  patientId,
  patientName,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    direction: 'intake' as IoDirection,
    category: 'oral' as IoCategory,
    route: '',
    description: '',
    amount_ml: '',
    event_timestamp: getCurrentLocalDateTimeString(),
    student_name: ''
  });

  // Fetch patient's tenant_id on mount
  useEffect(() => {
    const fetchPatientTenant = async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('tenant_id')
        .eq('id', patientId)
        .single();
      
      if (data && !error) {
        setTenantId(data.tenant_id);
      } else {
        console.error('Failed to fetch patient tenant:', error);
      }
    };
    
    fetchPatientTenant();
  }, [patientId]);

  const updateField = (field: string, value: string | IoDirection | IoCategory) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDirectionChange = (direction: IoDirection) => {
    // Reset category when direction changes
    const defaultCategory = direction === 'intake' ? 'oral' : 'urine';
    setFormData(prev => ({
      ...prev,
      direction,
      category: defaultCategory,
      route: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.amount_ml || parseFloat(formData.amount_ml) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    if (!tenantId) {
      setError('Unable to determine patient tenant. Please try again.');
      setLoading(false);
      return;
    }

    try {
      await createIntakeOutputEvent({
        patient_id: patientId,
        tenant_id: tenantId,
        direction: formData.direction,
        category: formData.category,
        route: formData.route || null,
        description: formData.description || null,
        amount_ml: parseFloat(formData.amount_ml),
        event_timestamp: formData.event_timestamp,
        student_name: formData.student_name || null
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to create I&O entry:', err);
      setError('Failed to create entry. Please try again.');
      setLoading(false);
    }
  };

  const currentCategories = formData.direction === 'intake' ? INTAKE_CATEGORIES : OUTPUT_CATEGORIES;
  const currentRoutes = ROUTES[formData.direction];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Add Intake & Output Entry
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Patient: {patientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Direction Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Direction *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDirectionChange('intake')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.direction === 'intake'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Droplets className="h-4 w-4 mr-2" />
                  Intake
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange('output')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.direction === 'output'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Droplets className="h-4 w-4 mr-2" />
                  Output
                </div>
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value as IoCategory)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              {currentCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryDisplayName(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Route */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Route (Optional)
            </label>
            <select
              value={formData.route}
              onChange={(e) => updateField('route', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select route...</option>
              {currentRoutes.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (mL) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={formData.amount_ml}
              onChange={(e) => updateField('amount_ml', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter amount in mL"
              required
            />
          </div>

          {/* Event Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Time *
            </label>
            <input
              type="datetime-local"
              value={formData.event_timestamp}
              onChange={(e) => updateField('event_timestamp', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Any notes about this entry..."
            />
          </div>

          {/* Student Name Verification */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.student_name}
              onChange={(e) => updateField('student_name', e.target.value)}
              className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter your full name"
              required
            />
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
              By entering your name, you verify this intake/output entry is accurate.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
