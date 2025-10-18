/**
 * ===========================================================================
 * DEBRIEF REPORT MODAL
 * ===========================================================================
 * Display performance metrics and debrief data with print option
 * ===========================================================================
 */

import React from 'react';
import { X, FileText, Printer, TrendingUp, Clock, Users, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import type { SimulationHistoryWithDetails } from '../../../types/simulation';
import { format, differenceInMinutes } from 'date-fns';

interface DebriefReportModalProps {
  historyRecord: SimulationHistoryWithDetails;
  onClose: () => void;
}

const DebriefReportModal: React.FC<DebriefReportModalProps> = ({ historyRecord, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const calculateDuration = () => {
    if (!historyRecord.completed_at) return 'N/A';
    const start = new Date(historyRecord.started_at);
    const end = new Date(historyRecord.completed_at);
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg print:hidden">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                Simulation Debrief Report
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">
                {historyRecord.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Print report"
            >
              <Printer className="h-5 w-5 text-slate-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible">
          {/* Overview Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg print:border print:border-black">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2 print:text-black">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white print:text-black">
                {calculateDuration()}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg print:border print:border-black">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2 print:text-black">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Participants</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white print:text-black">
                {historyRecord.participants?.length || 0}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg print:border print:border-black">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2 print:text-black">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Total Actions</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white print:text-black">
                {historyRecord.activity_summary?.total_actions || 0}
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg print:border print:border-black">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2 print:text-black">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white print:text-black capitalize">
                {historyRecord.status}
              </p>
            </div>
          </div>

          {/* Performance Metrics */}
          {historyRecord.metrics && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 print:border-2 print:border-black">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 print:text-black">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">Total Actions</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    {historyRecord.metrics.total_actions || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">Medications Admin</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    {historyRecord.metrics.medications_administered || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">Vitals Recorded</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    {historyRecord.metrics.vitals_recorded || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">Alerts Generated</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    {historyRecord.metrics.alerts_generated || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">Notes Created</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    {historyRecord.metrics.notes_created || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">Unique Participants</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                    {historyRecord.metrics.unique_participants || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Participants List */}
          {historyRecord.participants && historyRecord.participants.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 print:border-2 print:border-black">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 print:text-black">
                Participants
              </h3>
              <div className="space-y-2">
                {historyRecord.participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg print:border print:border-gray-300"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white print:text-black">
                        {participant.name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 print:text-gray-600">
                        {participant.email}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium print:border print:border-blue-800">
                      {participant.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debrief Data */}
          {historyRecord.debrief_data && (
            <div className="space-y-4">
              {/* Strengths */}
              {historyRecord.debrief_data.strengths && historyRecord.debrief_data.strengths.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 print:border-2 print:border-black">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-black">
                      Strengths
                    </h3>
                  </div>
                  <ul className="list-disc list-inside space-y-2">
                    {historyRecord.debrief_data.strengths.map((strength, index) => (
                      <li key={index} className="text-slate-700 dark:text-slate-300 print:text-black">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {historyRecord.debrief_data.areas_for_improvement && historyRecord.debrief_data.areas_for_improvement.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 print:border-2 print:border-black">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-black">
                      Areas for Improvement
                    </h3>
                  </div>
                  <ul className="list-disc list-inside space-y-2">
                    {historyRecord.debrief_data.areas_for_improvement.map((area, index) => (
                      <li key={index} className="text-slate-700 dark:text-slate-300 print:text-black">
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructor Notes */}
              {historyRecord.debrief_data.instructor_notes && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 print:border-2 print:border-black">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 print:text-black">
                    Instructor Notes
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap print:text-black">
                    {historyRecord.debrief_data.instructor_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400 print:border print:border-black print:text-gray-600">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Template:</strong> {historyRecord.template?.name}
              </div>
              <div>
                <strong>Started:</strong> {format(new Date(historyRecord.started_at), 'PPpp')}
              </div>
              <div>
                <strong>Completed:</strong> {historyRecord.completed_at ? format(new Date(historyRecord.completed_at), 'PPpp') : 'N/A'}
              </div>
              <div>
                <strong>Created By:</strong> {historyRecord.creator ? `${historyRecord.creator.first_name} ${historyRecord.creator.last_name}` : 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebriefReportModal;
