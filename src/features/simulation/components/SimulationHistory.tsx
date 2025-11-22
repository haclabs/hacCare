/**
 * ===========================================================================
 * SIMULATION HISTORY TAB
 * ===========================================================================
 * Completed simulations with debrief reports and performance metrics
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { History, FileText, Clock, Users, TrendingUp } from 'lucide-react';
import { getSimulationHistory } from '../../../services/simulation/simulationService';
import type { SimulationHistoryWithDetails } from '../types/simulation';
import { PRIMARY_CATEGORIES, SUB_CATEGORIES } from '../types/simulation';
import EnhancedDebriefModal from './EnhancedDebriefModal';
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns';

const SimulationHistory: React.FC = () => {
  const [history, setHistory] = useState<SimulationHistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<SimulationHistoryWithDetails | null>(null);
  const [showDebriefModal, setShowDebriefModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getSimulationHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDebrief = (record: SimulationHistoryWithDetails) => {
    setSelectedHistory(record);
    setShowDebriefModal(true);
  };

  const calculateDuration = (record: SimulationHistoryWithDetails) => {
    // Use duration_minutes if available
    if (record.duration_minutes) {
      const hours = Math.floor(record.duration_minutes / 60);
      const mins = record.duration_minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    // Otherwise calculate from timestamps
    if (!record.completed_at || !record.started_at) return 'N/A';
    const start = new Date(record.started_at);
    const end = new Date(record.completed_at);
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getParticipantCount = (record: SimulationHistoryWithDetails): number => {
    // Parse student_activities JSON to get unique student names
    try {
      const activities = record.student_activities || [];
      if (typeof activities === 'string') {
        const parsed = JSON.parse(activities);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
      return Array.isArray(activities) ? activities.length : 0;
    } catch {
      return 0;
    }
  };

  const getParticipantNames = (record: SimulationHistoryWithDetails): string => {
    // Parse student_activities JSON to get student names
    try {
      const activities = record.student_activities || [];
      let parsed = activities;
      if (typeof activities === 'string') {
        parsed = JSON.parse(activities);
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const names = parsed.map((activity: any) => activity.studentName).filter(Boolean);
        return names.join(', ');
      }
      return 'No participants';
    } catch {
      return 'No participants';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No History Yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Completed simulations will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - History List */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Debrief Reports
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              View completed simulations and performance reports
            </p>
          </div>

          {/* History List */}
          <div className="space-y-3">
          {history.map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {record.name}
                    </h3>
                    <span
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${
                          record.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : record.status === 'expired'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }
                      `}
                    >
                      {record.status}
                    </span>
                  </div>

                  {/* Completed Date/Time - Bold and prominent in MST */}
                  {record.completed_at && (
                    <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">COMPLETED (MST)</div>
                      <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        {format(new Date(record.completed_at), 'PPP')} at {format(new Date(record.completed_at), 'HH:mm')} MST
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Template: {record.template?.name}
                  </p>

                  {/* Category Badges */}
                  {((record.primary_categories && record.primary_categories.length > 0) || (record.sub_categories && record.sub_categories.length > 0)) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {record.primary_categories?.map((cat) => {
                        const categoryConfig = PRIMARY_CATEGORIES.find(c => c.value === cat);
                        return categoryConfig ? (
                          <span key={cat} className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig.color}`}>
                            {categoryConfig.label}
                          </span>
                        ) : null;
                      })}
                      {record.sub_categories?.map((cat) => {
                        const categoryConfig = SUB_CATEGORIES.find(c => c.value === cat);
                        return categoryConfig ? (
                          <span key={cat} className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig.color}`}>
                            {categoryConfig.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {calculateDuration(record)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{getParticipantCount(record)} participants</span>
                      </div>
                      {record.completed_at && (
                        <div className="text-xs">
                          Completed {formatDistanceToNow(new Date(record.completed_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 dark:text-slate-500">Students:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{getParticipantNames(record)}</span>
                    </div>
                  </div>

                  {/* Metrics Summary */}
                  {record.metrics && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Performance Metrics Available</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debrief Button */}
                <button
                  onClick={() => handleViewDebrief(record)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                >
                  <FileText className="h-4 w-4" />
                  View Debrief
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Right Column - Instructor Guide */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-emerald-900 dark:text-emerald-100">
                Instructor Quick Guide
              </h3>
            </div>

            <div className="space-y-6 text-sm">
              {/* Viewing Debrief Reports */}
              <div>
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Debrief Report
                </h4>
                <p className="text-slate-700 dark:text-slate-300 mb-2">
                  Click <strong>View Debrief</strong> on any completed simulation to access:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                  <li>Session overview metrics</li>
                  <li>BCMA compliance percentage</li>
                  <li>Student activity timeline</li>
                  <li>All clinical entries by type</li>
                  <li>Device & wound assessments</li>
                  <li>Instructor notes section</li>
                </ul>
              </div>

              {/* Best Practices */}
              <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                  Debrief Best Practices
                </h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                    <span>Review report immediately after completion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                    <span>Use metrics to guide discussion (BCMA, documentation gaps)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                    <span>Note both strengths and improvement areas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                    <span>Save or print report for student records</span>
                  </li>
                </ul>
              </div>

              {/* Tips */}
              <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                  💡 Quick Tips
                </h4>
                <div className="space-y-2 text-slate-600 dark:text-slate-400">
                  <p className="bg-white dark:bg-slate-800 rounded p-2 text-xs">
                    <strong>Activity Log:</strong> Expand student sections to see individual actions with timestamps
                  </p>
                  <p className="bg-white dark:bg-slate-800 rounded p-2 text-xs">
                    <strong>Progress Bars:</strong> Visual breakdown shows intervention distribution by category
                  </p>
                  <p className="bg-white dark:bg-slate-800 rounded p-2 text-xs">
                    <strong>Print Ready:</strong> Use the Print/PDF button for record keeping
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debrief Modal */}
      {showDebriefModal && selectedHistory && (
        <EnhancedDebriefModal
          historyRecord={selectedHistory}
          onClose={() => {
            setShowDebriefModal(false);
            setSelectedHistory(null);
          }}
        />
      )}
    </>
  );
};

export default SimulationHistory;
