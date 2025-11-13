/**
 * Intake & Output Card Component
 * 
 * Displays patient fluid intake and output summary with recent events
 * Part of the clinical tracking dashboard
 */

import React, { useState, useEffect } from 'react';
import { Droplets, Plus, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getIntakeOutputEvents, getIntakeOutputSummary, deleteIntakeOutputEvent } from '../../../../services/clinical/intakeOutputService';
import type { IntakeOutputSummary as BaseIntakeOutputSummary } from '../../../../services/clinical/intakeOutputService';

// Extended summary with counts
interface IntakeOutputSummary extends BaseIntakeOutputSummary {
  intakeCount?: number;
  outputCount?: number;
}
import type { Database } from '../../../../types/supabase';
import { AddIntakeOutputModal } from './AddIntakeOutputModal';

type IntakeOutputEvent = Database['public']['Tables']['patient_intake_output_events']['Row'];

interface IntakeOutputCardProps {
  patientId: string;
  patientName: string;
  onRefresh?: () => void;
}

export const IntakeOutputCard: React.FC<IntakeOutputCardProps> = ({
  patientId,
  patientName,
  onRefresh
}) => {
  const [summary, setSummary] = useState<IntakeOutputSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<IntakeOutputEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoursBack, setHoursBack] = useState(8); // Default 8-hour shift

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, hoursBack]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load summary
      const summaryData = await getIntakeOutputSummary(patientId, hoursBack);
      // Calculate counts from events
      const intakeCount = summaryData.events.filter(e => e.direction === 'intake').length;
      const outputCount = summaryData.events.filter(e => e.direction === 'output').length;
      setSummary({ ...summaryData, intakeCount, outputCount });

      // Load recent events
      const events = await getIntakeOutputEvents(patientId, { hoursBack, limit: 5 });
      setRecentEvents(events || []);
    } catch (error) {
      console.error('Failed to load I&O data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await deleteIntakeOutputEvent(id);
      await loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleSuccess = async () => {
    setShowAddModal(false);
    await loadData();
    onRefresh?.();
  };

  const formatAmount = (ml: number) => `${ml} mL`;
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getNetBalanceColor = (netBalance: number) => {
    if (netBalance > 500) return 'text-blue-600 dark:text-blue-400';
    if (netBalance < -500) return 'text-red-600 dark:text-red-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 mr-4">
                <Droplets className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Intake & Output
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fluid balance tracking
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[4, 8, 12, 24].map((hours) => (
              <button
                key={hours}
                onClick={() => setHoursBack(hours)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  hoursBack === hours
                    ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        {loading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-3 gap-4 p-6">
              {/* Total Intake */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Intake
                  </span>
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatAmount(summary.totalIntake)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {summary.intakeCount} entries
                </p>
              </div>

              {/* Total Output */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Output
                  </span>
                  <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {formatAmount(summary.totalOutput)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {summary.outputCount} entries
                </p>
              </div>

              {/* Net Balance */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Net Balance
                  </span>
                  <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <p className={`text-2xl font-bold ${getNetBalanceColor(summary.netBalance)}`}>
                  {summary.netBalance > 0 ? '+' : ''}{formatAmount(summary.netBalance)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Last {hoursBack}h
                </p>
              </div>
            </div>

            {/* Recent Events */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Recent Events
                </h4>
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No entries in the last {hoursBack} hours
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center flex-1">
                          <div className={`w-2 h-2 rounded-full mr-3 ${
                            event.direction === 'intake'
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {event.category.replace('_', ' ')}
                              </span>
                              {event.route && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({event.route})
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {event.description}
                              </p>
                            )}
                            {event.student_name && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                Student: {event.student_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatAmount(event.amount_ml)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(event.event_timestamp)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs px-2 py-1 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Failed to load data
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddIntakeOutputModal
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};
