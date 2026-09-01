/**
 * ===========================================================================
 * SIMULATION AUTO-GENERATED STUDENTS MODAL
 * ===========================================================================
 * Lets an instructor look up previously auto-generated student logins for an
 * active simulation (created via the "auto-generate student" checkbox on
 * Launch Simulation).
 * ===========================================================================
 */

import React, { useEffect, useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { getSimulationAutoStudents, type SimulationAutoStudent } from '../../../services/simulation/autoStudentService';
import { secureLogger } from '../../../lib/security/secureLogger';

interface SimulationAutoStudentsModalProps {
  simulationId: string;
  simulationName: string;
  onClose: () => void;
}

export const SimulationAutoStudentsModal: React.FC<SimulationAutoStudentsModalProps> = ({
  simulationId,
  simulationName,
  onClose,
}) => {
  const [students, setStudents] = useState<SimulationAutoStudent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setStudents(await getSimulationAutoStudents(simulationId));
      } catch (err) {
        secureLogger.error('Error loading simulation auto students:', err);
        setError('Failed to load generated logins.');
      } finally {
        setLoading(false);
      }
    })();
  }, [simulationId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Auto-Generated Logins</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{simulationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!loading && !error && students?.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No auto-generated logins for this simulation.
            </p>
          )}
          {students?.map((s) => (
            <div key={s.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{s.label || s.student_number}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Student #: {s.student_number}</p>
              <p className="text-sm font-mono text-slate-800 dark:text-slate-200">{s.email}</p>
              <p className="text-sm font-mono text-slate-800 dark:text-slate-200">{s.temp_password}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimulationAutoStudentsModal;
