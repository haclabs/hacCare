/**
 * ===========================================================================
 * ENHANCED DEBRIEF REPORT MODAL
 * ===========================================================================
 * Beautiful, interactive debrief report with charts and metrics
 * Replaces PDF generation with responsive web view + print capability
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, Printer, Clock, Users, Activity, TrendingUp, CheckCircle, AlertCircle, BarChart3, Award } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { getStudentActivitiesBySimulation, type StudentActivity } from '../../../services/simulation/studentActivityService';
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

  useEffect(() => {
    loadStudentActivities();
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

      student.activities.medications?.forEach((med: any) => {
        bcmaTotal++;
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
    if (!historyRecord.started_at || !historyRecord.completed_at) return 'N/A';
    const minutes = differenceInMinutes(
      new Date(historyRecord.completed_at),
      new Date(historyRecord.started_at)
    );
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handlePrint = () => {
    window.print();
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
    <>
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
                    onClick={handlePrint}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Report</span>
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
            <div className="bg-white shadow-lg print:shadow-none">
              
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
                    <p className="text-xs text-purple-700 mt-1">Participants</p>
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
                
                <div className="space-y-8">
                  {filteredActivities.map((student, index) => (
                    <StudentActivitySection key={index} student={student} />
                  ))}
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </>
  );
};

// Student Activity Section Component
const StudentActivitySection: React.FC<{ student: StudentActivity }> = ({ student }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
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
    { key: 'bowelAssessments', title: 'Bowel Assessments', items: student.activities.bowelAssessments || [], color: 'amber', icon: '📊' }
  ];

  const sectionsWithData = sections.filter(s => s.items.length > 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
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
            {sectionsWithData.slice(0, 5).map(s => (
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
        {sectionsWithData.map(section => (
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
            <div className="mt-1 flex items-center space-x-2">
              {item.barcode_scanned ? (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">✓ Barcode Scanned</span>
              ) : (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">⚠ Manual Entry</span>
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
      default:
        return (
          <div className="text-sm">
            <p className="font-medium text-gray-700">{format(new Date(item.created_at || item.recorded_at || item.timestamp), 'PPp')}</p>
            <p className="text-gray-600 mt-1">{JSON.stringify(item).substring(0, 100)}...</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      {formatItem()}
    </div>
  );
};

export default EnhancedDebriefModal;
