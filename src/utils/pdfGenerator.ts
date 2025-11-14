/**
 * ===========================================================================
 * PDF GENERATION UTILITY
 * ===========================================================================
 * Generate professional PDF reports for student activity tracking
 * ===========================================================================
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { StudentActivity } from '../services/simulation/studentActivityService';
import { HACCARE_LOGO_BASE64 } from './logoBase64';

interface StudentReportData {
  simulationName: string;
  simulationDate: string;
  duration: string;
  studentActivities: StudentActivity[];
  facilityName?: string;
}

/**
 * Calculate comprehensive metrics from student activities
 */
function calculateMetrics(activities: StudentActivity[]): any {
  let totalVitals = 0, totalMeds = 0, totalOrders = 0, totalNotes = 0, totalIO = 0;
  let bcmaScanned = 0, bcmaTotal = 0;
  let timeToFirstVital: number | null = null;
  let uniqueDaysActive = new Set<string>();

  activities.forEach(student => {
    totalVitals += student.activities.vitals?.length || 0;
    totalMeds += student.activities.medications?.length || 0;
    totalOrders += student.activities.doctorsOrders?.length || 0;
    totalNotes += (student.activities.patientNotes?.length || 0) + (student.activities.handoverNotes?.length || 0);
    totalIO += student.activities.intakeOutput?.length || 0;

    // BCMA compliance
    student.activities.medications?.forEach((med: any) => {
      bcmaTotal++;
      if (med.barcode_scanned) bcmaScanned++;
    });

    // Track active days
    student.activities.vitals?.forEach((v: any) => {
      uniqueDaysActive.add(format(new Date(v.recorded_at), 'yyyy-MM-dd'));
    });
  });

  const bcmaCompliance = bcmaTotal > 0 ? Math.round((bcmaScanned / bcmaTotal) * 100) : 0;
  const avgEntriesPerStudent = activities.length > 0 ? Math.round(activities.reduce((sum, s) => sum + s.totalEntries, 0) / activities.length) : 0;

  return {
    totalVitals,
    totalMeds,
    totalOrders,
    totalNotes,
    totalIO,
    bcmaCompliance,
    avgEntriesPerStudent,
    totalInterventions: totalVitals + totalMeds + totalOrders + totalIO,
    activeDays: uniqueDaysActive.size
  };
}

/**
 * Generate a professional PDF report for student activities
 */
