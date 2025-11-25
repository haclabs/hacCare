/**
 * Instructor Name Modal
 * Prompts for instructor name when completing a simulation
 */

import React, { useState } from 'react';
import { UserCheck, X } from 'lucide-react';

interface InstructorNameModalProps {
  simulationName: string;
  onConfirm: (instructorName: string) => void;
  onCancel: () => void;
}

export const InstructorNameModal: React.FC<InstructorNameModalProps> = ({
  simulationName,
  onConfirm,
  onCancel
}) => {
  const [instructorName, setInstructorName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instructorName.trim()) {
      onConfirm(instructorName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Complete Simulation
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Completing: <span className="font-semibold text-slate-900 dark:text-white">{simulationName}</span>
            </p>
            
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Your Name (Instructor)
            </label>
            <input
              type="text"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                       placeholder-slate-400 dark:placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Your name will be saved with this simulation debrief for tracking and filtering purposes.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 
                       rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!instructorName.trim()}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg 
                       hover:bg-purple-700 transition-colors font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Simulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
