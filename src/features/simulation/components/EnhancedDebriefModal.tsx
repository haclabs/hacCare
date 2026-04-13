/**
 * ===========================================================================
 * ENHANCED DEBRIEF REPORT MODAL
 * ===========================================================================
 * Beautiful, interactive debrief report with charts and metrics
 * Replaces PDF generation with responsive web view + print capability
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Clock, Users, Activity, TrendingUp, CheckCircle, AlertCircle, BarChart3, Award, Mail, RefreshCw } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { getStudentActivitiesBySimulation, type StudentActivity } from '../../../services/simulation/studentActivityService';
import { regenerateDebriefSnapshot } from '../../../services/simulation/simulationService';
import { generateStudentActivityPDF, generateStudentActivityPDFBlob, generateStudentActivityPDFForEmail } from '../../../utils/reactPdfGenerator';
import { sendDebriefEmail } from '../../../services/simulation/debriefEmailService';
import { EmailDebriefModal } from './EmailDebriefModal';
import type { Database } from '../../../types/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';

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
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    loadStudentActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRecord.id]);

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

  const deduplicateStudentActivities = (activities: StudentActivity[]): StudentActivity[] => {
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
    const startTime = historyRecord.started_at || historyRecord.starts_at || historyRecord.created_at;
    const endTime = historyRecord.completed_at || historyRecord.ends_at || historyRecord.updated_at;
    
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

  const handleEmailSend = async (emails: string[]) => {
    try {
      // Generate PDF for email using the same data as download/print
      const pdfData = await generateStudentActivityPDFForEmail(buildPdfData());

      // Send email
      const response = await sendDebriefEmail({
        historyRecordId: historyRecord.id,
        recipientEmails: emails,
        pdfBase64: pdfData.base64,
        pdfFilename: pdfData.filename,
      });

      return response;
    } catch (error) {
      secureLogger.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
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
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email Report</span>
                  </button>
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

      {/* Email Modal */}
      {showEmailModal && (
        <EmailDebriefModal
          onClose={() => setShowEmailModal(false)}
          onSend={handleEmailSend}
        />
      )}
    </div>
  );
};