export function generateStudentActivityPDF(data: StudentReportData, studentFilter?: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  let pageNumber = 1;

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number = 20): void => {
    if (yPos + requiredSpace > pageHeight - margin - 20) {
      addPageFooter();
      doc.addPage();
      pageNumber++;
      yPos = margin;
      addPageHeader();
    }
  };

  // Helper to add page header on new pages
  const addPageHeader = (): void => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`${data.simulationName}`, margin, yPos);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, yPos, { align: 'right' });
    
    // Subtle header line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
    yPos += 12;
  };

  // Helper to add page footer
  const addPageFooter = (): void => {
    const footerY = pageHeight - 15;
    
    // Footer separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated ${format(new Date(), 'MMM dd, yyyy h:mm a')}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    
    doc.setFontSize(6);
    doc.text(
      'hacCare® Clinical Simulation Platform - Confidential Student Performance Data',
      pageWidth / 2,
      footerY + 4,
      { align: 'center' }
    );
  };

  // ========== PROFESSIONAL COVER SECTION ==========
  // Gradient-style header background
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 85, 'F');
  
  // Add centered hacCare logo at top
  try {
    const logoWidth = 60;
    const logoHeight = 20;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(HACCARE_LOGO_BASE64, 'PNG', logoX, yPos, logoWidth, logoHeight);
    yPos += logoHeight + 8;
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
    yPos += 5;
  }
  
  // Report title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Clinical Simulation', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  doc.text('Debrief Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Facility name
  if (data.facilityName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(data.facilityName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }

  // Decorative line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  const lineStart = pageWidth / 2 - 30;
  doc.line(lineStart, yPos, lineStart + 60, yPos);
  yPos += 15;

  // ========== SIMULATION DETAILS BOX ==========
  const boxY = yPos;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, boxY, contentWidth, 32, 2, 2, 'FD');
  
  yPos = boxY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  
  // Left column
  doc.text('SIMULATION:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(data.simulationName, margin + 35, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DATE:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(data.simulationDate, margin + 35, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DURATION:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(data.duration, margin + 35, yPos);
  
  // Right column
  yPos = boxY + 8;
  const rightCol = pageWidth / 2 + 10;
  
  // Filter activities if specific student requested
  const activitiesToShow = studentFilter
    ? data.studentActivities.filter(s => s.studentName === studentFilter)
    : data.studentActivities;

  const uniqueStudents = new Set(data.studentActivities.map(s => s.studentName)).size;
  const totalEntries = activitiesToShow.reduce((sum, s) => sum + s.totalEntries, 0);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('STUDENTS:', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(uniqueStudents.toString(), rightCol + 30, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL ENTRIES:', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(totalEntries.toString(), rightCol + 30, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('REPORT TYPE:', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(studentFilter ? 'Individual' : 'Group', rightCol + 30, yPos);
  
  yPos = boxY + 38;

  // ========== EXECUTIVE SUMMARY ==========
  checkPageBreak(60);
  
  // Calculate metrics
  const metrics = calculateMetrics(activitiesToShow);
  
  // Section title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Executive Summary', margin, yPos);
  yPos += 8;
  
  // Metrics grid
  const metricBoxWidth = (contentWidth - 6) / 3;
  const metricBoxHeight = 24;
  let metricX = margin;
  
  const metricsToShow = [
    { label: 'Total Interventions', value: metrics.totalInterventions, icon: '⚡', color: [59, 130, 246] },
    { label: 'BCMA Compliance', value: `${metrics.bcmaCompliance}%`, icon: '✓', color: [16, 185, 129] },
    { label: 'Avg Entries/Student', value: metrics.avgEntriesPerStudent, icon: '📊', color: [139, 92, 246] }
  ];
  
  metricsToShow.forEach((metric, idx) => {
    // Metric box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(metricX, yPos, metricBoxWidth, metricBoxHeight, 2, 2, 'FD');
    
    // Colored accent bar
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.roundedRect(metricX, yPos, metricBoxWidth, 3, 2, 2, 'F');
    
    // Icon/Value
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.text(metric.value.toString(), metricX + metricBoxWidth / 2, yPos + 12, { align: 'center' });
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(metric.label, metricX + metricBoxWidth / 2, yPos + 19, { align: 'center' });
    
    metricX += metricBoxWidth + 3;
  });
  
  yPos += metricBoxHeight + 10;
  
  // Clinical Activity Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Clinical Activity Breakdown', margin, yPos);
  yPos += 6;
  
  // Activity bars
  const maxValue = Math.max(metrics.totalVitals, metrics.totalMeds, metrics.totalOrders, metrics.totalNotes, metrics.totalIO, 1);
  const activities = [
    { label: 'Vital Signs', value: metrics.totalVitals, color: [59, 130, 246] },
    { label: 'Medications', value: metrics.totalMeds, color: [139, 92, 246] },
    { label: 'Orders Acknowledged', value: metrics.totalOrders, color: [236, 72, 153] },
    { label: 'Documentation', value: metrics.totalNotes, color: [234, 179, 8] },
    { label: 'Intake & Output', value: metrics.totalIO, color: [6, 182, 212] }
  ];
  
  activities.forEach(activity => {
    const barWidth = (activity.value / maxValue) * (contentWidth - 50);
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(activity.label, margin, yPos);
    
    // Bar background
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 45, yPos - 3, contentWidth - 50, 4, 1, 1, 'F');
    
    // Bar
    if (barWidth > 0) {
      doc.setFillColor(activity.color[0], activity.color[1], activity.color[2]);
      doc.roundedRect(margin + 45, yPos - 3, barWidth, 4, 1, 1, 'F');
    }
    
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(activity.color[0], activity.color[1], activity.color[2]);
    doc.text(activity.value.toString(), margin + 45 + contentWidth - 45, yPos, { align: 'right' });
    
    yPos += 6;
  });
  
  yPos += 8;

  // ========== DETAILED STUDENT ACTIVITIES ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Detailed Activity Log', margin, yPos);
  yPos += 10;
  
  activitiesToShow.forEach((student, studentIndex) => {
    checkPageBreak(45);

    // Student header with gradient-style box
    doc.setFillColor(51, 65, 85);
    doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');
    
    // Accent stripe
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, yPos, 3, 10, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${student.studentName}`, margin + 6, yPos + 7);
    
    // Entry count badge
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(59, 130, 246);
    const badgeText = `${student.totalEntries} entries`;
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    doc.roundedRect(pageWidth - margin - badgeWidth, yPos + 2, badgeWidth, 6, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, pageWidth - margin - badgeWidth / 2, yPos + 6, { align: 'center' });
    
    yPos += 13;

    // Activity sections with subtle pastel colors
    const sections = [
      { title: 'Vital Signs', items: student.activities.vitals || [], color: [147, 197, 253], formatter: formatVital }, // Light blue
      { title: 'Medications (BCMA)', items: student.activities.medications || [], color: [167, 139, 250], formatter: formatMedicationAdmin }, // Light purple
      { title: "Doctor's Orders", items: student.activities.doctorsOrders || [], color: [196, 181, 253], formatter: formatDoctorOrder }, // Lighter purple
      { title: 'Lab Acknowledgements', items: student.activities.labAcknowledgements || [], color: [153, 246, 228], formatter: formatLabAck }, // Light teal
      { title: 'Lab Orders', items: student.activities.labOrders || [], color: [134, 239, 172], formatter: formatLabOrder }, // Light green
      { title: 'Intake & Output', items: student.activities.intakeOutput || [], color: [165, 243, 252], formatter: formatIntakeOutput }, // Light cyan
      { title: 'Patient Notes', items: student.activities.patientNotes || [], color: [253, 224, 71], formatter: formatNote }, // Light yellow
      { title: 'Handover Notes', items: student.activities.handoverNotes || [], color: [253, 186, 116], formatter: formatHandover }, // Light orange
      { title: 'HAC Map Devices', items: student.activities.hacmapDevices || [], color: [134, 239, 172], formatter: formatDevice }, // Light emerald
      { title: 'HAC Map Wounds', items: student.activities.hacmapWounds || [], color: [249, 168, 212], formatter: formatWound }, // Light pink
      { title: 'Bowel Assessments', items: student.activities.bowelAssessments || [], color: [253, 230, 138], formatter: formatBowel }, // Light amber
    ];

    sections.forEach(section => {
      if (section.items && section.items.length > 0) {
        checkPageBreak(18);

        // Enhanced section header with icon-style color accent
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, contentWidth, 8, 1.5, 1.5, 'FD');
        
        // Colored left border
        doc.setFillColor(section.color[0], section.color[1], section.color[2]);
        doc.roundedRect(margin, yPos, 3, 8, 1.5, 1.5, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(`${section.title}`, margin + 6, yPos + 5.5);
        
        // Count badge
        doc.setFillColor(241, 245, 249);
        const countText = `${section.items.length}`;
        const countWidth = Math.max(doc.getTextWidth(countText) + 6, 12);
        doc.roundedRect(pageWidth - margin - countWidth - 2, yPos + 1.5, countWidth, 5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(section.color[0], section.color[1], section.color[2]);
        doc.text(countText, pageWidth - margin - countWidth / 2 - 2, yPos + 5, { align: 'center' });
        
        yPos += 10;

        // Section items with enhanced styling
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        section.items.forEach((item: any, itemIndex: number) => {
          const lines = section.formatter(item);
          const requiredSpace = lines.length * 4 + 4;
          checkPageBreak(requiredSpace);

          // Alternating background for readability
          if (itemIndex % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin + 2, yPos - 1, contentWidth - 4, lines.length * 4 + 1, 'F');
          }

          lines.forEach((line, lineIndex) => {
            const wrappedLines = doc.splitTextToSize(line, contentWidth - 14);
            wrappedLines.forEach((wrappedLine: string) => {
              // First line (timestamp) in slightly bolder color
              if (lineIndex === 0) {
                doc.setTextColor(71, 85, 105);
                doc.setFont('helvetica', 'bold');
              } else {
                doc.setTextColor(71, 85, 105);
                doc.setFont('helvetica', 'normal');
              }
              doc.text(wrappedLine, margin + 6, yPos);
              yPos += 4;
            });
          });
          yPos += 2; // Space between entries
        });

        yPos += 5; // Space between sections
      }
    });

    // Space between students
    if (studentIndex < activitiesToShow.length - 1) {
      checkPageBreak(20);
      
      // Student separator with decorative element
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      const sepY = yPos + 3;
      doc.line(margin, sepY, pageWidth - margin, sepY);
      
      // Small decorative circle in center
      doc.setFillColor(203, 213, 225);
      doc.circle(pageWidth / 2, sepY, 1.5, 'F');
      
      yPos += 10;
    }
  });

  // ========== CLOSING SUMMARY PAGE ==========
  checkPageBreak(80);
  
  // Decorative separator
  yPos += 10;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  const lineStart = pageWidth / 2 - 30;
  doc.line(lineStart, yPos, lineStart + 60, yPos);
  yPos += 15;
  
  // Performance Summary Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 45, 2, 2, 'FD');
  
  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Performance Highlights', pageWidth / 2, yPos + 10, { align: 'center' });
  
  yPos += 18;
  
  // Key achievements
  const highlights = [
    `✓ ${activitiesToShow.length} student${activitiesToShow.length !== 1 ? 's' : ''} completed simulation activities`,
    `✓ ${totalEntries} total clinical interventions documented`,
    `✓ ${metrics.bcmaCompliance}% medication administration safety compliance`,
    `✓ Comprehensive assessment across ${Object.keys(activitiesToShow[0]?.activities || {}).filter(k => activitiesToShow[0]?.activities[k as keyof typeof activitiesToShow[0]['activities']]?.length > 0).length} clinical domains`
  ];
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  
  highlights.forEach(highlight => {
    doc.text(highlight, margin + 10, yPos);
    yPos += 6;
  });
  
  yPos += 15;
  
  // Instructor signature section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin + 20, yPos, margin + 80, yPos);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Instructor Signature', margin + 20, yPos + 5);
  
  doc.line(pageWidth - margin - 80, yPos, pageWidth - margin - 20, yPos);
  doc.text('Date', pageWidth - margin - 80, yPos + 5);
  
  yPos += 20;
  
  // Confidentiality notice
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'FD');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('CONFIDENTIAL EDUCATIONAL DOCUMENT', margin + 5, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 53, 15);
  const confidText = 'This report contains confidential student performance data and is intended solely for educational purposes. Unauthorized distribution or disclosure is prohibited.';
  const wrappedConfid = doc.splitTextToSize(confidText, contentWidth - 10);
  wrappedConfid.forEach((line: string, idx: number) => {
    doc.text(line, margin + 5, yPos + 10 + (idx * 3));
  });

  // Add final page footer
  addPageFooter();

  // ========== SAVE PDF ==========
  const fileName = studentFilter
    ? `${studentFilter.replace(/\s+/g, '_')}_Debrief_Report_${format(new Date(), 'yyyyMMdd')}.pdf`
    : `Clinical_Simulation_Debrief_${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  doc.save(fileName);
}

// ========== FORMATTERS ==========

function formatVital(v: any): string[] {
  const lines = [
    `${format(new Date(v.recorded_at), 'PPp')}`,
    `  BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic} mmHg  |  HR: ${v.heart_rate} bpm  |  RR: ${v.respiratory_rate}/min`,
    `  Temp: ${v.temperature}°C  |  SpO₂: ${v.oxygen_saturation}%${v.pain_score !== null ? `  |  Pain: ${v.pain_score}/10` : ''}`
  ];
  return lines;
}

function formatMedicationAdmin(m: any): string[] {
  const lines = [
    `${format(new Date(m.timestamp), 'PPp')}`,
    `  Medication: ${m.medication_name || 'N/A'}${m.dosage ? ` - ${m.dosage}` : ''}${m.route ? ` via ${m.route}` : ''}${m.status ? ` (${m.status})` : ''}`
  ];
  
  // BCMA safety information on same line
  const bcmaStatus = m.barcode_scanned ? '✓ Barcode scanned' : '⚠ Manual entry';
  lines.push(`  BCMA: ${bcmaStatus}${m.override_reason ? ` - Override: ${m.override_reason}` : ''}${m.witness_name ? ` - Witnessed by: ${m.witness_name}` : ''}`);
  
  if (m.notes) lines.push(`  Notes: ${m.notes}`);
  
  return lines;
}

function formatMedication(m: any): string[] {
  const lines = [
    `${format(new Date(m.administered_at), 'PPp')}`,
    `  Medication: ${m.medication_name}`,
    `  Dose: ${m.dose} via ${m.route}`
  ];
  
  // BCMA status
  if (m.barcode_scanned) {
    lines.push(`  BCMA: ✓ Barcode scanned successfully`);
  } else {
    lines.push(`  BCMA: ✗ Manual entry (no barcode scan)`);
  }
  
  // Override information
  if (m.override_reason) {
    lines.push(`  ⚠ OVERRIDE: ${m.override_reason}`);
  }
  
  // Administration status
  if (m.admin_status) {
    lines.push(`  Status: ${m.admin_status}`);
  }
  
  // Additional safety fields
  if (m.witness_name) {
    lines.push(`  Witnessed by: ${m.witness_name}`);
  }
  
  return lines;
}

function formatDoctorOrder(o: any): string[] {
  const lines = [
    `${format(new Date(o.acknowledged_at), 'PPp')} - ACKNOWLEDGED`,
    `  Type: ${o.order_type || 'N/A'}`
  ];
  
  // Show the main order text if available
  if (o.order_text) {
    lines.push(`  Order: ${o.order_text}`);
  }
  
  if (o.order_details && typeof o.order_details === 'object') {
    // Build compact detail line
    const details = [];
    if (o.order_details.medication) {
      let medDetail = o.order_details.medication;
      if (o.order_details.dose) medDetail += ` ${o.order_details.dose}`;
      if (o.order_details.route) medDetail += ` via ${o.order_details.route}`;
      if (o.order_details.frequency) medDetail += ` ${o.order_details.frequency}`;
      details.push(medDetail);
    }
    if (o.order_details.priority) details.push(`Priority: ${o.order_details.priority}`);
    if (o.order_details.indication) details.push(`Indication: ${o.order_details.indication}`);
    if (o.order_details.instructions) lines.push(`  Instructions: ${o.order_details.instructions}`);
    
    if (details.length > 0) {
      lines.push(`  ${details.join(' - ')}`);
    }
  } else if (o.order_details && typeof o.order_details === 'string') {
    lines.push(`  Details: ${o.order_details}`);
  }
  
  return lines;
}

function formatLabAck(l: any): string[] {
  const lines = [
    `${format(new Date(l.acknowledged_at), 'PPp')} - ACKNOWLEDGED`,
    `  ${l.test_name}: ${l.result_value}${l.units ? ` ${l.units}` : ''}${l.abnormal_flag ? ' ⚠ ABNORMAL' : ''}${l.reference_range ? ` (Ref: ${l.reference_range})` : ''}`
  ];
  
  return lines;
}

function formatLabOrder(l: any): string[] {
  return [
    `${format(new Date(l.ordered_at), 'PPp')}`,
    `  ${l.test_name} - ${l.priority} priority - ${l.specimen_type} specimen`
  ];
}

function formatNote(n: any): string[] {
  const lines = [
    `${format(new Date(n.created_at), 'PPp')}`,
    `  ${n.note_type}: ${n.subject}`
  ];
  if (n.content) {
    lines.push(`  ${n.content}`);
  }
  return lines;
}

function formatHandover(n: any): string[] {
  return [
    `${format(new Date(n.created_at), 'PPp')}`,
    `  S: ${n.situation}`,
    `  B: ${n.background}`,
    `  A: ${n.assessment}`,
    `  R: ${n.recommendation}`
  ];
}

function formatDevice(d: any): string[] {
  const lines = [
    `${format(new Date(d.created_at), 'PPp')}`,
    `  → Device Type: ${d.type}`
  ];
  if (d.placement_date) {
    lines.push(`  → Placement Date: ${format(new Date(d.placement_date), 'PP')}`);
  }
  if (d.inserted_by) {
    lines.push(`  → Inserted By: ${d.inserted_by}`);
  }
  // Include any location/position information if available
  if (d.location) {
    // Check if location is a UUID (36 chars with dashes) or a readable name
    const isUUID = typeof d.location === 'string' && d.location.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (!isUUID) {
      lines.push(`  → Location: ${d.location}`);
    } else {
      lines.push(`  → Location: [Body area marked on HAC Map]`);
    }
  }
  if (d.site) {
    lines.push(`  → Notes: ${d.site}`);
  }
  return lines;
}

function formatWound(w: any): string[] {
  const lines = [
    `${format(new Date(w.created_at), 'PPp')}`,
    `  → Wound Type: ${w.wound_type}`
  ];
  if (w.wound_length_cm || w.wound_width_cm) {
    lines.push(`  → Dimensions: ${w.wound_length_cm || '?'} cm (L) × ${w.wound_width_cm || '?'} cm (W)`);
  }
  if (w.wound_depth_cm) {
    lines.push(`  → Depth: ${w.wound_depth_cm} cm`);
  }
  if (w.wound_stage) {
    lines.push(`  → Stage: ${w.wound_stage}`);
  }
  if (w.wound_appearance) {
    lines.push(`  → Appearance: ${w.wound_appearance}`);
  }
  if (w.drainage_type || w.drainage_amount) {
    lines.push(`  → Drainage: ${w.drainage_type || ''} ${w.drainage_amount || ''}`);
  }
  if (w.wound_description) {
    lines.push(`  → Description: ${w.wound_description}`);
  }
  if (w.location) {
    // Check if location is a UUID or a readable name
    const isUUID = typeof w.location === 'string' && w.location.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (!isUUID) {
      lines.push(`  → Location: ${w.location}`);
    } else {
      lines.push(`  → Location: [Body area marked on HAC Map]`);
    }
  }
  return lines;
}

function formatAssessment(a: any): string[] {
  return [
    `${format(new Date(a.created_at), 'PPp')}`,
    `  Complete assessment documented`
  ];
}

function formatBowel(b: any): string[] {
  return [
    `${format(new Date(b.created_at), 'PPp')}`,
    `  Appearance: ${b.stool_appearance}, Consistency: ${b.stool_consistency}${b.stool_colour ? `, Colour: ${b.stool_colour}` : ''}${b.stool_amount ? `, Amount: ${b.stool_amount}` : ''}${b.bowel_incontinence ? `, Incontinence: ${b.bowel_incontinence}` : ''}`
  ];
}

function formatIntakeOutput(io: any): string[] {
  const directionIcon = io.direction === 'intake' ? '\u2193' : '\u2191'; // ↓ for intake, ↑ for output
  const directionColor = io.direction === 'intake' ? 'IN' : 'OUT';
  
  const lines = [
    `${format(new Date(io.event_timestamp), 'PPp')} - ${directionColor}`,
    `  ${directionIcon} ${io.category.toUpperCase()}: ${io.amount_ml} mL`
  ];
  
  if (io.route) {
    lines.push(`  \u2192 Route: ${io.route}`);
  }
  
  if (io.description) {
    lines.push(`  \u2192 Notes: ${io.description}`);
  }
  
  return lines;
}
