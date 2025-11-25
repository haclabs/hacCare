/**
 * ===========================================================================
 * SIMULATION HISTORY TAB
 * ===========================================================================
 * Completed simulations with debrief reports and performance metrics
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { History, FileText, Clock, Users, TrendingUp, Archive, ArchiveRestore, Trash2, Search, UserCheck } from 'lucide-react';
import { getSimulationHistory, archiveSimulationHistory, unarchiveSimulationHistory, deleteSimulationHistory } from '../../../services/simulation/simulationService';
import type { SimulationHistoryWithDetails } from '../types/simulation';
import { PRIMARY_CATEGORIES, SUB_CATEGORIES } from '../types/simulation';
import EnhancedDebriefModal from './EnhancedDebriefModal';
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns';

type TabType = 'active' | 'archived';

const SimulationHistory: React.FC = () => {
  const [history, setHistory] = useState<SimulationHistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<SimulationHistoryWithDetails | null>(null);
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [archiving, setArchiving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [instructorFilter, setInstructorFilter] = useState<string>('');

  useEffect(() => {
    loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getSimulationHistory({ archived: activeTab === 'archived' });
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (historyId: string) => {
    try {
      setArchiving(historyId);
      await archiveSimulationHistory(historyId);
      // Reload the current tab's data
      await loadHistory();
    } catch (error) {
      console.error('Error archiving simulation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive simulation';
      alert(`Failed to archive simulation: ${errorMessage}`);
    } finally {
      setArchiving(null);
    }
  };

  const handleUnarchive = async (historyId: string) => {
    try {
      setArchiving(historyId);
      await unarchiveSimulationHistory(historyId);
      // Reload the current tab's data
      await loadHistory();
    } catch (error) {
      console.error('Error unarchiving simulation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore simulation';
      alert(`Failed to restore simulation: ${errorMessage}`);
    } finally {
      setArchiving(null);
    }
  };

  const handleDelete = async (historyId: string, simulationName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${simulationName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(historyId);
      await deleteSimulationHistory(historyId);
      // Reload the current tab's data
      await loadHistory();
    } catch (error) {
      console.error('Error deleting simulation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete simulation';
      alert(`Failed to delete simulation: ${errorMessage}`);
    } finally {
      setDeleting(null);
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

  // Get unique instructor names for filter dropdown
  const uniqueInstructors = React.useMemo(() => {
    const instructors = new Set<string>();
    history.forEach(record => {
      if (record.instructor_name) {
        instructors.add(record.instructor_name);
      }
    });
    return Array.from(instructors).sort();
  }, [history]);

  // Filter history based on search query and instructor filter
  const filteredHistory = history.filter(record => {
    // Search filter
    if (searchQuery.trim()) {
      const participantNames = getParticipantNames(record).toLowerCase();
      if (!participantNames.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    // Instructor filter
    if (instructorFilter && record.instructor_name !== instructorFilter) {
      return false;
    }
    return true;
  });

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

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                activeTab === 'active'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Active
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative flex items-center gap-2 ${
                activeTab === 'archived'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Archive className="h-4 w-4" />
              Archived
              {activeTab === 'archived' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
              )}
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by participant name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            </div>
            {uniqueInstructors.length > 0 && (
              <select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 min-w-[200px]"
              >
                <option value="">All Instructors</option>
                {uniqueInstructors.map(instructor => (
                  <option key={instructor} value={instructor}>
                    {instructor}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* History List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                {searchQuery ? 'No Matching Simulations' : activeTab === 'archived' ? 'No Archived Simulations' : 'No History Yet'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery 
                  ? 'Try a different participant name'
                  : activeTab === 'archived' 
                    ? 'Archived simulations will appear here'
                    : 'Completed simulations will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
            {filteredHistory.map((record) => (
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
                    {record.instructor_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-slate-500 dark:text-slate-500">Instructor:</span>
                        <span className="text-purple-700 dark:text-purple-300 font-semibold">{record.instructor_name}</span>
                      </div>
                    )}
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

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleViewDebrief(record)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                  >
                    <FileText className="h-4 w-4" />
                    View Debrief
                  </button>
                  
                  <div className="flex gap-2">
                    {activeTab === 'active' ? (
                      <button
                        onClick={() => handleArchive(record.id)}
                        disabled={archiving === record.id}
                        title="Archive this simulation"
                        className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {archiving === record.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600 dark:border-slate-300" />
                        ) : (
                          <Archive className="h-5 w-5" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnarchive(record.id)}
                        disabled={archiving === record.id}
                        title="Restore to active"
                        className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {archiving === record.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600 dark:border-slate-300" />
                        ) : (
                          <ArchiveRestore className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(record.id, record.name)}
                      disabled={deleting === record.id}
                      title="Delete permanently"
                      className="flex items-center justify-center p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === record.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 dark:border-red-400" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
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
