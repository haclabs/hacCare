// Create Lab Result Modal
// Allows admins to add individual lab results

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { createLabResult, getLabResultRefs } from '../../services/clinical/labService';
import type { CreateLabResultInput, LabResultRef, LabCategory } from '../../types/labs';
import { LAB_CATEGORY_TABS } from '../../types/labs';

interface CreateLabResultModalProps {
  panelId: string;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateLabResultModal: React.FC<CreateLabResultModalProps> = ({
  panelId,
  patientId,
  onClose,
  onSuccess,
}) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refs, setRefs] = useState<LabResultRef[]>([]);
  const [selectedRef, setSelectedRef] = useState<LabResultRef | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateLabResultInput>({
    panel_id: panelId,
    category: 'chemistry',
    test_code: '',
    test_name: '',
    value: null,
    units: '',
    comments: '',
  });

  useEffect(() => {
    loadRefs();
  }, []);

  const loadRefs = async () => {
    const { data } = await getLabResultRefs();
    setRefs(data || []);
  };

  const handleSelectRef = (ref: LabResultRef) => {
    setSelectedRef(ref);
    setFormData({
      ...formData,
      category: ref.category,
      test_code: ref.test_code,
      test_name: ref.test_name,
      units: ref.units || '',
      ref_low: ref.ref_low || undefined,
      ref_high: ref.ref_high || undefined,
      ref_operator: ref.ref_operator,
      sex_ref: ref.sex_ref || undefined,
      critical_low: ref.critical_low || undefined,
      critical_high: ref.critical_high || undefined,
    });
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTenant) {
      setError('No tenant selected');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: err } = await createLabResult(
      formData,
      patientId,
      currentTenant.id
    );

    if (err) {
      setError('Failed to create lab result');
      console.error(err);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const filteredRefs = refs.filter(ref =>
    ref.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.test_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Add Lab Result</h3>
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

          {/* Test selection */}
          {!selectedRef ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for Test
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by test name or code..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {searchTerm && (
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredRefs.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No tests found</p>
                  ) : (
                    filteredRefs.map((ref) => (
                      <button
                        key={ref.test_code}
                        type="button"
                        onClick={() => handleSelectRef(ref)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {ref.test_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {ref.test_code} • {ref.category}
                            </p>
                          </div>
                          {ref.units && (
                            <span className="text-xs text-gray-500">{ref.units}</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected test */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedRef.test_name}
                    </p>
                    <p className="text-xs text-blue-700">
                      {selectedRef.test_code} • {selectedRef.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRef(null);
                      setFormData({ ...formData, test_code: '', test_name: '' });
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.value || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units
                  </label>
                  <input
                    type="text"
                    value={formData.units}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments (Optional)
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Any notes about this result..."
                />
              </div>
            </>
          )}

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
              disabled={loading || !selectedRef}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
