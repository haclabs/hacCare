/**
 * ===========================================================================
 * SIMULATION HISTORY TAB
 * ===========================================================================
 * Completed simulations with debrief reports and performance metrics
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { History, FileText, Clock, Users, TrendingUp, Archive, ArchiveRestore, Trash2, Search, UserCheck, Calendar } from 'lucide-react';
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
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const handleArchiveAll = async () => {
    if (!window.confirm(`Archive all ${filteredHistory.length} active simulation${filteredHistory.length !== 1 ? 's' : ''}?\n\nThis will move them to the Archived tab organized by instructor and date.`)) {
      return;
    }

    try {
      setArchiving('bulk');
      let successCount = 0;
      let errorCount = 0;

      // Archive all filtered history items
      for (const record of filteredHistory) {
        try {
          await archiveSimulationHistory(record.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to archive ${record.name}:`, error);
          errorCount++;
        }
      }

      // Show result
      if (errorCount === 0) {
        alert(`✅ Successfully archived ${successCount} simulation${successCount !== 1 ? 's' : ''}!`);
      } else {
        alert(`Archived ${successCount} simulation${successCount !== 1 ? 's' : ''}, but ${errorCount} failed.\n\nCheck console for details.`);
      }

      // Reload the list
      await loadHistory();
    } catch (error) {
      console.error('Error in bulk archive:', error);
      alert('Failed to complete bulk archive operation.');
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

  // Get folder structure for archived simulations
  const folderStructure = React.useMemo(() => {
    if (activeTab !== 'archived') return {};
    
    const structure: Record<string, Set<string>> = {};
    history.forEach(record => {
      if (record.archive_folder) {
        const [instructor, date] = record.archive_folder.split('/');
        if (!structure[instructor]) {
          structure[instructor] = new Set();
        }
        structure[instructor].add(date);
      }
    });
    
    // Convert Sets to sorted arrays
    const result: Record<string, string[]> = {};
    Object.keys(structure).sort().forEach(instructor => {
      result[instructor] = Array.from(structure[instructor]).sort().reverse(); // Most recent first
    });
    return result;
  }, [history, activeTab]);

  // Filter history based on search query, instructor filter, and folder navigation
  const filteredHistory = history.filter(record => {
    // Folder navigation filter (for archived tab)
    if (activeTab === 'archived' && selectedInstructor) {
      if (record.instructor_name !== selectedInstructor) return false;
      if (selectedDate) {
        const recordDate = record.completed_at 
          ? new Date(record.completed_at).toISOString().split('T')[0]
          : null;
        if (recordDate !== selectedDate) return false;
      }
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const participantNames = getParticipantNames(record).toLowerCase();
      if (!participantNames.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    // Instructor filter (for active tab)
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

          {/* Auto-Archive Notice - Only on Active Tab */}
          {activeTab === 'active' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
              <Archive className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Reports are automatically moved to the Archived tab after 24 hours and organized by instructor and date.
              </p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setActiveTab('active');
                setSelectedInstructor(null);
                setSelectedDate(null);
              }}
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
              onClick={() => {
                setActiveTab('archived');
                setSelectedInstructor(null);
                setSelectedDate(null);
              }}
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
            {activeTab === 'active' && filteredHistory.length > 0 && (
              <button
                onClick={handleArchiveAll}
                disabled={archiving === 'bulk'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:cursor-not-allowed"
                title="Archive all visible simulations"
              >
                {archiving === 'bulk' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    <span>Archive All ({filteredHistory.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Folder Browser for Archived Tab */}
          {activeTab === 'archived' && Object.keys(folderStructure).length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                    Browse by Instructor
                  </h3>
                </div>
                {(selectedInstructor || selectedDate) && (
                  <button
                    onClick={() => {
                      setSelectedInstructor(null);
                      setSelectedDate(null);
                    }}
                    className="text-xs px-3 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors font-medium"
                  >
                    ← Back to All
                  </button>
                )}
              </div>

              {/* Breadcrumb Navigation */}
              {(selectedInstructor || selectedDate) && (
                <div className="flex items-center gap-2 text-sm mb-3 px-3 py-2 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                  <Archive className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <button
                    onClick={() => {
                      setSelectedInstructor(null);
                      setSelectedDate(null);
                    }}
                    className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium"
                  >
                    Archives
                  </button>
                  {selectedInstructor && (
                    <>
                      <span className="text-slate-400">/</span>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
                      >
                        {selectedInstructor}
                      </button>
                    </>
                  )}
                  {selectedDate && (
                    <>
                      <span className="text-slate-400">/</span>
                      <span className="text-emerald-800 dark:text-emerald-200 font-bold">
                        {format(new Date(selectedDate), 'MMM dd, yyyy')}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              {!selectedInstructor && !selectedDate && (
                <div className="mb-3 text-xs text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg">
                  📂 {Object.keys(folderStructure).length} instructor{Object.keys(folderStructure).length !== 1 ? 's' : ''} with archived reports
                </div>
              )}

              {/* Folder View */}
              <div className={`grid gap-2 ${!selectedInstructor ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!selectedInstructor ? (
                  // Show instructor folders - List view with search
                  <>
                    {Object.keys(folderStructure).length > 5 && (
                      <div className="mb-2">
                        <input
                          type="text"
                          placeholder="Search instructors..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    )}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {Object.entries(folderStructure)
                        .filter(([instructor]) => 
                          !searchQuery || instructor.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(([instructor, dates]) => {
                          const totalReports = dates.reduce((sum, date) => {
                            return sum + history.filter(r => 
                              r.instructor_name === instructor && 
                              r.completed_at && 
                              new Date(r.completed_at).toISOString().split('T')[0] === date
                            ).length;
                          }, 0);
                          
                          return (
                            <button
                              key={instructor}
                              onClick={() => {
                                setSelectedInstructor(instructor);
                                setSearchQuery(''); // Clear search when selecting
                              }}
                              className="w-full flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-left group shadow-sm hover:shadow"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-white truncate">{instructor}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {dates.length} {dates.length === 1 ? 'session date' : 'session dates'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                                  {totalReports} {totalReports === 1 ? 'report' : 'reports'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">→ Open</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  // Show date folders for selected instructor
                  folderStructure[selectedInstructor]?.map((date) => {
                    const simCount = history.filter(r => 
                      r.instructor_name === selectedInstructor && 
                      r.completed_at && 
                      new Date(r.completed_at).toISOString().split('T')[0] === date
                    ).length;
                    
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-left group shadow-sm hover:shadow"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {format(new Date(date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full flex-shrink-0 font-semibold">
                          {simCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

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
                    <div className="mb-3 inline-block px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
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
                    {activeTab === 'archived' && record.archive_folder && (
                      <div className="flex items-center gap-2 text-sm">
                        <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-slate-500 dark:text-slate-500">Archive Folder:</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-mono text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">{record.archive_folder}</span>
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
