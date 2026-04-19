/**
 * Unnamed Student Modal
 *
 * Shown during simulation completion when clinical records exist but no
 * student_name was entered. Lets the instructor attribute those records
 * to a named student before the debrief is finalised.
 */

import React, { useState } from 'react';
import { AlertTriangle, UserX, X } from 'lucide-react';

interface UnnamedStudentModalProps {
  simulationName: string;
  unnamedCount: number;
  onConfirm: (studentName: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const UnnamedStudentModal: React.FC<UnnamedStudentModalProps> = ({
  simulationName,
  unnamedCount,
  onConfirm,
  onSkip,
  onCancel,
}) => {
  const [studentName, setStudentName] = useState('');

  const handleConfirm = () => {
    const trimmed = studentName.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <UserX className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">No Student Name Found</h2>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>{unnamedCount} clinical record{unnamedCount !== 1 ? 's were' : ' was'} found</strong> in{' '}
              <em>{simulationName}</em> but the student did not enter their name. Without a name these
              records will not appear in the debrief report.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Jane Smith"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              All unnamed records in this simulation will be attributed to this name.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Complete without student data
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!studentName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save & Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
