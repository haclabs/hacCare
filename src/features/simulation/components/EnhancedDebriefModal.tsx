/**
 * ===========================================================================
 * ENHANCED DEBRIEF REPORT MODAL
 * ===========================================================================
 * Beautiful, interactive debrief report with charts and metrics
 * Replaces PDF generation with responsive web view + print capability
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Clock, Users, Activity, TrendingUp, CheckCircle, AlertCircle, BarChart3, Award } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { getStudentActivitiesBySimulation, type StudentActivity } from '../../../services/simulation/studentActivityService';
import { exportDebriefToPdf } from '../../../services/export/debriefPdfExport';
import type { Database } from '../../../types/supabase';

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
  bcmaCompliance: number;
  avgEntriesPerStudent: number;
  totalInterventions: number;
}

const EnhancedDebriefModal: React.FC<EnhancedDebriefModalProps> = ({ historyRecord, onClose }) => {
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [instructorName, setInstructorName] = useState('');
  const [instructorNotes, setInstructorNotes] = useState('');

  useEffect(() => {
    loadStudentActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRecord.id]);

  const loadStudentActivities = async () => {
    try {
      setLoading(true);
      
      let activities: StudentActivity[];
      
      if (historyRecord.student_activities && Array.isArray(historyRecord.student_activities)) {
        activities = historyRecord.student_activities as StudentActivity[];
      } else {
        activities = await getStudentActivitiesBySimulation(historyRecord.id);
      }
      
      const deduped = deduplicateStudentActivities(activities);
      setStudentActivities(deduped);
    } catch (error) {
      console.error('Failed to load student activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const deduplicateStudentActivities = (activities: StudentActivity[]): StudentActivity[] => {
    const studentMap = new Map<string, StudentActivity>();
    
    activities.forEach((activity) => {
      const normalizedName = activity.studentName.trim();
      const existing = studentMap.get(normalizedName);
      
      if (existing) {
        existing.activities.vitals.push(...activity.activities.vitals);
        existing.activities.medications.push(...activity.activities.medications);
        existing.activities.labOrders.push(...activity.activities.labOrders);
        existing.activities.labAcknowledgements.push(...activity.activities.labAcknowledgements);
        existing.activities.doctorsOrders.push(...activity.activities.doctorsOrders);
        existing.activities.patientNotes.push(...activity.activities.patientNotes);
        existing.activities.handoverNotes.push(...activity.activities.handoverNotes);
        existing.activities.hacmapDevices.push(...activity.activities.hacmapDevices);
        existing.activities.hacmapWounds.push(...activity.activities.hacmapWounds);
        existing.activities.deviceAssessments.push(...activity.activities.deviceAssessments);
        existing.activities.woundAssessments.push(...activity.activities.woundAssessments);
        existing.activities.bowelAssessments.push(...activity.activities.bowelAssessments);
        existing.activities.intakeOutput.push(...activity.activities.intakeOutput);
        existing.totalEntries += activity.totalEntries;
      } else {
        const cloned = JSON.parse(JSON.stringify(activity));
        cloned.studentName = normalizedName;
        studentMap.set(normalizedName, cloned);
      }
    });
    
    return Array.from(studentMap.values());
  };

  const calculateMetrics = (): Metrics => {
    let totalVitals = 0, totalMeds = 0, totalOrders = 0, totalNotes = 0, totalIO = 0;
    let bcmaScanned = 0, bcmaTotal = 0;

    studentActivities.forEach(student => {
      totalVitals += student.activities.vitals?.length || 0;
      totalMeds += student.activities.medications?.length || 0;
      totalOrders += student.activities.doctorsOrders?.length || 0;
      totalNotes += (student.activities.patientNotes?.length || 0) + (student.activities.handoverNotes?.length || 0);
      totalIO += student.activities.intakeOutput?.length || 0;

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

    return {
      totalVitals,
      totalMeds,
      totalOrders,
      totalNotes,
      totalIO,
      bcmaCompliance,
      avgEntriesPerStudent,
      totalInterventions: totalVitals + totalMeds + totalOrders + totalIO
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

  const handleExportPdf = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await exportDebriefToPdf('debrief-content', {
        filename: `${historyRecord.name.replace(/[^a-z0-9]/gi, '_')}_Debrief_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        title: `${historyRecord.name} - Clinical Simulation Debrief`,
        quality: 2
      });
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the printable content - clone it to manipulate
    const printContent = document.querySelector('.print-content');
    if (!printContent) return;
    
    const clonedContent = printContent.cloneNode(true) as HTMLElement;
    
    // Remove the student filter section
    const filterSection = clonedContent.querySelector('.print\\:hidden');
    if (filterSection) {
      filterSection.remove();
    }
    
    // Force all sections to be expanded by removing collapse logic
    const studentSections = clonedContent.querySelectorAll('.student-section');
    studentSections.forEach(section => {
      // Find all activity sections and force them to be expanded
      const activitySections = section.querySelectorAll('[class*="space-y-3"]');
      activitySections.forEach(activitySection => {
        const parent = activitySection.parentElement;
        if (parent) {
          parent.style.display = 'block';
        }
      });
    });

    // Write the content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clinical Simulation Debrief Report - ${historyRecord.name}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.5;
              color: #1f2937;
            }
            
            @page {
              size: letter;
              margin: 0.5in;
            }
            
            /* Preserve all colors */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* Import Tailwind-like utilities */
            .bg-white { background-color: white; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-800 { background-color: #1f2937; }
            .bg-gray-900 { background-color: #111827; }
            
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-blue-100 { background-color: #dbeafe; }
            .bg-blue-500 { background-color: #3b82f6; }
            .bg-purple-50 { background-color: #faf5ff; }
            .bg-purple-100 { background-color: #f3e8ff; }
            .bg-green-50 { background-color: #f0fdf4; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-green-500 { background-color: #22c55e; }
            .bg-amber-50 { background-color: #fffbeb; }
            .bg-amber-100 { background-color: #fef3c7; }
            .bg-red-100 { background-color: #fee2e2; }
            .bg-orange-100 { background-color: #ffedd5; }
            
            .text-white { color: white; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-700 { color: #1d4ed8; }
            .text-blue-900 { color: #1e3a8a; }
            .text-purple-600 { color: #9333ea; }
            .text-purple-700 { color: #7e22ce; }
            .text-purple-900 { color: #581c87; }
            .text-green-600 { color: #16a34a; }
            .text-green-700 { color: #15803d; }
            .text-green-900 { color: #14532d; }
            .text-amber-600 { color: #d97706; }
            .text-amber-700 { color: #b45309; }
            .text-amber-900 { color: #78350f; }
            .text-red-700 { color: #b91c1c; }
            
            .border { border-width: 1px; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-t { border-top-width: 1px; }
            .border-b { border-bottom-width: 1px; }
            
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-xl { border-radius: 0.75rem; }
            .rounded-full { border-radius: 9999px; }
            
            .p-2 { padding: 0.5rem; }
            .p-4 { padding: 1rem; }
            .p-5 { padding: 1.25rem; }
            .p-6 { padding: 1.5rem; }
            .p-8 { padding: 2rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
            
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-3 { margin-top: 0.75rem; }
            .ml-1 { margin-left: 0.25rem; }
            .mr-2 { margin-right: 0.5rem; }
            
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .gap-4 { gap: 1rem; }
            .gap-6 { gap: 1.5rem; }
            .gap-8 { gap: 2rem; }
            
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .space-x-2 > * + * { margin-left: 0.5rem; }
            .space-x-3 > * + * { margin-left: 0.75rem; }
            .space-x-4 > * + * { margin-left: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-3 > * + * { margin-top: 0.75rem; }
            .space-y-8 > * + * { margin-top: 2rem; }
            
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            
            .uppercase { text-transform: uppercase; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            
            .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
            
            .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
            .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
            .from-blue-50 { --tw-gradient-from: #eff6ff; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(239 246 255 / 0)); }
            .to-blue-100 { --tw-gradient-to: #dbeafe; }
            .from-purple-50 { --tw-gradient-from: #faf5ff; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(250 245 255 / 0)); }
            .to-purple-100 { --tw-gradient-to: #f3e8ff; }
            .from-green-50 { --tw-gradient-from: #f0fdf4; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(240 253 244 / 0)); }
            .to-green-100 { --tw-gradient-to: #dcfce7; }
            .from-amber-50 { --tw-gradient-from: #fffbeb; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(255 251 235 / 0)); }
            .to-amber-100 { --tw-gradient-to: #fef3c7; }
            .from-gray-50 { --tw-gradient-from: #f9fafb; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(249 250 251 / 0)); }
            .from-gray-800 { --tw-gradient-from: #1f2937; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(31 41 55 / 0)); }
            .to-gray-900 { --tw-gradient-to: #111827; }
            
            /* Page breaks */
            .student-section {
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 1rem;
            }
            
            .activity-item {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Specific layout fixes */
            .w-12 { width: 3rem; }
            .h-12 { height: 3rem; }
            .w-10 { width: 2.5rem; }
            .h-10 { height: 2.5rem; }
            .w-5 { width: 1.25rem; }
            .h-5 { height: 1.25rem; }
            .w-4 { width: 1rem; }
            .h-4 { height: 1rem; }
            
            .text-center { text-align: center; }
            .leading-relaxed { line-height: 1.625; }
            
            .overflow-hidden { overflow: hidden; }
            .col-span-2 { grid-column: span 2 / span 2; }
            
            /* Force all activity sections to be visible */
            .space-y-3 { display: block !important; }
          </style>
          <script>
            // Force expand all sections when document loads
            window.onload = function() {
              // Remove all hidden sections
              document.querySelectorAll('[style*="display: none"]').forEach(el => {
                el.style.display = 'block';
              });
              
              // Ensure all activity items are visible
              document.querySelectorAll('.space-y-3').forEach(section => {
                section.style.display = 'block';
                section.style.visibility = 'visible';
                if (section.parentElement) {
                  section.parentElement.style.display = 'block';
                }
              });
            };
          </script>
        </head>
        <body>
          ${clonedContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
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
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
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
                      { label: 'Vital Signs', value: metrics.totalVitals, color: 'bg-blue-500', max: metrics.totalInterventions },
                      { label: 'Medications', value: metrics.totalMeds, color: 'bg-purple-500', max: metrics.totalInterventions },
                      { label: 'Orders Acknowledged', value: metrics.totalOrders, color: 'bg-pink-500', max: metrics.totalInterventions },
                      { label: 'Documentation', value: metrics.totalNotes, color: 'bg-amber-500', max: metrics.totalInterventions },
                      { label: 'Intake & Output', value: metrics.totalIO, color: 'bg-cyan-500', max: metrics.totalInterventions }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center">
                        <span className="text-sm text-gray-600 w-40">{item.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                          <div 
                            className={`${item.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3`}
                            style={{ width: `${(item.value / item.max) * 100}%` }}
                          >
                            <span className="text-xs font-semibold text-white">{item.value}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
    { key: 'hacmapDevices', title: 'HAC Map Devices', items: student.activities.hacmapDevices || [], color: 'emerald', icon: '🔧' },
    { key: 'hacmapWounds', title: 'HAC Map Wounds', items: student.activities.hacmapWounds || [], color: 'rose', icon: '🩹' },
    { key: 'deviceAssessments', title: 'Device Assessments', items: student.activities.deviceAssessments || [], color: 'indigo', icon: '🩺' },
    { key: 'woundAssessments', title: 'Wound Assessments', items: student.activities.woundAssessments || [], color: 'fuchsia', icon: '🔍' },
    { key: 'bowelAssessments', title: 'Bowel Assessments', items: student.activities.bowelAssessments || [], color: 'amber', icon: '📊' }
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
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700'
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
          </div>
        );
      case 'doctorsOrders':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.acknowledged_at), 'PPp')}</p>
            <p className="text-gray-900 mt-1 font-medium">✓ ACKNOWLEDGED</p>
            <p className="text-gray-600">{item.order_text || item.order_type}</p>
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
          </div>
        );
      case 'hacmapDevices':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">{item.type?.toUpperCase().replace(/-/g, ' ')}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.placement_date && <span>Placed: {item.placement_date}</span>}
              {item.inserted_by && <span>By: {item.inserted_by}</span>}
              {item.location && <span>Location: {item.location}</span>}
              {item.tube_size_fr && <span>Size: {item.tube_size_fr} Fr</span>}
              {item.reservoir_type && <span>Reservoir: {item.reservoir_type}</span>}
              {item.orientation && item.orientation.length > 0 && (
                <span>Orientation: {item.orientation.join(', ')}</span>
              )}
            </div>
          </div>
        );
      case 'hacmapWounds':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">{item.wound_type?.toUpperCase().replace(/-/g, ' ')}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.location && <span>Location: {item.location}</span>}
              {item.wound_length_cm && item.wound_width_cm && (
                <span>Size: {item.wound_length_cm} × {item.wound_width_cm} cm</span>
              )}
              {item.wound_depth_cm && <span>Depth: {item.wound_depth_cm} cm</span>}
              {item.wound_stage && <span>Stage: {item.wound_stage}</span>}
              {item.drainage_amount && <span>Drainage: {item.drainage_amount}</span>}
              {item.wound_description && <span className="col-span-2">{item.wound_description}</span>}
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
              {item.assessment_data && Object.keys(item.assessment_data).length > 0 && (
                <span className="col-span-2 text-indigo-600">+ {Object.keys(item.assessment_data).length} detailed assessment fields</span>
              )}
            </div>
          </div>
        );
      case 'woundAssessments':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.assessed_at ? format(new Date(item.assessed_at), 'PPp') : 'N/A'}</p>
            <p className="text-gray-900 mt-1 font-medium">🔍 WOUND ASSESSMENT</p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-600">
              {item.site_condition && <span>Site: {item.site_condition}</span>}
              {item.pain_level !== null && <span>Pain: {item.pain_level}/10</span>}
              {item.wound_appearance && <span>Appearance: {item.wound_appearance}</span>}
              {item.drainage_type && <span>Drainage: {item.drainage_type}</span>}
              {item.drainage_amount && <span>Amount: {item.drainage_amount}</span>}
              {item.treatment_applied && <span>Treatment: {item.treatment_applied}</span>}
              {item.dressing_type && <span>Dressing: {item.dressing_type}</span>}
              {item.notes && <span className="col-span-2">Notes: {item.notes}</span>}
            </div>
          </div>
        );
      case 'handoverNotes':
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{item.created_at ? format(new Date(item.created_at), 'PPp') : 'N/A'}</p>
            <div className="mt-2 space-y-2">
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
                <span className="text-xs font-semibold text-gray-500 uppercase">Recommendation:</span>
                <p className="text-gray-900">{item.recommendation}</p>
              </div>
              {item.student_name && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">✓ Acknowledged by: {item.student_name}</span>
                </div>
              )}
            </div>
          </div>
        );
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
