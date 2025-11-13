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
 * Generate a professional PDF report for student activities
 */
export function generateStudentActivityPDF(data: StudentReportData, studentFilter?: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number = 20): void => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      addPageHeader();
    }
  };

  // Helper to add page header on new pages
  const addPageHeader = (): void => {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${data.simulationName} - ${data.simulationDate}`, margin, yPos);
    yPos += 15;
  };

  // ========== REPORT HEADER WITH LOGO ==========
  // Add centered hacCare logo at top
  try {
    // Logo dimensions: maintain aspect ratio (approx 3:1 width to height)
    const logoWidth = 60;
    const logoHeight = 20;
    const logoX = (pageWidth - logoWidth) / 2; // Center the logo
    doc.addImage(HACCARE_LOGO_BASE64, 'PNG', logoX, yPos, logoWidth, logoHeight);
    yPos += logoHeight + 10;
  } catch (error) {
    console.warn('Could not add logo to PDF:', error);
    yPos += 5;
  }
  
  // Report title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81); // Subtle gray-blue
  doc.text('Student Activity Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Facility name (if provided)
  if (data.facilityName) {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(data.facilityName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Professional horizontal line
  doc.setDrawColor(209, 213, 219); // Light gray
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ========== SIMULATION DETAILS ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  doc.text(`Simulation: ${data.simulationName}`, margin, yPos);
  yPos += 7;
  doc.text(`Date: ${data.simulationDate}`, margin, yPos);
  yPos += 7;
  doc.text(`Duration: ${data.duration}`, margin, yPos);
  yPos += 7;

  // Filter activities if specific student requested
  const activitiesToShow = studentFilter
    ? data.studentActivities.filter(s => s.studentName === studentFilter)
    : data.studentActivities;

  // Count unique student names
  const uniqueStudents = new Set(activitiesToShow.map(s => s.studentName)).size;
  doc.text(`Students: ${uniqueStudents}`, margin, yPos);
  yPos += 7;
  const totalEntries = activitiesToShow.reduce((sum, s) => sum + s.totalEntries, 0);
  doc.text(`Total Entries: ${totalEntries}`, margin, yPos);
  yPos += 15;

  // ========== STUDENT ACTIVITIES ==========
  activitiesToShow.forEach((student, studentIndex) => {
    checkPageBreak(40);

    // Student header box
    doc.setFillColor(71, 85, 105); // Subtle slate
    doc.rect(margin, yPos, contentWidth, 10, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${student.studentName}`, margin + 3, yPos + 7);
    doc.setFontSize(9);
    doc.text(`${student.totalEntries} total entries`, pageWidth - margin - 3, yPos + 7, { align: 'right' });
    yPos += 15;

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
        checkPageBreak(15);

        // Professional section header with subtle background
        doc.setFillColor(section.color[0], section.color[1], section.color[2]);
        doc.setDrawColor(section.color[0], section.color[1], section.color[2]);
        doc.roundedRect(margin, yPos - 4, contentWidth, 8, 1, 1, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81); // Dark gray for readability on pastel
        doc.text(`${section.title}`, margin + 3, yPos + 2);
        
        doc.setTextColor(75, 85, 99); // Slightly lighter gray
        doc.text(`${section.items.length} ${section.items.length === 1 ? 'entry' : 'entries'}`, pageWidth - margin - 3, yPos + 2, { align: 'right' });
        yPos += 9;

        // Section items
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);

        section.items.forEach((item: any) => {
          const lines = section.formatter(item);
          const requiredSpace = lines.length * 5 + 3;
          checkPageBreak(requiredSpace);

          lines.forEach(line => {
            const wrappedLines = doc.splitTextToSize(line, contentWidth - 10);
            wrappedLines.forEach((wrappedLine: string) => {
              doc.text(wrappedLine, margin + 5, yPos);
              yPos += 5;
            });
          });
          yPos += 2; // Space between entries
        });

        yPos += 5; // Space between sections
      }
    });

    // Space between students
    if (studentIndex < activitiesToShow.length - 1) {
      yPos += 10;
    }
  });

  // ========== PROFESSIONAL FOOTER ==========
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerY = pageHeight - 15;
  
  // Footer separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.text(
    `Generated on ${format(new Date(), 'PPpp')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  
  doc.setFontSize(7);
  doc.text(
    'hacCare Simulation & Clinical Education Platform',
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  // ========== SAVE PDF ==========
  const fileName = studentFilter
    ? `${studentFilter.replace(/\s+/g, '_')}_Activity_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    : `Student_Activity_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  
  doc.save(fileName);
}

// ========== FORMATTERS ==========

function formatVital(v: any): string[] {
  const parts = [`BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`, `HR: ${v.heart_rate}`, `RR: ${v.respiratory_rate}`, `Temp: ${v.temperature}°C`, `SpO2: ${v.oxygen_saturation}%`];
  if (v.pain_score !== null) parts.push(`Pain: ${v.pain_score}/10`);
  return parts;
}

function formatMedicationAdmin(m: any): string[] {
  const lines = [
    `${format(new Date(m.timestamp), 'PPp')}`,
    `  → Medication: ${m.medication_name || 'N/A'}`
  ];
  if (m.dosage) lines.push(`  → Dose: ${m.dosage}`);
  if (m.route) lines.push(`  → Route: ${m.route}`);
  if (m.status) lines.push(`  → Status: ${m.status}`);
  
  // BCMA safety information
  if (m.barcode_scanned) {
    lines.push(`  ✓ BCMA: Barcode scanned`);
  } else {
    lines.push(`  ⚠ BCMA: Manual entry (no barcode)`);
  }
  
  if (m.override_reason) {
    lines.push(`  ⚠ OVERRIDE: ${m.override_reason}`);
  }
  
  if (m.witness_name) {
    lines.push(`  → Witnessed by: ${m.witness_name}`);
  }
  
  if (m.notes) lines.push(`  → Notes: ${m.notes}`);
  
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
    `  Order Type: ${o.order_type || 'N/A'}`
  ];
  
  // Show the main order text if available
  if (o.order_text) {
    lines.push(`  → Order: ${o.order_text}`);
  }
  
  if (o.order_details) {
    // Parse order details if it's a JSON object
    if (typeof o.order_details === 'object') {
      // Extract and display all relevant fields
      if (o.order_details.medication) {
        lines.push(`  → Medication: ${o.order_details.medication}`);
        if (o.order_details.dose) lines.push(`    Dose: ${o.order_details.dose}`);
        if (o.order_details.route) lines.push(`    Route: ${o.order_details.route}`);
        if (o.order_details.frequency) lines.push(`    Frequency: ${o.order_details.frequency}`);
      }
      if (o.order_details.order_text) {
        lines.push(`  → Order: ${o.order_details.order_text}`);
      }
      if (o.order_details.instructions) {
        lines.push(`  → Instructions: ${o.order_details.instructions}`);
      }
      if (o.order_details.priority) {
        lines.push(`  → Priority: ${o.order_details.priority}`);
      }
      if (o.order_details.indication) {
        lines.push(`  → Indication: ${o.order_details.indication}`);
      }
      // Include any other fields that haven't been explicitly handled
      Object.keys(o.order_details).forEach(key => {
        if (!['medication', 'dose', 'route', 'frequency', 'order_text', 'instructions', 'priority', 'indication'].includes(key)) {
          const value = o.order_details[key];
          if (value !== null && value !== undefined && value !== '') {
            lines.push(`  → ${key}: ${value}`);
          }
        }
      });
    } else {
      // String format
      lines.push(`  → Details: ${o.order_details}`);
    }
  }
  return lines;
}

function formatLabAck(l: any): string[] {
  const lines = [
    `${format(new Date(l.acknowledged_at), 'PPp')} - ACKNOWLEDGED`,
    `  → Test: ${l.test_name}`,
    `  → Result: ${l.result_value}${l.abnormal_flag ? ' ⚠ ABNORMAL' : ' (Normal)'}`
  ];
  
  if (l.reference_range) {
    lines.push(`  → Reference Range: ${l.reference_range}`);
  }
  
  if (l.units) {
    lines.push(`  → Units: ${l.units}`);
  }
  
  return lines;
}

function formatLabOrder(l: any): string[] {
  return [
    `${format(new Date(l.ordered_at), 'PPp')}`,
    `  ${l.test_name} - ${l.priority} priority (${l.specimen_type})`
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
    `  Device Type: ${d.type}`
  ];
  if (d.placement_date) {
    lines.push(`  Placement Date: ${format(new Date(d.placement_date), 'PP')}`);
  }
  if (d.inserted_by) {
    lines.push(`  Inserted By: ${d.inserted_by}`);
  }
  // Include any location/position information if available
  if (d.location) {
    lines.push(`  Location: ${d.location}`);
  }
  if (d.site) {
    lines.push(`  Site: ${d.site}`);
  }
  return lines;
}

function formatWound(w: any): string[] {
  const lines = [
    `${format(new Date(w.created_at), 'PPp')}`,
    `  Wound Type: ${w.wound_type}`
  ];
  if (w.wound_length_cm || w.wound_width_cm) {
    lines.push(`  Dimensions: ${w.wound_length_cm || '?'} cm (L) × ${w.wound_width_cm || '?'} cm (W)`);
  }
  if (w.wound_depth_cm) {
    lines.push(`  Depth: ${w.wound_depth_cm} cm`);
  }
  if (w.wound_stage) {
    lines.push(`  Stage: ${w.wound_stage}`);
  }
  if (w.wound_appearance) {
    lines.push(`  Appearance: ${w.wound_appearance}`);
  }
  if (w.drainage_type || w.drainage_amount) {
    lines.push(`  Drainage: ${w.drainage_type || ''} ${w.drainage_amount || ''}`);
  }
  if (w.wound_description) {
    lines.push(`  Description: ${w.wound_description}`);
  }
  if (w.location) {
    lines.push(`  Location: ${w.location}`);
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
