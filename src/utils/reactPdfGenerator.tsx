/**
 * ===========================================================================
 * REACT-PDF GENERATION UTILITY
 * ===========================================================================
 * Professional PDF reports using React-PDF for student activity tracking
 * Replaces legacy jsPDF implementation with cleaner, maintainable code
 * ===========================================================================
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { StudentActivity } from '../services/simulation/studentActivityService';

// Import logo (will be bundled as base64)
import logo from '/public/images/logo.png';

interface StudentReportData {
  simulationName: string;
  simulationDate: string;
  duration: string;
  studentActivities: StudentActivity[];
  facilityName?: string;
}

// ===== STYLES =====
const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  
  // Header
  logo: {
    width: 120,
    height: 40,
    marginBottom: 20,
    alignSelf: 'center',
  },
  
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
    color: '#475569',
  },
  
  divider: {
    width: 100,
    height: 1,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginVertical: 16,
  },
  
  // Info Box
  infoBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  
  infoLabel: {
    width: 100,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    fontSize: 9,
  },
  
  infoValue: {
    flex: 1,
    color: '#334155',
    fontSize: 9,
  },
  
  // Metrics Cards
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  metricCard: {
    width: '23%',
    padding: 12,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
  },
  
  metricValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  metricLabel: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  
  // Section Headers
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  sectionIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  
  // Activity Breakdown
  activityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  activityLabel: {
    width: 140,
    fontSize: 9,
    color: '#475569',
  },
  
  activityBarBg: {
    flex: 1,
    height: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  
  activityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  activityCount: {
    width: 40,
    textAlign: 'right',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginLeft: 8,
  },
  
  // Student Cards
  studentCard: {
    backgroundColor: '#334155',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  studentName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  
  studentBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  
  studentBadgeText: {
    fontSize: 8,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  
  // Activity Sections
  activitySection: {
    marginBottom: 12,
  },
  
  activityHeader: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  activityTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  
  activityCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  
  activityCountText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  
  // Activity Items
  activityItem: {
    paddingLeft: 12,
    marginBottom: 6,
  },
  
  activityTime: {
    fontSize: 8,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  
  activityDetail: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 1,
    paddingLeft: 8,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 8,
  },
  
  // Page number
  pageNumber: {
    position: 'absolute',
    top: 30,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
  },
});

// ===== HELPER FUNCTIONS =====

function calculateMetrics(activities: StudentActivity[]) {
  let totalVitals = 0, totalMeds = 0, totalOrders = 0, totalIO = 0, totalDocs = 0;
  let bcmaScanned = 0, bcmaTotal = 0;

  activities.forEach(student => {
    totalVitals += student.activities.vitals?.length || 0;
    totalMeds += student.activities.medications?.length || 0;
    totalOrders += student.activities.doctorsOrders?.length || 0;
    totalIO += student.activities.intakeOutput?.length || 0;
    totalDocs += (student.activities.patientNotes?.length || 0) + 
                 (student.activities.handoverNotes?.length || 0);

    student.activities.medications?.forEach((med) => {
      bcmaTotal++;
      if (med.barcode_scanned) bcmaScanned++;
    });
  });

  const bcmaCompliance = bcmaTotal > 0 ? Math.round((bcmaScanned / bcmaTotal) * 100) : 0;
  const totalInterventions = totalVitals + totalMeds + totalOrders + totalIO;

  return {
    totalVitals,
    totalMeds,
    totalOrders,
    totalIO,
    totalDocs,
    bcmaCompliance,
    totalInterventions,
  };
}

// ===== FORMATTERS =====

const formatVital = (v: Record<string, unknown>): string[] => {
  const line1: string[] = [];
  if (v.blood_pressure_systolic != null && v.blood_pressure_diastolic != null) {
    line1.push(`BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic} mmHg`);
  }
  if (v.heart_rate != null) line1.push(`HR: ${v.heart_rate} bpm`);
  if (v.respiratory_rate != null) line1.push(`RR: ${v.respiratory_rate}/min`);

  const line2: string[] = [];
  if (v.temperature != null) line2.push(`Temp: ${v.temperature}°C`);
  if (v.oxygen_saturation != null) line2.push(`SpO₂: ${v.oxygen_saturation}%`);
  if (v.pain_score != null) line2.push(`Pain: ${v.pain_score}/10`);

  const result: string[] = [];
  if (line1.length > 0) result.push(line1.join(' | '));
  if (line2.length > 0) result.push(line2.join(' | '));
  return result.length > 0 ? result : ['No vital values recorded'];
};

const formatMedication = (m: Record<string, unknown>): string[] => [
  `${m.medication_name || 'N/A'}${m.dosage ? ` - ${m.dosage}` : ''}${m.route ? ` via ${m.route}` : ''}`,
  `BCMA: ${m.barcode_scanned ? '✓ Scanned' : '⚠ Manual entry'}${m.override_reason ? ` - Override: ${m.override_reason}` : ''}`
];

const formatOrder = (o: Record<string, unknown>): string[] => [
  `Type: ${o.order_type || 'N/A'}`,
  String(o.order_text || (o.order_details as Record<string, unknown>)?.medication || 'Order details not available')
];

const formatIO = (io: Record<string, unknown>): string[] => [
  `${io.direction === 'intake' ? '↓ IN' : '↑ OUT'} ${String(io.category).toUpperCase()}: ${io.amount_ml} mL`,
  io.route ? `Route: ${io.route}` : null,
  io.description ? String(io.description) : null
].filter((item): item is string => Boolean(item));

const formatNote = (n: Record<string, unknown>): string[] => [
  `${n.note_type}: ${n.subject}`,
  n.content ? String(n.content) : null
].filter((item): item is string => Boolean(item));

const formatHandoverNote = (n: Record<string, unknown>): string[] => [
  n.nursing_notes ? `Nursing Notes: ${String(n.nursing_notes)}` : null,
  n.situation ? `Situation: ${String(n.situation)}` : null,
  n.background ? `Background: ${String(n.background)}` : null,
  n.assessment ? `Assessment: ${String(n.assessment)}` : null,
  n.recommendations ? `Recommendations: ${String(n.recommendations)}` : null,
].filter((item): item is string => Boolean(item));

const formatLabOrder = (o: Record<string, unknown>): string[] => [
  `${o.test_name || 'Unknown Test'} — Priority: ${o.priority || 'N/A'} | Specimen: ${o.specimen_type || 'N/A'}`,
  `Status: ${o.status || 'N/A'}`,
].filter((item): item is string => Boolean(item));

const formatLabAck = (a: Record<string, unknown>): string[] => [
  `${a.test_name || 'Unknown Test'}: ${a.result_value || 'N/A'}${a.abnormal_flag ? '  ⚠ ABNORMAL' : ''}`,
  a.note ? `Note: ${String(a.note)}` : null,
].filter((item): item is string => Boolean(item));

const formatNeuroAssessment = (n: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  if (n.level_of_consciousness) lines.push(`LOC: ${n.level_of_consciousness}`);
  const orientation = [
    n.oriented_person ? 'Person' : null,
    n.oriented_place ? 'Place' : null,
    n.oriented_time ? 'Time' : null,
  ].filter(Boolean).join(', ');
  if (orientation) lines.push(`Oriented: ${orientation}`);
  if (n.gcs_eye != null && n.gcs_verbal != null && n.gcs_motor != null) {
    const gcs = Number(n.gcs_eye) + Number(n.gcs_verbal) + Number(n.gcs_motor);
    lines.push(`GCS: ${gcs}/15 (E${n.gcs_eye} V${n.gcs_verbal} M${n.gcs_motor})`);
  }
  if (n.speech) lines.push(`Speech: ${n.speech}`);
  if (n.sensation) lines.push(`Sensation: ${n.sensation}`);
  if (n.pain_score != null) lines.push(`Pain: ${n.pain_score}/10`);
  return lines.length > 0 ? lines : ['Assessment recorded'];
};

const formatWoundAssessment = (w: Record<string, unknown>): string[] => [
  w.site_condition ? `Site Condition: ${w.site_condition}` : null,
  w.wound_appearance ? `Appearance: ${w.wound_appearance}` : null,
  (w.drainage_type || w.drainage_amount)
    ? `Drainage: ${[w.drainage_type, w.drainage_amount].filter(Boolean).join(' — ')}`
    : null,
  w.dressing_type ? `Dressing: ${w.dressing_type}` : null,
  w.treatment_applied ? `Treatment: ${w.treatment_applied}` : null,
  w.pain_level != null ? `Pain: ${w.pain_level}/10` : null,
  w.notes ? `Notes: ${String(w.notes)}` : null,
].filter((item): item is string => Boolean(item));

const formatDeviceAssessment = (d: Record<string, unknown>): string[] => {
  const lines: string[] = [
    `${String(d.device_type || 'Device').toUpperCase().replace(/-/g, ' ')} — Status: ${d.status || 'N/A'}`,
  ];
  if (d.output_amount_ml != null) lines.push(`Output: ${d.output_amount_ml} mL`);
  if (d.notes) lines.push(`Notes: ${String(d.notes)}`);

  // Expand all JSONB assessment_data fields (the "detailed fields" from the debrief modal)
  const data = d.assessment_data as Record<string, unknown> | null | undefined;
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let display: string;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        display = value.join(', ');
      } else if (typeof value === 'boolean') {
        display = value ? 'Yes' : 'No';
      } else if (typeof value === 'object') {
        display = JSON.stringify(value);
      } else {
        display = String(value);
      }
      lines.push(`${label}: ${display}`);
    });
  }

  return lines;
};

const formatBowelAssessment = (b: Record<string, unknown>): string[] => [
  `Continence: ${b.bowel_incontinence || 'N/A'}`,
  `Stool: ${[b.stool_appearance, b.stool_consistency, b.stool_colour, b.stool_amount].filter(Boolean).join(' | ')}`,
];

const formatBBITEntry = (b: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  if (b.glucose_value != null) {
    lines.push(`Glucose: ${b.glucose_value} mmol/L${b.time_label ? ` (${b.time_label})` : ''}`);
  }
  if (b.basal_name) {
    lines.push(`Basal: ${b.basal_name}${b.basal_dose ? ` ${b.basal_dose} units` : ''} — ${b.basal_status || 'N/A'}`);
  }
  if (b.bolus_dose) {
    lines.push(`Bolus: ${b.bolus_dose} units${b.bolus_meal ? ` with ${b.bolus_meal}` : ''} — ${b.bolus_status || 'N/A'}`);
  }
  if (b.correction_dose) {
    lines.push(`Correction: ${b.correction_dose} units${b.correction_suggested_dose ? ` (suggested: ${b.correction_suggested_dose})` : ''} — ${b.correction_status || 'N/A'}`);
  }
  if (b.carb_intake) lines.push(`Carb intake: ${b.carb_intake}`);
  return lines.length > 0 ? lines : ['BBIT entry recorded'];
};

const formatAdvancedDirective = (a: Record<string, unknown>): string[] => [
  a.dnr_status ? `DNR: ${a.dnr_status}` : null,
  a.living_will_status ? `Living Will: ${a.living_will_status}` : null,
  a.healthcare_proxy_name ? `Healthcare Proxy: ${a.healthcare_proxy_name}` : null,
  a.organ_donation_status ? `Organ Donation: ${a.organ_donation_status}` : null,
  a.special_instructions ? `Special Instructions: ${String(a.special_instructions)}` : null,
].filter((item): item is string => Boolean(item));

const formatHacmapDevice = (d: Record<string, unknown>): string[] => {
  const lines: string[] = [
    `${d.type || 'Device'}${d.location ? ` — ${d.location}` : ''}${d.site ? ` / ${d.site}` : ''}`,
  ];
  if (d.placement_date) lines.push(`Placed: ${d.placement_date}`);
  if (d.inserted_by) lines.push(`Inserted by: ${d.inserted_by}`);
  return lines;
};

const formatHacmapWound = (w: Record<string, unknown>): string[] => {
  const lines: string[] = [
    `${w.wound_type || 'Wound'}${w.location ? ` — ${w.location}` : ''}`,
  ];
  if (w.wound_appearance) lines.push(`Appearance: ${w.wound_appearance}`);
  const dims = [
    w.wound_length_cm ? `${w.wound_length_cm}cm` : null,
    w.wound_width_cm ? `x ${w.wound_width_cm}cm` : null,
    w.wound_depth_cm ? `x ${w.wound_depth_cm}cm` : null,
  ].filter(Boolean).join(' ');
  if (dims) lines.push(`Size: ${dims}`);
  if (w.wound_stage) lines.push(`Stage: ${w.wound_stage}`);
  if (w.drainage_type || w.drainage_amount) {
    lines.push(`Drainage: ${[w.drainage_type, w.drainage_amount].filter(Boolean).join(' — ')}`);
  }
  return lines;
};

const formatNewbornAssessment = (n: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  if (n.weight_grams) lines.push(`Weight: ${n.weight_grams} g`);
  if (n.length_cm) lines.push(`Length: ${n.length_cm} cm`);
  if (n.head_circumference_cm) lines.push(`Head Circumference: ${n.head_circumference_cm} cm`);
  if (n.apgar_1min != null || n.apgar_5min != null || n.apgar_10min != null) {
    lines.push(`APGAR — 1 min: ${n.apgar_1min ?? 'N/A'} | 5 min: ${n.apgar_5min ?? 'N/A'} | 10 min: ${n.apgar_10min ?? 'N/A'}`);
  }
  if (n.vitamin_k_given) {
    lines.push(`Vitamin K: Given${n.vitamin_k_dose ? ` — ${n.vitamin_k_dose}` : ''}${n.vitamin_k_site ? ` at ${n.vitamin_k_site}` : ''}`);
  } else if (n.vitamin_k_declined) {
    lines.push('Vitamin K: Declined by parent/guardian');
  }
  if (n.erythromycin_given) lines.push('Erythromycin: Given');
  if (n.completed_by) lines.push(`Completed by: ${n.completed_by}`);
  return lines.length > 0 ? lines : ['Assessment recorded'];
};

// ===== PDF COMPONENTS =====

const MetricCard: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <View style={styles.metricCard}>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const ActivityBar: React.FC<{ label: string; value: number; maxValue: number; color: string }> = ({ label, value, maxValue, color }) => {
  const width = maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%';
  
  return (
    <View style={styles.activityBar}>
      <Text style={styles.activityLabel}>{label}</Text>
      <View style={styles.activityBarBg}>
        <View style={[styles.activityBarFill, { backgroundColor: color, width }]} />
      </View>
      <Text style={[styles.activityCount, { color }]}>{value}</Text>
    </View>
  );
};

const ActivitySection: React.FC<{ title: string; items: unknown[]; formatter: (item: Record<string, unknown>) => string[]; color: string }> = ({ title, items, formatter, color }) => {
  if (!items || items.length === 0) return null;
  
  return (
    <View style={styles.activitySection}>
      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>{title}</Text>
        <View style={styles.activityCountBadge}>
          <Text style={[styles.activityCountText, { color }]}>{items.length}</Text>
        </View>
      </View>
      
      {items.map((item, idx) => {
        const r = item as Record<string, unknown>;
        const lines = formatter(r);
        const timestamp = (r.recorded_at || r.timestamp || r.acknowledged_at ||
                         r.administered_at || r.ordered_at || r.assessed_at ||
                         r.event_timestamp || r.created_at) as string | undefined;
        
        return (
          <View key={idx} style={styles.activityItem} wrap={false}>
            {timestamp && (
              <Text style={styles.activityTime}>
                {format(new Date(timestamp), 'MMM dd, yyyy h:mm a')}
              </Text>
            )}
            {lines.map((line, lineIdx) => (
              <Text key={lineIdx} style={styles.activityDetail}>{line}</Text>
            ))}
          </View>
        );
      })}
    </View>
  );
};

// ===== MAIN PDF DOCUMENT =====

const DebriefReportDocument: React.FC<{ data: StudentReportData }> = ({ data }) => {
  const metrics = calculateMetrics(data.studentActivities);
  const maxActivityValue = Math.max(metrics.totalVitals, metrics.totalMeds, metrics.totalOrders, metrics.totalIO, 1);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logo */}
        <Image src={logo} style={styles.logo} />
        
        {/* Title */}
        <Text style={styles.title}>Clinical Simulation</Text>
        <Text style={styles.title}>Debrief Report</Text>
        
        {data.facilityName && (
          <Text style={styles.subtitle}>{data.facilityName}</Text>
        )}
        
        <View style={styles.divider} />
        
        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SIMULATION:</Text>
            <Text style={styles.infoValue}>{data.simulationName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DATE:</Text>
            <Text style={styles.infoValue}>{data.simulationDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DURATION:</Text>
            <Text style={styles.infoValue}>{data.duration}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>STUDENTS:</Text>
            <Text style={styles.infoValue}>
              {data.studentActivities.map(s => s.studentName).join(', ')}
            </Text>
          </View>
        </View>
        
        {/* Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard label="Total Interventions" value={metrics.totalInterventions} color="#3b82f6" />
          <MetricCard label="BCMA Compliance" value={`${metrics.bcmaCompliance}%`} color="#10b981" />
          <MetricCard label="Students" value={data.studentActivities.length} color="#8b5cf6" />
          <MetricCard label="Documentation" value={metrics.totalDocs} color="#f59e0b" />
        </View>
        
        {/* Clinical Activity Breakdown */}
        <Text style={styles.sectionTitle}>Clinical Activity Breakdown</Text>
        <ActivityBar label="Vital Signs" value={metrics.totalVitals} maxValue={maxActivityValue} color="#3b82f6" />
        <ActivityBar label="Medications" value={metrics.totalMeds} maxValue={maxActivityValue} color="#8b5cf6" />
        <ActivityBar label="Orders Acknowledged" value={metrics.totalOrders} maxValue={maxActivityValue} color="#ec4899" />
        <ActivityBar label="Intake & Output" value={metrics.totalIO} maxValue={maxActivityValue} color="#06b6d4" />
        <ActivityBar label="Documentation" value={metrics.totalDocs} maxValue={maxActivityValue} color="#f59e0b" />
        
        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}{'\n'}
          hacCare® Clinical Simulation Platform - Confidential Student Performance Data
        </Text>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
      
      {/* Student Detail Pages */}
      {data.studentActivities.map((student, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={styles.studentCard}>
            <Text style={styles.studentName}>{student.studentName}</Text>
            <View style={styles.studentBadge}>
              <Text style={styles.studentBadgeText}>{student.totalEntries} total entries</Text>
            </View>
          </View>
          
          <ActivitySection 
            title="Vital Signs" 
            items={student.activities.vitals || []} 
            formatter={formatVital}
            color="#3b82f6"
          />
          
          <ActivitySection 
            title="Medications (BCMA)" 
            items={student.activities.medications || []} 
            formatter={formatMedication}
            color="#8b5cf6"
          />
          
          <ActivitySection 
            title="Doctor's Orders" 
            items={student.activities.doctorsOrders || []} 
            formatter={formatOrder}
            color="#ec4899"
          />
          
          <ActivitySection 
            title="Intake & Output" 
            items={student.activities.intakeOutput || []} 
            formatter={formatIO}
            color="#06b6d4"
          />

          <ActivitySection 
            title="Lab Orders" 
            items={student.activities.labOrders || []} 
            formatter={formatLabOrder}
            color="#0ea5e9"
          />

          <ActivitySection 
            title="Lab Results Acknowledged" 
            items={student.activities.labAcknowledgements || []} 
            formatter={formatLabAck}
            color="#0891b2"
          />
          
          <ActivitySection 
            title="Patient Notes" 
            items={student.activities.patientNotes || []} 
            formatter={formatNote}
            color="#f59e0b"
          />
          
          <ActivitySection 
            title="Handover Notes (SBAR)" 
            items={student.activities.handoverNotes || []} 
            formatter={formatHandoverNote}
            color="#f97316"
          />

          <ActivitySection 
            title="Neurological Assessments" 
            items={student.activities.neuroAssessments || []} 
            formatter={formatNeuroAssessment}
            color="#7c3aed"
          />

          <ActivitySection 
            title="Wound Assessments" 
            items={student.activities.woundAssessments || []} 
            formatter={formatWoundAssessment}
            color="#16a34a"
          />

          <ActivitySection 
            title="Device Assessments" 
            items={student.activities.deviceAssessments || []} 
            formatter={formatDeviceAssessment}
            color="#0891b2"
          />

          <ActivitySection 
            title="Bowel Assessments" 
            items={student.activities.bowelAssessments || []} 
            formatter={formatBowelAssessment}
            color="#a78bfa"
          />

          <ActivitySection 
            title="Blood/Basal Insulin Tracking (BBIT)" 
            items={student.activities.bbitEntries || []} 
            formatter={formatBBITEntry}
            color="#e11d48"
          />

          <ActivitySection 
            title="Newborn Assessments" 
            items={student.activities.newbornAssessments || []} 
            formatter={formatNewbornAssessment}
            color="#d97706"
          />

          <ActivitySection 
            title="Advanced Directives" 
            items={student.activities.advancedDirectives || []} 
            formatter={formatAdvancedDirective}
            color="#64748b"
          />

          <ActivitySection 
            title="HacMap Devices" 
            items={student.activities.hacmapDevices || []} 
            formatter={formatHacmapDevice}
            color="#2563eb"
          />

          <ActivitySection 
            title="HacMap Wounds" 
            items={student.activities.hacmapWounds || []} 
            formatter={formatHacmapWound}
            color="#059669"
          />
          
          <Text style={styles.footer}>
            Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}{'\n'}
            hacCare® Clinical Simulation Platform - Confidential Student Performance Data
          </Text>
          
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </Page>
      ))}
    </Document>
  );
};

// ===== PUBLIC API =====

/**
 * Generate PDF blob (used for print-in-new-tab and email attachment)
 */
export async function generateStudentActivityPDFBlob(data: StudentReportData): Promise<Blob> {
  const doc = <DebriefReportDocument data={data} />;
  return await pdf(doc).toBlob();
}

/**
 * Generate and download PDF report
 */
export async function generateStudentActivityPDF(data: StudentReportData): Promise<void> {
  const doc = <DebriefReportDocument data={data} />;
  const blob = await pdf(doc).toBlob();
  
  const fileName = `Clinical_Simulation_Debrief_${format(new Date(), 'yyyyMMdd')}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF for email attachment (returns base64)
 */
export async function generateStudentActivityPDFForEmail(data: StudentReportData): Promise<{ base64: string; filename: string }> {
  const doc = <DebriefReportDocument data={data} />;
  const blob = await pdf(doc).toBlob();
  
  // Convert blob to base64
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(blob);
  });
  
  const filename = `Clinical_Simulation_Debrief_${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  return { base64, filename };
}
