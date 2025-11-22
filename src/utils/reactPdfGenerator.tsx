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

    student.activities.medications?.forEach((med: Record<string, unknown>) => {
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

const formatVital = (v: Record<string, unknown>) => [
  `BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic} mmHg | HR: ${v.heart_rate} bpm | RR: ${v.respiratory_rate}/min`,
  `Temp: ${v.temperature}°C | SpO₂: ${v.oxygen_saturation}%${v.pain_score !== null ? ` | Pain: ${v.pain_score}/10` : ''}`
];

const formatMedication = (m: Record<string, unknown>) => [
  `${m.medication_name || 'N/A'}${m.dosage ? ` - ${m.dosage}` : ''}${m.route ? ` via ${m.route}` : ''}`,
  `BCMA: ${m.barcode_scanned ? '✓ Scanned' : '⚠ Manual entry'}${m.override_reason ? ` - Override: ${m.override_reason}` : ''}`
];

const formatOrder = (o: Record<string, unknown>) => [
  `Type: ${o.order_type || 'N/A'}`,
  o.order_text || o.order_details?.medication || 'Order details not available'
];

const formatIO = (io: Record<string, unknown>): string[] => [
  `${io.direction === 'intake' ? '↓' : '↑'} ${String(io.category).toUpperCase()}: ${io.amount_ml} mL`,
  io.route ? `Route: ${io.route}` : null,
  io.description ? String(io.description) : null
].filter((item): item is string => Boolean(item));

const formatNote = (n: Record<string, unknown>): string[] => [
  `${n.note_type}: ${n.subject}`,
  n.content ? String(n.content) : null
].filter((item): item is string => Boolean(item));

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

const ActivitySection: React.FC<{ title: string; items: Record<string, unknown>[]; formatter: (item: Record<string, unknown>) => string[]; color: string }> = ({ title, items, formatter, color }) => {
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
        const lines = formatter(item);
        const timestamp = item.recorded_at || item.timestamp || item.acknowledged_at || 
                         item.administered_at || item.event_timestamp || item.created_at;
        
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
            title="Patient Notes" 
            items={student.activities.patientNotes || []} 
            formatter={formatNote}
            color="#f59e0b"
          />
          
          <ActivitySection 
            title="Handover Notes" 
            items={student.activities.handoverNotes || []} 
            formatter={formatNote}
            color="#f97316"
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
