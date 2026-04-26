/**
 * ===========================================================================
 * ENHANCED DEBRIEF REPORT MODAL
 * ===========================================================================
 * Beautiful, interactive debrief report with charts and metrics
 * Replaces PDF generation with responsive web view + print capability
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Clock, Users, Activity, TrendingUp, CheckCircle, AlertCircle, BarChart3, Award, RefreshCw } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { getStudentActivitiesBySimulation, type StudentActivity } from '../../../services/simulation/studentActivityService';
import { regenerateDebriefSnapshot } from '../../../services/simulation/simulationService';
import { generateStudentActivityPDF, generateStudentActivityPDFBlob } from '../../../utils/reactPdfGenerator';
import type { Database } from '../../../types/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';
import { StudentActivitySection } from './DebriefStudentSection';

type HistoryRecordWithActivities = Database['public']['Tables']['simulation_history']['Row'] & {
  student_activities?: StudentActivity[] | null;
};

interface EnhancedDebriefModalProps {
  historyRecord: HistoryRecordWithActivities;
  onClose: () => void;
}

interface Metrics {
  totalVitals: number;
  totalMeds: number;
  totalOrders: number;
  totalNotes: number;
  totalIO: number;
  totalLabOrders: number;
  totalLabAcks: number;
  totalHacmapDevices: number;
  totalHacmapWounds: number;
  totalDeviceAssessments: number;
  totalWoundAssessments: number;
  totalBowelAssessments: number;
  bcmaCompliance: number;
  avgEntriesPerStudent: number;
  totalInterventions: number;
  totalAllActivities: number;
}

const EnhancedDebriefModal: React.FC<EnhancedDebriefModalProps> = ({ historyRecord, onClose }) => {
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [instructorName, setInstructorName] = useState('');
  const [instructorNotes, setInstructorNotes] = useState('');
  function deduplicateStudentActivities(activities: StudentActivity[]): StudentActivity[] {
    const studentMap = new Map<string, StudentActivity>();
    
    activities.forEach((activity) => {
      const normalizedName = activity.studentName.trim().toLowerCase();
      const existing = studentMap.get(normalizedName);
      
      if (existing) {
        existing.activities.vitals.push(...activity.activities.vitals);
        existing.activities.medications.push(...activity.activities.medications);
        existing.activities.labOrders.push(...activity.activities.labOrders);
        existing.activities.labAcknowledgements.push(...activity.activities.labAcknowledgements);
        existing.activities.doctorsOrders.push(...activity.activities.doctorsOrders);
        existing.activities.patientNotes.push(...activity.activities.patientNotes);
        existing.activities.handoverNotes.push(...activity.activities.handoverNotes);
        existing.activities.advancedDirectives.push(...activity.activities.advancedDirectives);
        existing.activities.hacmapDevices.push(...activity.activities.hacmapDevices);
        existing.activities.hacmapWounds.push(...activity.activities.hacmapWounds);
        existing.activities.deviceAssessments.push(...activity.activities.deviceAssessments);
        existing.activities.woundAssessments.push(...activity.activities.woundAssessments);
        existing.activities.bowelAssessments.push(...activity.activities.bowelAssessments);
        existing.activities.neuroAssessments.push(...(activity.activities.neuroAssessments || []));
        existing.activities.bbitEntries.push(...(activity.activities.bbitEntries || []));
        existing.activities.newbornAssessments.push(...(activity.activities.newbornAssessments || []));
        existing.activities.intakeOutput.push(...activity.activities.intakeOutput);
        existing.totalEntries += activity.totalEntries;
      } else {
        const cloned = JSON.parse(JSON.stringify(activity));
        cloned.studentName = activity.studentName.trim();
        studentMap.set(normalizedName, cloned);
      }
    });
    
    return Array.from(studentMap.values());
  }

  const loadStudentActivities = async () => {
    try {
      setLoading(true);

      // Prefer the stored snapshot captured at completion time.
      // Querying the live tables would return wrong data when the simulation
      // tenant has been reset and re-run with different students since this
      // history record was created (simulation_active.starts_at changes on
      // every reset, so the time filter would point to the wrong session).
      if (historyRecord.student_activities && Array.isArray(historyRecord.student_activities)) {
        const snapshot = historyRecord.student_activities as unknown as StudentActivity[];
        if (snapshot.length > 0) {
          const deduped = deduplicateStudentActivities(snapshot);
          setStudentActivities(deduped);
          return;
        }
      }

      // Fall back to live query for older records that have no snapshot.
      // Pass historyRecord.started_at as the time anchor so we don't
      // accidentally use a stale simulation_active.starts_at from a later reset.
      if (historyRecord.simulation_id) {
        const activities = await getStudentActivitiesBySimulation(
          historyRecord.simulation_id,
          historyRecord.started_at ?? undefined
        );
        const deduped = deduplicateStudentActivities(activities);
        setStudentActivities(deduped);
      }
    } catch (error) {
      secureLogger.error('Failed to load student activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudentActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRecord.id]);

  const handleRegenerateFromDatabase = async () => {
    if (!historyRecord.simulation_id || !historyRecord.started_at) {
      alert('Cannot regenerate: missing simulation reference or start time on this history record.');
      return;
    }
    setIsRegenerating(true);
    try {
      await regenerateDebriefSnapshot(
        historyRecord.id,
        historyRecord.simulation_id,
        historyRecord.started_at
      );
      // Re-run load — snapshot is now fresh so it will be picked up
      await loadStudentActivities();
    } catch (error) {
      secureLogger.error('Failed to regenerate debrief snapshot:', error);
      alert('Failed to refresh report data: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsRegenerating(false);
    }
  };

  const calculateMetrics = (): Metrics => {
    let totalVitals = 0, totalMeds = 0, totalOrders = 0, totalNotes = 0, totalIO = 0;
    let totalLabOrders = 0, totalLabAcks = 0, totalHacmapDevices = 0, totalHacmapWounds = 0;
    let totalDeviceAssessments = 0, totalWoundAssessments = 0, totalBowelAssessments = 0;
    let bcmaScanned = 0, bcmaTotal = 0;

    studentActivities.forEach(student => {
      totalVitals += student.activities.vitals?.length || 0;
      totalMeds += student.activities.medications?.length || 0;
      totalOrders += student.activities.doctorsOrders?.length || 0;
      totalNotes += (student.activities.patientNotes?.length || 0) + (student.activities.handoverNotes?.length || 0);
      totalIO += student.activities.intakeOutput?.length || 0;
      totalLabOrders += student.activities.labOrders?.length || 0;
      totalLabAcks += student.activities.labAcknowledgements?.length || 0;
      totalHacmapDevices += student.activities.hacmapDevices?.length || 0;
      totalHacmapWounds += student.activities.hacmapWounds?.length || 0;
      totalDeviceAssessments += student.activities.deviceAssessments?.length || 0;
      totalWoundAssessments += student.activities.woundAssessments?.length || 0;
      totalBowelAssessments += student.activities.bowelAssessments?.length || 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      student.activities.medications?.forEach((med: any) => {
        bcmaTotal++;
        // BCMA compliant if barcode_scanned is true (all checks passed)
        if (med.barcode_scanned) bcmaScanned++;
      });
    });

    const bcmaCompliance = bcmaTotal > 0 ? Math.round((bcmaScanned / bcmaTotal) * 100) : 0;
    const avgEntriesPerStudent = studentActivities.length > 0 
      ? Math.round(studentActivities.reduce((sum, s) => sum + s.totalEntries, 0) / studentActivities.length) 
      : 0;
    
    const totalAllActivities = totalVitals + totalMeds + totalOrders + totalIO + totalLabOrders + 
      totalLabAcks + totalHacmapDevices + totalHacmapWounds + totalDeviceAssessments + 
      totalWoundAssessments + totalBowelAssessments;

    return {
      totalVitals,
      totalMeds,
      totalOrders,
      totalNotes,
      totalIO,
      totalLabOrders,
      totalLabAcks,
      totalHacmapDevices,
      totalHacmapWounds,
      totalDeviceAssessments,
      totalWoundAssessments,
      totalBowelAssessments,
      bcmaCompliance,
      avgEntriesPerStudent,
      totalInterventions: totalVitals + totalMeds + totalOrders + totalIO,
      totalAllActivities
    };
  };

  const calculateDuration = () => {
    // Try different field name combinations for start/end times
    const startTime = historyRecord.started_at || historyRecord.created_at;
    const endTime = historyRecord.completed_at || historyRecord.created_at;
    
    // If we have duration_minutes field, use that
    if (historyRecord.duration_minutes) {
      const hours = Math.floor(historyRecord.duration_minutes / 60);
      const mins = historyRecord.duration_minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    
    // Otherwise calculate from timestamps
    if (!startTime || !endTime) return 'N/A';
    const minutes = differenceInMinutes(
      new Date(endTime),
      new Date(startTime)
    );
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const buildPdfData = () => ({
    simulationName: historyRecord.name,
    simulationDate: format(new Date(historyRecord.started_at || historyRecord.created_at || new Date()), 'PPP'),
    duration: calculateDuration(),
    studentActivities,
  });

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await generateStudentActivityPDF(buildPdfData());
    } catch (error) {
      secureLogger.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await generateStudentActivityPDFBlob(buildPdfData());
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after delay to allow the browser to load the PDF
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      secureLogger.error('Print PDF failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading debrief report...</p>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics();
  const filteredActivities = selectedStudent 
    ? studentActivities.filter(s => s.studentName === selectedStudent)
    : studentActivities;

  return (
    <div className="debrief-modal-root">
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto print:hidden">
        <div className="min-h-screen px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Modal Header - No Print */}
            <div className="bg-white rounded-t-xl shadow-lg p-6 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Clinical Simulation Debrief</h2>
                    <p className="text-sm text-gray-500">{historyRecord.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={isExporting}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isExporting ? 'Generating PDF...' : 'Print / View PDF'}</span>
                  </button>
                  <button
                    onClick={handleRegenerateFromDatabase}
                    disabled={isRegenerating}
                    title="Re-query live database and refresh this report"
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>{isRegenerating ? 'Refreshing...' : 'Refresh from DB'}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Printable Content */}
            <div id="debrief-content" className="bg-white shadow-lg print:shadow-none print-content">
              
              {/* Print Header - Only visible when printing */}
              <div className="hidden print:block p-8 border-b">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinical Simulation Debrief Report</h1>
                  <p className="text-gray-600">{historyRecord.name}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>

              {/* Simulation Overview */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900 uppercase tracking-wide">Duration</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{calculateDuration()}</p>
                    <p className="text-xs text-blue-700 mt-1">{format(new Date(historyRecord.started_at || ''), 'MMM dd, yyyy')}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-900 uppercase tracking-wide">Students</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{studentActivities.length}</p>
                    <p className="text-xs text-purple-700 mt-1 truncate" title={studentActivities.map(s => s.studentName).join(', ')}>
                      {studentActivities.length > 0 
                        ? studentActivities.map(s => s.studentName).join(', ')
                        : 'No participants'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-900 uppercase tracking-wide">Total Entries</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {studentActivities.reduce((sum, s) => sum + s.totalEntries, 0)}
                    </p>
                    <p className="text-xs text-green-700 mt-1">Clinical actions</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-900 uppercase tracking-wide">Avg/Student</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">{metrics.avgEntriesPerStudent}</p>
                    <p className="text-xs text-amber-700 mt-1">Entries per student</p>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-indigo-600" />
                  Performance Metrics
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Interventions */}
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Total Interventions</span>
                      <Activity className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalInterventions}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Vitals:</span>
                        <span className="ml-1 font-semibold text-gray-700">{metrics.totalVitals}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Meds:</span>
                        <span className="ml-1 font-semibold text-gray-700">{metrics.totalMeds}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Orders:</span>
                        <span className="ml-1 font-semibold text-gray-700">{metrics.totalOrders}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">I&O:</span>
                        <span className="ml-1 font-semibold text-gray-700">{metrics.totalIO}</span>
                      </div>
                    </div>
                  </div>

                  {/* BCMA Compliance */}
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">BCMA Compliance</span>
                      {metrics.bcmaCompliance >= 80 ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-baseline">
                      <p className="text-3xl font-bold text-gray-900">{metrics.bcmaCompliance}</p>
                      <span className="text-xl font-semibold text-gray-600 ml-1">%</span>
                    </div>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          metrics.bcmaCompliance >= 80 ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${metrics.bcmaCompliance}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {metrics.bcmaCompliance >= 80 ? 'Excellent compliance' : 'Needs improvement'}
                    </p>
                  </div>

                  {/* Documentation */}
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Documentation</span>
                      <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalNotes}</p>
                    <p className="text-xs text-gray-500 mt-3">
                      Patient & handover notes
                    </p>
                  </div>
                </div>

                {/* Activity Breakdown Chart */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Clinical Activity Breakdown</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Vital Signs', value: metrics.totalVitals, color: 'bg-blue-500' },
                      { label: 'Medications', value: metrics.totalMeds, color: 'bg-purple-500' },
                      { label: 'Orders Acknowledged', value: metrics.totalOrders, color: 'bg-pink-500' },
                      { label: 'Lab Orders', value: metrics.totalLabOrders, color: 'bg-green-500' },
                      { label: 'Lab Acknowledgements', value: metrics.totalLabAcks, color: 'bg-teal-500' },
                      { label: 'Documentation', value: metrics.totalNotes, color: 'bg-amber-500' },
                      { label: 'Intake & Output', value: metrics.totalIO, color: 'bg-cyan-500' },
                      { label: 'hacMap - Add Device', value: metrics.totalHacmapDevices, color: 'bg-emerald-500' },
                      { label: 'hacMap - Add Wound', value: metrics.totalHacmapWounds, color: 'bg-rose-500' },
                      { label: 'Device Assessments', value: metrics.totalDeviceAssessments, color: 'bg-indigo-500' },
                      { label: 'Wound Assessments', value: metrics.totalWoundAssessments, color: 'bg-fuchsia-500' },
                      { label: 'Bowel Assessments', value: metrics.totalBowelAssessments, color: 'bg-orange-500' }
                    ].map((item, idx) => {
                      const widthPercent = metrics.totalAllActivities > 0 
                        ? (item.value / metrics.totalAllActivities) * 100 
                        : 0;
                      return (
                        <div key={idx} className="flex items-center">
                          <span className="text-sm text-gray-600 w-48 flex-shrink-0">{item.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                            {item.value > 0 && (
                              <div 
                                className={`${item.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3`}
                                style={{ width: `${Math.max(widthPercent, 8)}%` }}
                              >
                                <span className="text-xs font-semibold text-white">{item.value}</span>
                              </div>
                            )}
                            {item.value === 0 && (
                              <span className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-semibold text-gray-400">0</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Student Filter - No Print */}
              <div className="p-6 border-b border-gray-200 print:hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Student</label>
                <select
                  value={selectedStudent || ''}
                  onChange={(e) => setSelectedStudent(e.target.value || null)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Students</option>
                  {studentActivities.map(student => (
                    <option key={student.studentName} value={student.studentName}>
                      {student.studentName} ({student.totalEntries} entries)
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Activities */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Detailed Activity Log</h3>
                
                {/* Screen view - filtered */}
                <div className="space-y-8 print:hidden">
                  {filteredActivities.map((student, index) => (
                    <StudentActivitySection key={index} student={student} />
                  ))}
                </div>
                
                {/* Print view - all students, all sections expanded */}
                <div className="hidden print:block space-y-8">
                  {studentActivities.map((student, index) => (
                    <StudentActivitySection key={`print-${index}`} student={student} forceExpanded={true} />
                  ))}
                </div>
              </div>

              {/* Instructor Notes Section */}
              <div className="p-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Instructor Notes & Feedback</h3>
                <div className="space-y-4">
                  {/* Instructor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructor Name
                    </label>
                    <input
                      type="text"
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                      placeholder="Enter instructor name..."
                      className="w-full px-4 py-2 border-2 border-yellow-300 bg-yellow-50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    />
                  </div>
                  
                  {/* Instructor Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes & Comments
                    </label>
                    <textarea
                      value={instructorNotes}
                      onChange={(e) => setInstructorNotes(e.target.value)}
                      placeholder="Enter notes about the simulation, student performance, areas for improvement, or other observations..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-yellow-300 bg-yellow-50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    hacCare® Clinical Simulation Platform - Confidential Student Performance Data
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default EnhancedDebriefModal;