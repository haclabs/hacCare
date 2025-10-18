// Create Lab Panel Modal
// Allows admins to create new lab panels

import React, { useState } from 'react';
import { X, Calendar, Clock, FileText } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { createLabPanel } from '../../../services/clinical/labService';
import type { CreateLabPanelInput } from '../../../types/labs';

interface CreateLabPanelModalProps {
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateLabPanelModal: React.FC<CreateLabPanelModalProps> = ({
  patientId,
  onClose,
  onSuccess,
}) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateLabPanelInput>({
    patient_id: patientId,
    panel_time: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    source: 'manual entry',
    notes: '',
    ack_required: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant) {
      setError('No tenant selected');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: err } = await createLabPanel(formData, currentTenant.id);

    if (err) {
      setError('Failed to create lab panel');
      console.error(err);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Lab Panel</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Panel Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Collection/Result Time
              </div>
            </label>
            <input
              type="datetime-local"
              value={formData.panel_time}
              onChange={(e) =>
                setFormData({ ...formData, panel_time: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="manual entry">Manual Entry</option>
              <option value="import">Import</option>
              <option value="lab system">Lab System</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Notes (Optional)
              </div>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Acknowledgement Required */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ack_required"
              checked={formData.ack_required}
              onChange={(e) =>
                setFormData({ ...formData, ack_required: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="ack_required" className="ml-2 text-sm text-gray-700">
              Acknowledgement required
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Panel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
