import React from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import type { SeedPatientResult } from '../utils/seedTestData';

interface SeedTestDataResultsPanelProps {
  results: SeedPatientResult[];
  onClose: () => void;
}

/** Shared results display for the QA_VALIDATION seeder — used in template editing and active simulations. */
export const SeedTestDataResultsPanel: React.FC<SeedTestDataResultsPanelProps> = ({ results, onClose }) => (
  <div className="bg-white/95 text-gray-800 border-t border-white/30">
    <div className="max-w-7xl mx-auto px-6 lg:px-8 xl:px-12 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">Seed Test Data Results</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {results.map((patientResult) => {
          const failedCount = patientResult.results.filter((r) => !r.success).length;
          return (
            <div key={patientResult.patientId}>
              <p className="text-xs font-semibold text-gray-600 mb-1">
                {patientResult.patientName} — {patientResult.results.length - failedCount}/{patientResult.results.length} succeeded
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0.5">
                {patientResult.results.map((r) => (
                  <li key={r.domain} className="flex items-center gap-1.5 text-xs" title={r.error}>
                    {r.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={r.success ? 'text-gray-600' : 'text-red-700 font-medium'}>{r.domain}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
