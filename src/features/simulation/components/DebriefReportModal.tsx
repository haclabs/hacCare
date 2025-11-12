/**
 * ===========================================================================
 * DEBRIEF REPORT MODAL
 * ===========================================================================
 * Student-by-student activity breakdown for grading and assessment
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Clock, User, Activity, FileDown } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { getStudentActivitiesBySimulation, type StudentActivity } from '../../../services/simulation/studentActivityService';
import type { Database } from '../../../types/supabase';
import { generateStudentActivityPDF } from '../../../utils/pdfGenerator';

// Extended type to include student_activities snapshot
type HistoryRecordWithActivities = Database['public']['Tables']['simulation_history']['Row'] & {
  student_activities?: StudentActivity[] | null;
};

interface DebriefReportModalProps {
  historyRecord: HistoryRecordWithActivities;
  onClose: () => void;
}

const DebriefReportModal: React.FC<DebriefReportModalProps> = ({ historyRecord, onClose }) => {
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRecord.id]);

  const loadStudentActivities = async () => {
    try {
      setLoading(true);
      
      // Check if history record has stored activities snapshot
      if (historyRecord.student_activities && Array.isArray(historyRecord.student_activities)) {
        console.log('📸 Using stored activity snapshot');
        setStudentActivities(historyRecord.student_activities as StudentActivity[]);
      } else {
        // Fallback: query activities (for older history records)
        console.log('🔍 Querying activities (pre-snapshot record)');
        const activities = await getStudentActivitiesBySimulation(historyRecord.id);
        setStudentActivities(activities);
      }
    } catch (error) {
      console.error('Error loading student activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    generateStudentActivityPDF({
      simulationName: historyRecord.name,
      simulationDate: format(new Date(historyRecord.started_at), 'PPP'),
      duration: calculateDuration(),
      studentActivities: studentActivities,
    });
  };

  const handleGenerateStudentPDF = (studentName: string) => {
    generateStudentActivityPDF(
      {
        simulationName: historyRecord.name,
        simulationDate: format(new Date(historyRecord.started_at), 'PPP'),
        duration: calculateDuration(),
        studentActivities: studentActivities,
      },
      studentName
    );
  };

  const calculateDuration = () => {
    // Use ended_at if available, otherwise fall back to completed_at
    const endTime = historyRecord.ended_at || historyRecord.completed_at;
    if (!endTime || !historyRecord.started_at) return 'N/A';
    
    const start = new Date(historyRecord.started_at);
    const end = new Date(endTime);
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Student Activity Report
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {historyRecord.name} • {format(new Date(historyRecord.started_at), 'PPP')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePDF}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Download PDF Report"
            >
              <Download className="h-5 w-5 text-slate-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold">{calculateDuration()}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Students</span>
              </div>
              <p className="text-2xl font-bold">{studentActivities.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Total Entries</span>
              </div>
              <p className="text-2xl font-bold">{studentActivities.reduce((sum, s) => sum + s.totalEntries, 0)}</p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && studentActivities.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No student activities recorded</p>
            </div>
          )}

          {!loading && studentActivities.map((student) => (
            <div 
              key={student.studentName} 
              className="border-2 border-slate-200 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{student.studentName}</h3>
                    <p className="text-sm text-slate-600">{student.totalEntries} total entries</p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateStudentPDF(student.studentName)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
                  title="Download PDF for this student only"
                >
                  <FileDown className="h-4 w-4" />
                  Download PDF
                </button>
              </div>

              {student.activities.vitals.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Vital Signs ({student.activities.vitals.length})</h4>
                  {student.activities.vitals.map((v) => (
                    <div key={v.id} className="text-sm pl-3 border-l-2 border-red-400 mb-2">
                      <strong>{format(new Date(v.recorded_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        BP: {v.blood_pressure_systolic}/{v.blood_pressure_diastolic} mmHg, 
                        HR: {v.heart_rate} bpm, 
                        RR: {v.respiratory_rate}/min, 
                        Temp: {v.temperature}°C,
                        O₂ Sat: {v.oxygen_saturation}%
                        {v.pain_score !== null && `, Pain: ${v.pain_score}/10`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.medications.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">Medications (BCMA) ({student.activities.medications.length})</h4>
                  {student.activities.medications.map((m) => (
                    <div key={m.id} className="text-sm pl-3 border-l-2 border-blue-400 mb-2">
                      <strong>{format(new Date(m.timestamp), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Medication:</strong> {m.medication_name || 'N/A'}</div>
                        {m.dosage && <div><strong>Dose:</strong> {m.dosage}</div>}
                        {m.route && <div><strong>Route:</strong> {m.route}</div>}
                        {m.status && <div><strong>Status:</strong> {m.status}</div>}
                        {m.notes && <div className="text-sm text-slate-600 dark:text-slate-400"><strong>Notes:</strong> {m.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.doctorsOrders.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">Doctor's Orders Acknowledged ({student.activities.doctorsOrders.length})</h4>
                  {student.activities.doctorsOrders.map((o) => (
                    <div key={o.id} className="text-sm pl-3 border-l-2 border-purple-400 mb-2">
                      <strong>{format(new Date(o.acknowledged_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Type:</strong> {o.order_type}</div>
                        {o.order_details && typeof o.order_details === 'object' && (
                          <div className="mt-1 space-y-1">
                            {o.order_details.medication && (
                              <>
                                <div><strong>Medication:</strong> {o.order_details.medication}</div>
                                {o.order_details.dose && <div><strong>Dose:</strong> {o.order_details.dose}</div>}
                                {o.order_details.route && <div><strong>Route:</strong> {o.order_details.route}</div>}
                                {o.order_details.frequency && <div><strong>Frequency:</strong> {o.order_details.frequency}</div>}
                              </>
                            )}
                            {o.order_details.order_text && (
                              <div><strong>Order:</strong> {o.order_details.order_text}</div>
                            )}
                            {o.order_details.instructions && (
                              <div><strong>Instructions:</strong> {o.order_details.instructions}</div>
                            )}
                          </div>
                        )}
                        {o.order_details && typeof o.order_details === 'string' && (
                          <div className="mt-1"><strong>Details:</strong> {o.order_details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.labAcknowledgements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-teal-600 mb-2">Lab Results Acknowledged ({student.activities.labAcknowledgements.length})</h4>
                  {student.activities.labAcknowledgements.map((l) => (
                    <div key={l.id} className="text-sm pl-3 border-l-2 border-teal-400 mb-2">
                      <strong>{format(new Date(l.acknowledged_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        {l.test_name}: {l.result_value}
                        {l.abnormal_flag && <span className="ml-2 text-red-600 font-semibold">⚠ ABNORMAL</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.labOrders.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Lab Orders ({student.activities.labOrders.length})</h4>
                  {student.activities.labOrders.map((l) => (
                    <div key={l.id} className="text-sm pl-3 border-l-2 border-green-400 mb-2">
                      <strong>{format(new Date(l.ordered_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        {l.test_name} - {l.priority} priority ({l.specimen_type})
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.patientNotes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-600 mb-2">Patient Notes ({student.activities.patientNotes.length})</h4>
                  {student.activities.patientNotes.map((n) => (
                    <div key={n.id} className="text-sm pl-3 border-l-2 border-amber-400 mb-2">
                      <strong>{format(new Date(n.created_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        {n.note_type}: {n.subject}
                        {n.content && <div className="mt-1 text-xs italic">{n.content}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.handoverNotes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-600 mb-2">Handover Notes (SBAR) ({student.activities.handoverNotes.length})</h4>
                  {student.activities.handoverNotes.map((n) => (
                    <div key={n.id} className="text-sm pl-3 border-l-2 border-orange-400 mb-2">
                      <strong>{format(new Date(n.created_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300 space-y-1">
                        <div><span className="font-semibold">S:</span> {n.situation}</div>
                        <div><span className="font-semibold">B:</span> {n.background}</div>
                        <div><span className="font-semibold">A:</span> {n.assessment}</div>
                        <div><span className="font-semibold">R:</span> {n.recommendation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.hacmapDevices.length > 0 && (
                <div>
                  <h4 className="font-semibold text-emerald-600 mb-2">HAC Map Devices ({student.activities.hacmapDevices.length})</h4>
                  {student.activities.hacmapDevices.map((d) => (
                    <div key={d.id} className="text-sm pl-3 border-l-2 border-emerald-400 mb-2">
                      <strong>{format(new Date(d.created_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Device Type:</strong> {d.type}</div>
                        {d.placement_date && (
                          <div><strong>Placement Date:</strong> {format(new Date(d.placement_date), 'PP')}</div>
                        )}
                        {d.inserted_by && (
                          <div><strong>Inserted By:</strong> {d.inserted_by}</div>
                        )}
                        {(d as any).location && <div><strong>Location:</strong> {(d as any).location}</div>}
                        {(d as any).site && <div><strong>Site:</strong> {(d as any).site}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.hacmapWounds.length > 0 && (
                <div>
                  <h4 className="font-semibold text-pink-600 mb-2">HAC Map Wounds ({student.activities.hacmapWounds.length})</h4>
                  {student.activities.hacmapWounds.map((w) => (
                    <div key={w.id} className="text-sm pl-3 border-l-2 border-pink-400 mb-2">
                      <strong>{format(new Date(w.created_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        <div><strong>Wound Type:</strong> {w.wound_type}</div>
                        {(w.wound_length_cm || w.wound_width_cm) && (
                          <div><strong>Dimensions:</strong> {w.wound_length_cm || '?'} cm (L) × {w.wound_width_cm || '?'} cm (W)</div>
                        )}
                        {(w as any).wound_depth_cm && (
                          <div><strong>Depth:</strong> {(w as any).wound_depth_cm} cm</div>
                        )}
                        {(w as any).wound_stage && (
                          <div><strong>Stage:</strong> {(w as any).wound_stage}</div>
                        )}
                        {(w as any).wound_appearance && (
                          <div><strong>Appearance:</strong> {(w as any).wound_appearance}</div>
                        )}
                        {((w as any).drainage_type || (w as any).drainage_amount) && (
                          <div><strong>Drainage:</strong> {(w as any).drainage_type || ''} {(w as any).drainage_amount || ''}</div>
                        )}
                        {w.wound_description && (
                          <div><strong>Description:</strong> {w.wound_description}</div>
                        )}
                        {(w as any).location && (
                          <div><strong>Location:</strong> {(w as any).location}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {student.activities.bowelAssessments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600 mb-2">Bowel Assessments ({student.activities.bowelAssessments.length})</h4>
                  {student.activities.bowelAssessments.map((b) => (
                    <div key={b.id} className="text-sm pl-3 border-l-2 border-yellow-400 mb-2">
                      <strong>{format(new Date(b.created_at), 'PPp')}</strong>
                      <div className="ml-2 text-slate-700 dark:text-slate-300">
                        Appearance: {b.stool_appearance}, Consistency: {b.stool_consistency}
                        {b.stool_colour && `, Colour: ${b.stool_colour}`}
                        {b.stool_amount && `, Amount: ${b.stool_amount}`}
                        {b.bowel_incontinence && `, Incontinence: ${b.bowel_incontinence}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-50">
            Close
          </button>
          <button onClick={handleGeneratePDF} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Download className="h-4 w-4" />
            Download Complete Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebriefReportModal;