// Student Activity Section Component
const StudentActivitySection: React.FC<{ student: StudentActivity; forceExpanded?: boolean }> = ({ student, forceExpanded = false }) => {
  // If forceExpanded, start with all sections expanded
  const sectionsData = [
    { key: 'vitals', title: 'Vital Signs', items: student.activities.vitals || [], color: 'blue', icon: '💓' },
    { key: 'medications', title: 'Medications (BCMA)', items: student.activities.medications || [], color: 'purple', icon: '💊' },
    { key: 'doctorsOrders', title: "Doctor's Orders", items: student.activities.doctorsOrders || [], color: 'pink', icon: '📋' },
    { key: 'labAcknowledgements', title: 'Lab Acknowledgements', items: student.activities.labAcknowledgements || [], color: 'teal', icon: '🧪' },
    { key: 'labOrders', title: 'Lab Orders', items: student.activities.labOrders || [], color: 'green', icon: '🔬' },
    { key: 'intakeOutput', title: 'Intake & Output', items: student.activities.intakeOutput || [], color: 'cyan', icon: '💧' },
    { key: 'patientNotes', title: 'Patient Notes', items: student.activities.patientNotes || [], color: 'yellow', icon: '📝' },
    { key: 'handoverNotes', title: 'Handover Notes', items: student.activities.handoverNotes || [], color: 'orange', icon: '🤝' },
    { key: 'advancedDirectives', title: 'Advanced Directives', items: student.activities.advancedDirectives || [], color: 'red', icon: '⚕️' },
    { key: 'hacmapDevices', title: 'hacMap - Add Device', items: student.activities.hacmapDevices || [], color: 'emerald', icon: '🔧' },
    { key: 'hacmapWounds', title: 'hacMap - Add Wound', items: student.activities.hacmapWounds || [], color: 'rose', icon: '🩹' },
    { key: 'deviceAssessments', title: 'Device Assessments', items: student.activities.deviceAssessments || [], color: 'indigo', icon: '🩺' },
    { key: 'woundAssessments', title: 'Wound Assessments', items: student.activities.woundAssessments || [], color: 'fuchsia', icon: '🔍' },
    { key: 'bowelAssessments', title: 'Bowel Assessments', items: student.activities.bowelAssessments || [], color: 'amber', icon: '📊' },
    { key: 'neuroAssessments', title: 'Neuro Assessments', items: student.activities.neuroAssessments || [], color: 'violet', icon: '🧠' },
    { key: 'bbitEntries', title: 'BBIT Chart', items: student.activities.bbitEntries || [], color: 'purple', icon: '🩸' },
    { key: 'newbornAssessments', title: 'Newborn Assessment', items: student.activities.newbornAssessments || [], color: 'cyan', icon: '👶' }
  ].filter(s => s.items.length > 0);
  
  const initialExpanded = forceExpanded 
    ? new Set(sectionsData.map(s => s.key))
    : new Set<string>();
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(initialExpanded);

  const toggleSection = (section: string) => {
    if (forceExpanded) return; // Don't allow toggling in print mode
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm student-section">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {student.studentName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">{student.studentName}</h4>
              <p className="text-gray-300 text-sm">{student.totalEntries} total clinical entries</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {sectionsData.slice(0, 5).map(s => (
              <div key={s.key} className="text-center">
                <div className="text-2xl">{s.icon}</div>
                <div className="text-white text-xs font-semibold">{s.items.length}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Sections */}
      <div className="divide-y divide-gray-200">
        {sectionsData.map(section => (
          <ActivitySection
            key={section.key}
            section={section}
            isExpanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
      </div>
    </div>
  );
};

// Activity Section Component
const ActivitySection: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  section: any;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ section, isExpanded, onToggle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700'
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors print:cursor-default print:hover:bg-transparent"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{section.icon}</span>
          <span className="font-semibold text-gray-900">{section.title}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[section.color as keyof typeof colorClasses]}`}>
            {section.items.length} {section.items.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform print:hidden ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-3 mt-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {section.items.map((item: any, idx: number) => (
              <ActivityItem key={idx} item={item} sectionKey={section.key} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Activity Item Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ActivityItem: React.FC<{ item: any; sectionKey: string }> = ({ item, sectionKey }) => {
  const [showAssessmentData, setShowAssessmentData] = useState(false);
  
  const formatItem = () => {
    switch (sectionKey) {
      case 'vitals':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.recorded_at), 'PPp')}</p>
            <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
              <span>BP: {item.blood_pressure_systolic}/{item.blood_pressure_diastolic}</span>
              <span>HR: {item.heart_rate} bpm</span>
              <span>RR: {item.respiratory_rate}/min</span>
              <span>Temp: {item.temperature}°C</span>
              <span>SpO₂: {item.oxygen_saturation}%</span>
              {item.pain_score !== null && <span>Pain: {item.pain_score}/10</span>}
            </div>
          </div>
        );
      case 'medications':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.timestamp), 'PPp')}</p>
            <p className="text-gray-900 mt-1">{item.medication_name} - {item.dosage} via {item.route}</p>
            <div className="mt-1 flex flex-col space-y-1">
              {item.barcode_scanned ? (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded inline-block w-fit">✓ BCMA Compliant</span>
              ) : (
                <>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded inline-block w-fit">
                    ⚠ {item.override_reason ? 'BCMA Override' : 'Manual Entry'}
                  </span>
                  {item.override_reason && (
                    <span className="text-xs text-amber-700 font-medium">Reason: {item.override_reason}</span>
                  )}
                </>
              )}
              {item.witness_name && (
                <span className="text-xs text-gray-600">Witnessed by: {item.witness_name}</span>
              )}
            </div>
            {item.notes && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-gray-700">
                <span className="font-semibold">Note:</span> {item.notes}
              </div>
            )}
          </div>
        );
      case 'doctorsOrders':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.acknowledged_at), 'PPp')}</p>
            <p className="text-gray-900 mt-1 font-medium">✓ ACKNOWLEDGED</p>
            <p className="text-gray-600 whitespace-pre-wrap">{item.order_text || item.order_type}</p>
          </div>
        );
      case 'intakeOutput':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.event_timestamp), 'PPp')}</p>
            <div className="mt-1 flex items-center space-x-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                item.direction === 'intake' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {item.direction === 'intake' ? '↓ INTAKE' : '↑ OUTPUT'}
              </span>
              <span className="text-gray-900 font-semibold">{item.amount_ml} mL</span>
              <span className="text-gray-600">{item.category}</span>
            </div>
          </div>
        );
      case 'labOrders':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.ordered_at ? format(new Date(item.ordered_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">{item.test_name}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`text-xs px-2 py-0.5 rounded ${
                item.priority === 'STAT' ? 'bg-red-100 text-red-700' :
                item.priority === 'URGENT' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.priority || 'ROUTINE'}
              </span>
              <span className="text-xs text-gray-600">{item.specimen_type}</span>
              <span className="text-xs text-gray-600">Status: {item.status}</span>
            </div>
          </div>
        );
      case 'labAcknowledgements':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.acknowledged_at ? format(new Date(item.acknowledged_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">✓ ACKNOWLEDGED: {item.test_name}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-gray-900 font-semibold">{item.result_value}</span>
              {item.abnormal_flag && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">⚠ ABNORMAL</span>
              )}
            </div>
            {item.note && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                <span className="font-semibold">Note:</span> {item.note}
              </div>
            )}
          </div>
        );
      case 'hacmapDevices':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🔧 {item.type?.toUpperCase().replace(/-/g, ' ')}</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.placement_date && (
                <div><span className="font-semibold">Placement Date:</span> {item.placement_date}</div>
              )}
              {item.inserted_by && (
                <div><span className="font-semibold">Inserted By:</span> {item.inserted_by}</div>
              )}
              {item.location && (
                <div><span className="font-semibold">Location:</span> {item.location}</div>
              )}
              {item.tube_number && (
                <div><span className="font-semibold">Tube #:</span> {item.tube_number}</div>
              )}
              {item.tube_size_fr && (
                <div><span className="font-semibold">Size:</span> {item.tube_size_fr} Fr</div>
              )}
              {item.orientation && item.orientation.length > 0 && (
                <div><span className="font-semibold">Orientation:</span> {item.orientation.join(', ')}</div>
              )}
              {item.number_of_sutures_placed && (
                <div><span className="font-semibold">Sutures:</span> {item.number_of_sutures_placed}</div>
              )}
              {item.reservoir_type && (
                <div><span className="font-semibold">Reservoir:</span> {item.reservoir_type} {item.reservoir_size_ml ? `(${item.reservoir_size_ml} mL)` : ''}</div>
              )}
              {item.securement_method && item.securement_method.length > 0 && (
                <div><span className="font-semibold">Securement:</span> {item.securement_method.join(', ')}</div>
              )}
              {item.patient_tolerance && (
                <div><span className="font-semibold">Patient Tolerance:</span> {item.patient_tolerance}</div>
              )}
              {item.site && (
                <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="font-semibold">Notes:</span> {item.site}
                </div>
              )}
            </div>
          </div>
        );
      case 'hacmapWounds':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🩹 {item.wound_type?.toUpperCase().replace(/-/g, ' ')}</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.location && (
                <div><span className="font-semibold">Location:</span> {item.location}</div>
              )}
              {(item.wound_length_cm || item.wound_width_cm || item.wound_depth_cm) && (
                <div>
                  <span className="font-semibold">Measurements:</span> L: {item.wound_length_cm || 'N/A'} × W: {item.wound_width_cm || 'N/A'} × D: {item.wound_depth_cm || 'N/A'} cm
                </div>
              )}
              {item.wound_stage && (
                <div><span className="font-semibold">Stage:</span> {item.wound_stage}</div>
              )}
              {item.wound_appearance && (
                <div><span className="font-semibold">Appearance:</span> {Array.isArray(item.wound_appearance) ? item.wound_appearance.join(', ') : item.wound_appearance}</div>
              )}
              {item.drainage_type && item.drainage_type.length > 0 && (
                <div><span className="font-semibold">Drainage Type:</span> {Array.isArray(item.drainage_type) ? item.drainage_type.join(', ') : item.drainage_type}</div>
              )}
              {item.drainage_amount && (
                <div><span className="font-semibold">Drainage Amount:</span> {item.drainage_amount}</div>
              )}
              {item.wound_description && (
                <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded">
                  <span className="font-semibold">Description:</span> {item.wound_description}
                </div>
              )}
            </div>
          </div>
        );
      case 'deviceAssessments':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.assessed_at ? format(new Date(item.assessed_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🩺 {item.device_type?.toUpperCase().replace(/-/g, ' ')} ASSESSMENT</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.status && <span>Status: {item.status}</span>}
              {item.output_amount_ml && <span>Output: {item.output_amount_ml} mL</span>}
              {item.notes && <span className="col-span-2">Notes: {item.notes}</span>}
            </div>
            {item.assessment_data && Object.keys(item.assessment_data).length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowAssessmentData(!showAssessmentData)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 print:hidden"
                >
                  <span>+ {Object.keys(item.assessment_data).length} detailed assessment fields</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showAssessmentData ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAssessmentData && (
                  <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {Object.entries(item.assessment_data).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium text-indigo-900 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-indigo-700 text-right ml-2">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                             Array.isArray(value) ? value.join(', ') : 
                             value?.toString() || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Print view - always show fields */}
                <div className="hidden print:block mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {Object.entries(item.assessment_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-indigo-900 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-indigo-700 text-right ml-2">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                           Array.isArray(value) ? value.join(', ') : 
                           value?.toString() || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'woundAssessments':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.assessed_at ? format(new Date(item.assessed_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🔍 WOUND ASSESSMENT</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.site_condition && (
                <div><span className="font-semibold">Surrounding Skin:</span> {Array.isArray(item.site_condition) ? item.site_condition.join(', ') : item.site_condition}</div>
              )}
              {item.pain_level !== null && (
                <div><span className="font-semibold">Pain Level:</span> {item.pain_level}/10</div>
              )}
              {item.wound_appearance && (
                <div><span className="font-semibold">Wound Appearance:</span> {Array.isArray(item.wound_appearance) ? item.wound_appearance.join(', ') : item.wound_appearance}</div>
              )}
              {item.drainage_type && (
                <div><span className="font-semibold">Drainage Type:</span> {Array.isArray(item.drainage_type) ? item.drainage_type.join(', ') : item.drainage_type}</div>
              )}
              {item.drainage_amount && (
                <div><span className="font-semibold">Drainage Amount:</span> {item.drainage_amount}</div>
              )}
              {item.treatment_applied && (
                <div><span className="font-semibold">Treatment Applied:</span> {item.treatment_applied}</div>
              )}
              {item.dressing_type && (
                <div><span className="font-semibold">Dressing Type:</span> {item.dressing_type}</div>
              )}
              {item.notes && (
                <div className="mt-1 p-2 bg-fuchsia-50 border border-fuchsia-200 rounded">
                  <span className="font-semibold">Assessment Notes:</span> {item.notes}
                </div>
              )}
            </div>
          </div>
        );
      case 'handoverNotes':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">
              {item.entry_type === 'acknowledged' ? 'Note from:' : 'Created:'}{' '}
              {item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}
            </p>
            <div className="mt-2 space-y-2">
              {item.nursing_notes && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Nursing Notes:</span>
                  <p className="text-gray-900 whitespace-pre-wrap">{item.nursing_notes}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Situation:</span>
                <p className="text-gray-900">{item.situation}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Background:</span>
                <p className="text-gray-900">{item.background}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Assessment:</span>
                <p className="text-gray-900">{item.assessment}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Recommendations:</span>
                <p className="text-gray-900">{item.recommendations}</p>
              </div>
              {item.student_name && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    ✓ Acknowledged by: {item.student_name}
                    {(item.acknowledged_at || item.updated_at) && (
                      <> · {format(new Date((item.acknowledged_at || item.updated_at)!), 'PPp')}</>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      case 'advancedDirectives':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">⚕️ ADVANCED DIRECTIVE UPDATED</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.dnr_status && <span>DNR Status: {item.dnr_status}</span>}
              {item.living_will_status && <span>Living Will: {item.living_will_status}</span>}
              {item.healthcare_proxy_name && <span>Healthcare Proxy: {item.healthcare_proxy_name}</span>}
              {item.organ_donation_status !== null && <span>Organ Donation: {item.organ_donation_status ? 'Yes' : 'No'}</span>}
              {item.special_instructions && <span className="col-span-2">Instructions: {item.special_instructions}</span>}
            </div>
          </div>
        );
      case 'neuroAssessments': {
        const gcsTot = (item.gcs_eye ?? 0) + (item.gcs_verbal ?? 0) + (item.gcs_motor ?? 0);
        const aOrientCount = [item.oriented_person, item.oriented_place, item.oriented_time].filter(Boolean).length;
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.recorded_at ? format(new Date(item.recorded_at), 'PPp') : 'N/A'}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
              {item.level_of_consciousness && <span><span className="font-semibold">LOC:</span> {item.level_of_consciousness} {item.level_of_consciousness === 'Alert' ? `(A×${aOrientCount})` : ''}</span>}
              {(item.gcs_eye || item.gcs_verbal || item.gcs_motor) ? <span><span className="font-semibold">GCS:</span> E{item.gcs_eye ?? '?'}+V{item.gcs_verbal ?? '?'}+M{item.gcs_motor ?? '?'}={gcsTot || '?'}</span> : null}
              {item.pupils_equal !== null && <span><span className="font-semibold">Pupils equal:</span> {item.pupils_equal ? 'Yes' : 'No'}</span>}
              {item.pupil_left_size && <span><span className="font-semibold">L pupil:</span> {item.pupil_left_size}mm {item.pupil_left_reaction}</span>}
              {item.pupil_right_size && <span><span className="font-semibold">R pupil:</span> {item.pupil_right_size}mm {item.pupil_right_reaction}</span>}
              {item.sensation && <span><span className="font-semibold">Sensation:</span> {item.sensation}</span>}
              {item.speech && <span><span className="font-semibold">Speech:</span> {item.speech}</span>}
              {item.pain_score !== null && <span><span className="font-semibold">Pain:</span> {item.pain_score}/10</span>}
            </div>
            {(item.strength_right_arm !== null || item.strength_left_arm !== null) && (
              <div className="mt-1 text-xs text-gray-600">
                <span className="font-semibold">Strength: </span>
                RA:{item.strength_right_arm ?? '?'} LA:{item.strength_left_arm ?? '?'} RL:{item.strength_right_leg ?? '?'} LL:{item.strength_left_leg ?? '?'}
              </div>
            )}
          </div>
        );
      }
      case 'bbitEntries': {
        const timeStr = item.time_label?.trim() || (item.recorded_at ? format(new Date(item.recorded_at), 'HH:mm') : 'N/A');
        const dateStr = item.recorded_at ? format(new Date(item.recorded_at), 'MMM d') : '';
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{timeStr} {dateStr && <span className="text-gray-500 font-normal">— {dateStr}</span>}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
              {item.glucose_value != null && (
                <span><span className="font-semibold">CBG:</span> {Number(item.glucose_value).toFixed(1)} mmol/L</span>
              )}
              {item.carb_intake && (
                <span><span className="font-semibold">Carbs:</span> {item.carb_intake === 'full' ? 'Full meal' : item.carb_intake === 'partial' ? 'Partial' : 'None'}</span>
              )}
              {item.basal_name && (
                <span><span className="font-semibold">Basal:</span> {item.basal_name} {item.basal_dose != null ? `${item.basal_dose}u` : ''} — {item.basal_status === 'given' ? '✓ Given' : '⊘ Held'}</span>
              )}
              {item.bolus_meal && (
                <span><span className="font-semibold">Bolus ({item.bolus_meal}):</span> {item.bolus_dose != null ? `${item.bolus_dose}u` : '—'} — {item.bolus_status === 'given' ? '✓ Given' : '⊘ Not given'}</span>
              )}
              {item.correction_status === 'given' && item.correction_dose != null && (
                <span><span className="font-semibold">Correction:</span> {item.correction_dose}u given</span>
              )}
            </div>
          </div>
        );
      }
      case 'newbornAssessments': {
        const dateStr = item.recorded_at ? format(new Date(item.recorded_at), 'PPp') : 'N/A';
        const apgarParts = [
          item.apgar_1min != null && `1 min: ${item.apgar_1min}`,
          item.apgar_5min != null && `5 min: ${item.apgar_5min}`,
          item.apgar_10min != null && `10 min: ${item.apgar_10min}`,
        ].filter(Boolean).join(' · ');

        // Map system keys to display labels (in assessment order)
        const systemLabels: Record<string, string> = {
          head: 'Head', neck: 'Neck', chest: 'Chest',
          cardiovascular: 'Cardiovascular', respiratory: 'Respiratory',
          abdomen: 'Abdomen', skeletal: 'Skeletal', genitalia: 'Genitalia',
          skin: 'Skin', neuromuscular: 'Neuromuscular',
        };

        // Process nested physical_observations structure (obs.system.field_normal / field_variance)
        const obs = (item.physical_observations ?? {}) as Record<string, Record<string, unknown>>;
        const systemSummaries = Object.entries(systemLabels)
          .map(([key, label]) => {
            const sysObs = obs[key];
            if (!sysObs || typeof sysObs !== 'object') return null;
            const normals: string[] = [];
            const variances: string[] = [];
            const others: string[] = [];
            Object.entries(sysObs).forEach(([field, val]) => {
              if (field.endsWith('_normal') && Array.isArray(val) && val.length > 0) {
                normals.push(...(val as string[]));
              } else if (field.endsWith('_variance') && Array.isArray(val) && val.length > 0) {
                variances.push(...(val as string[]));
              } else if (field.endsWith('_variance_specify') && typeof val === 'string' && val.trim()) {
                variances.push(val.trim());
              } else if (field.endsWith('_other') && typeof val === 'string' && val.trim()) {
                others.push(val.trim());
              }
            });
            if (normals.length === 0 && variances.length === 0 && others.length === 0) return null;
            return { label, normals, variances, others };
          })
          .filter(Boolean) as { label: string; normals: string[]; variances: string[]; others: string[] }[];

        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{dateStr}</p>

            {/* Birth Measurements */}
            {(item.weight_grams || item.length_cm || item.head_circumference_cm || item.time_of_birth) && (
              <div className="mt-1 text-xs text-gray-600">
                <span className="font-semibold">Measurements: </span>
                {item.time_of_birth && <span>TOB: {item.time_of_birth} </span>}
                {item.weight_grams && <span>· Weight: {item.weight_grams}g </span>}
                {item.length_cm && <span>· Length: {item.length_cm}cm </span>}
                {item.head_circumference_cm && <span>· HC: {item.head_circumference_cm}cm</span>}
              </div>
            )}

            {/* APGAR scores */}
            {apgarParts && (
              <p className="mt-1 text-xs text-gray-600">
                <span className="font-semibold">APGAR: </span>{apgarParts}
              </p>
            )}

            {/* Medications */}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {item.vitamin_k_declined ? (
                <span className="text-amber-600 font-medium">Vitamin K: Declined</span>
              ) : item.vitamin_k_given ? (
                <span className="text-gray-600">
                  Vitamin K: ✓ Given
                  {item.vitamin_k_dose ? ` (${item.vitamin_k_dose})` : ''}
                  {item.vitamin_k_site ? ` — ${item.vitamin_k_site}` : ''}
                  {item.vitamin_k_time ? ` at ${item.vitamin_k_time}` : ''}
                </span>
              ) : null}
              {item.erythromycin_given && (
                <span className="text-gray-600">
                  Erythromycin: ✓ Given{item.erythromycin_time ? ` at ${item.erythromycin_time}` : ''}
                </span>
              )}
            </div>

            {/* Physical Assessment by body system */}
            {systemSummaries.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">Physical Assessment:</p>
                <div className="space-y-0.5">
                  {systemSummaries.map(({ label, normals, variances, others }) => (
                    <div key={label} className="text-xs leading-relaxed">
                      <span className="font-medium text-gray-600">{label}: </span>
                      {normals.length > 0 && (
                        <span className="text-green-700">{normals.join(', ')}</span>
                      )}
                      {variances.length > 0 && (
                        <span className="text-amber-700">
                          {normals.length > 0 ? ' · ' : ''}
                          <span className="font-medium">Variance: </span>
                          {variances.join(', ')}
                        </span>
                      )}
                      {others.length > 0 && (
                        <span className="text-gray-500"> ({others.join('; ')})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.completed_by && (
              <p className="mt-1 text-xs text-gray-400">Assessed by: {item.completed_by}</p>
            )}
          </div>
        );
      }
      default: {
        // Safely get timestamp with fallback chain and null check
        const timestamp = item.created_at || item.recorded_at || item.timestamp || item.event_timestamp || item.ordered_at || item.acknowledged_at;
        const dateStr = timestamp && !isNaN(new Date(timestamp).getTime()) 
          ? format(new Date(timestamp), 'PPp')
          : 'N/A';
        
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{dateStr}</p>
            <p className="text-gray-600 mt-1">{JSON.stringify(item).substring(0, 100)}...</p>
          </div>
        );
      }
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors activity-item">
      {formatItem()}
    </div>
  );
};

export default EnhancedDebriefModal;
