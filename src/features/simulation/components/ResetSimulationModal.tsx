import React from 'react';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

interface ResetState {
  id: string;
  label: string;
  changelog_note?: string | null;
}

interface ResetSimulationModalProps {
  simulationName: string;
  /** True when the card shows Needs Reset, i.e. the debrief has been saved. */
  completed: boolean;
  states: ResetState[];
  selectedStateId: string | null;
  onSelectState: (id: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ResetSimulationModal: React.FC<ResetSimulationModalProps> = ({
  simulationName,
  completed,
  states,
  selectedStateId,
  onSelectState,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
    <div className={`bg-white rounded-xl shadow-2xl max-w-md w-full border-4 ${completed ? 'border-blue-300' : 'border-red-400'}`}>
      <div className={`px-6 py-4 border-b flex items-center gap-3 rounded-t-xl ${completed ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${completed ? 'bg-blue-100' : 'bg-red-100'}`}>
          {completed
            ? <RotateCcw className="w-6 h-6 text-blue-600" />
            : <AlertTriangle className="w-6 h-6 text-red-600" />}
        </div>
        <div>
          <h3 className={`text-lg font-bold ${completed ? 'text-blue-900' : 'text-red-900'}`}>
            {completed ? 'Reset for Next Group' : 'Reset Simulation Warning'}
          </h3>
          <p className="text-xs text-slate-500">{simulationName}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {completed ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                <strong>Debrief saved.</strong> You&apos;ll find it under Debrief Reports.
              </p>
            </div>
            <p className="text-sm text-slate-700">
              Reset clears this group&apos;s charting and restores the starting charts. Bracelets, medication labels
              and student logins keep working. The card will show <strong>Ready to Start</strong>.
            </p>
          </>
        ) : (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
            <p className="text-sm font-semibold text-red-800">
              This simulation hasn&apos;t been completed. Resetting now permanently deletes all student work, and it
              won&apos;t appear in Debrief Reports.
            </p>
          </div>
        )}

        {states.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reset into state</label>
            <select
              value={selectedStateId ?? ''}
              onChange={(e) => onSelectState(e.target.value || null)}
              className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Current / Default</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>{state.label}</option>
              ))}
            </select>
            {selectedStateId && (
              <p className="text-xs text-slate-500 mt-1">
                {states.find(s => s.id === selectedStateId)?.changelog_note || 'No changelog note provided.'}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-colors ${
              completed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {completed ? 'Reset' : 'Reset Anyway'}
          </button>
        </div>
      </div>
    </div>
  </div>
);
