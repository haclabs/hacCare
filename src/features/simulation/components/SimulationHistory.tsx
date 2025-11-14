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
import EnhancedDebriefModal from './EnhancedDebriefModal';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';

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

  const calculateDuration = (startsAt: string, completedAt: string | null) => {
    if (!completedAt) return 'N/A';
    const start = new Date(startsAt);
    const end = new Date(completedAt);
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Simulation History
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

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Template: {record.template?.name}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Duration: {calculateDuration(record.started_at, record.completed_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{record.participants?.length || 0} participants</span>
                    </div>
                    <div className="text-xs">
                      Completed {record.completed_at ? formatDistanceToNow(new Date(record.completed_at), { addSuffix: true }) : 'N/A'}
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
