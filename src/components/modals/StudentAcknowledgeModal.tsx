/**
 * Student Acknowledge Modal
 * 
 * Generic modal for collecting student name when acknowledging 
 * doctor's orders, lab results, etc.
 */

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface StudentAcknowledgeModalProps {
  title: string;
  message: string;
  actionText?: string;
  onConfirm: (studentName: string) => Promise<void>;
  onCancel: () => void;
}

export const StudentAcknowledgeModal: React.FC<StudentAcknowledgeModalProps> = ({
  title,
  message,
  actionText = 'Acknowledge',
  onConfirm,
  onCancel
}) => {
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      setError('Student name is required');
      return;
    }

    if (studentName.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm(studentName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-gray-700">{message}</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Student Name Input in Yellow Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-yellow-900 mb-2">
                Student Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your full name"
                required
                autoFocus
              />
              <p className="text-xs text-yellow-700 mt-2">
                By entering your name, you verify that you reviewed and acknowledge this action.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !studentName.trim()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : actionText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
