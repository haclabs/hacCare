/**
 * Patient Record Printer
 *
 * Pure utility — opens a new window and writes a full hospital-style print record.
 * Extracted from ModularPatientDashboard to keep UI code under the 350-line limit.
 */

import { fetchPatientVitals } from '../services/patient/patientService';
import { fetchPatientMedications } from '../services/clinical/medicationService';
import { fetchPatientAssessments } from '../services/patient/assessmentService';
import { fetchPatientBowelRecords } from '../services/clinical/bowelRecordService';
import { fetchAdmissionRecord, fetchAdvancedDirective } from '../services/patient/admissionService';
import { fetchDoctorsOrders } from '../services/clinical/doctorsOrdersService';
import { getLabPanels, getLabResults } from '../services/clinical/labService';
import type { LabPanel, LabResult } from '../features/patients/types/labs';
import type { Patient } from '../types';
import { secureLogger } from '../lib/security/secureLogger';
import { escapeHtml as e } from './sanitization';

export async function printPatientRecord(patient: Patient, tenantId: string): Promise<void> {
  if (!patient?.id) {
    alert('Patient data not available for record generation.');
    return;
  }

  try {
    secureLogger.debug(`Fetching data for patient record: ${patient.id}, tenant: ${tenantId}`);

    const [vitalsData, medicationsData, assessmentsData, bowelRecordsData, admissionData, directiveData, ordersData, labPanelsResponse] = await Promise.all([
      fetchPatientVitals(patient.id),
      fetchPatientMedications(patient.id),
      fetchPatientAssessments(patient.id),
      fetchPatientBowelRecords(patient.id),
      fetchAdmissionRecord(patient.id),
      fetchAdvancedDirective(patient.id),
      fetchDoctorsOrders(patient.id),
      getLabPanels(patient.id, tenantId),
    ]);

    const labPanelsData = labPanelsResponse.data || [];

    const labPanelsWithResults = await Promise.all(
      labPanelsData.map(async (panel: LabPanel) => {
        const resultsResponse = await getLabResults(panel.id);
        return { ...panel, results: resultsResponse.data || [] };
      })
    );

    const formattedVitalsData = vitalsData.map(vital => ({
      ...vital,
      bloodPressureDisplay:
        vital.bloodPressure?.systolic && vital.bloodPressure?.diastolic
          ? `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}`
          : 'N/A',
      respiratoryRateDisplay: vital.respiratoryRate ?? 'N/A',
      oxygenSaturationDisplay: vital.oxygenSaturation ?? 'N/A',
      roomAirIndicator:
        vital.oxygenSaturation >= 95 && vital.oxygenSaturation <= 100 ? ' (RA)' : '',
    }));

    const reportWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    if (!reportWindow) {
      alert('Please allow popups to generate the patient record.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Patient Medical Record - ${e(patient.first_name)} ${e(patient.last_name)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.4; color: #000; background: #fff; }
            .record-container { max-width: 8.5in; margin: 0 auto; padding: 0.75in; background: white; min-height: 11in; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .hospital-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-img { max-width: 200px; height: auto; margin: 0 auto 10px auto; display: block; }
            .hospital-logo { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 3px; letter-spacing: 1px; }
            .hospital-address { font-size: 10px; color: #333; margin-bottom: 8px; }
            .record-type { font-size: 16px; font-weight: bold; color: #d63384; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }
            .simulation-disclaimer { background: #fff3cd; border: 2px solid #856404; padding: 8px 12px; margin: 15px 0; font-size: 9px; text-align: center; color: #856404; font-weight: bold; border-radius: 4px; }
            .patient-id-bar { background: #f0f0f0; border: 2px solid #000; padding: 10px; margin: 15px 0; text-align: center; font-weight: bold; font-size: 14px; }
            .form-section { margin-bottom: 25px; border: 1px solid #000; page-break-inside: avoid; }
            .section-header { background: #000; color: #fff; padding: 8px 12px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
            .section-content { padding: 15px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .info-row { display: flex; margin-bottom: 8px; align-items: baseline; }
            .info-label { font-weight: bold; min-width: 120px; margin-right: 10px; text-transform: uppercase; font-size: 11px; }
            .info-value { flex: 1; border-bottom: 1px solid #ccc; padding-bottom: 2px; font-size: 12px; }
            .alert-box { background: #fff3cd; border: 3px solid #dc3545; padding: 12px; margin: 15px 0; font-weight: bold; text-align: center; font-size: 14px; }
            .alert-box.no-alerts { background: #d4edda; border-color: #28a745; color: #155724; }
            .medication-table, .vitals-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .medication-table th, .medication-table td, .vitals-table th, .vitals-table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            .medication-table th, .vitals-table th { background: #f5f5f5; font-weight: bold; text-transform: uppercase; }
            .notes-section { margin-top: 15px; }
            .note-entry { border: 1px solid #ccc; margin-bottom: 10px; padding: 10px; background: #fafafa; }
            .note-header { font-weight: bold; font-size: 11px; color: #333; margin-bottom: 5px; text-transform: uppercase; }
            .note-content { font-size: 11px; line-height: 1.5; margin-bottom: 5px; }
            .note-meta { font-size: 9px; color: #666; font-style: italic; }
            .signature-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #000; }
            .signature-line { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .sig-field { flex: 1; margin-right: 30px; }
            .sig-field:last-child { margin-right: 0; }
            .sig-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 5px; }
            .sig-label { font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .record-footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9px; color: #666; text-align: center; }
            .confidentiality-notice { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; margin-top: 15px; font-size: 9px; text-align: justify; }
            .action-buttons { position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; gap: 10px; }
            .btn { padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .btn-print { background: #007bff; color: white; }
            .btn-close { background: #6c757d; color: white; }
            .btn:hover { opacity: 0.8; }
            @media print {
              .action-buttons { display: none; }
              .record-container { box-shadow: none; padding: 0.5in; max-width: none; }
              @page { margin: 0.5in; size: letter; }
            }
            @media screen and (max-width: 768px) {
              .record-container { padding: 20px; max-width: 100%; }
              .info-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="action-buttons">
            <button class="btn btn-print" onclick="window.print()">Print Record</button>
            <button class="btn btn-close" onclick="window.close()">Close</button>
          </div>

          <div class="record-container">
            <div class="hospital-header">
              <img src="/images/logo.svg" alt="HacCare Logo" class="logo-img" />
              <div class="hospital-logo">HACCARE MEDICAL CENTER</div>
              <div class="hospital-address">
                1234 Healthcare Drive • Medical City, MC 12345<br>
                Phone: (555) 123-4567 • Fax: (555) 123-4568
              </div>
              <div class="record-type">Simulation Hospital Record</div>
            </div>

            <div class="simulation-disclaimer">
              ⚠️ SIMULATED PATIENT RECORD FOR EDUCATIONAL PURPOSES ONLY - NOT A REAL MEDICAL RECORD ⚠️
            </div>

            <div class="patient-id-bar">
              PATIENT: ${e(patient.first_name?.toUpperCase())} ${e(patient.last_name?.toUpperCase())} | ID: ${e(patient.patient_id)} | DOB: ${e(new Date(patient.date_of_birth).toLocaleDateString())}
            </div>

            <div class="form-section">
              <div class="section-header">Patient Demographics</div>
              <div class="section-content">
                <div class="info-grid">
                  <div>
                    <div class="info-row"><span class="info-label">Last Name:</span><span class="info-value">${e(patient.last_name)}</span></div>
                    <div class="info-row"><span class="info-label">First Name:</span><span class="info-value">${e(patient.first_name)}</span></div>
                    <div class="info-row"><span class="info-label">Date of Birth:</span><span class="info-value">${e(new Date(patient.date_of_birth).toLocaleDateString())}</span></div>
                    <div class="info-row"><span class="info-label">Age:</span><span class="info-value">${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years</span></div>
                  </div>
                  <div>
                    <div class="info-row"><span class="info-label">Gender:</span><span class="info-value">${e(patient.gender)}</span></div>
                    <div class="info-row"><span class="info-label">Blood Type:</span><span class="info-value">${e(patient.blood_type)}</span></div>
                    <div class="info-row"><span class="info-label">Room Number:</span><span class="info-value">${e(patient.room_number)}</span></div>
                    <div class="info-row"><span class="info-label">Bed Number:</span><span class="info-value">${e(patient.bed_number)}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Admission Information</div>
              <div class="section-content">
                <div class="info-row"><span class="info-label">Admission Date:</span><span class="info-value">${e(new Date(patient.admission_date).toLocaleDateString())}</span></div>
                <div class="info-row"><span class="info-label">Current Condition:</span><span class="info-value">${e(patient.condition)}</span></div>
                <div class="info-row"><span class="info-label">Primary Diagnosis:</span><span class="info-value">${e(patient.diagnosis)}</span></div>
                <div class="info-row"><span class="info-label">Assigned Nurse:</span><span class="info-value">${e(patient.assigned_nurse || 'No nurse assigned')}</span></div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Emergency Contact Information</div>
              <div class="section-content">
                <div class="info-row"><span class="info-label">Contact Name:</span><span class="info-value">${e(patient.emergency_contact_name)}</span></div>
                <div class="info-row"><span class="info-label">Relationship:</span><span class="info-value">${e(patient.emergency_contact_relationship)}</span></div>
                <div class="info-row"><span class="info-label">Phone Number:</span><span class="info-value">${e(patient.emergency_contact_phone)}</span></div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Allergies and Medical Alerts</div>
              <div class="section-content">
                ${patient.allergies && patient.allergies.length > 0
                  ? `<div class="alert-box">⚠️ CRITICAL ALLERGIES: ${patient.allergies.map((a: string) => e(a)).join(' • ')}</div>`
                  : `<div class="alert-box no-alerts">✓ NO KNOWN ALLERGIES</div>`
                }
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Current Medications</div>
              <div class="section-content">
                <table class="medication-table">
                  <thead>
                    <tr>
                      <th>Medication Name</th><th>Dosage</th><th>Frequency</th><th>Route</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${medicationsData.filter(med => med.status === 'Active').length > 0
                      ? medicationsData.filter(med => med.status === 'Active').map(med => `
                          <tr>
                            <td>${e(med.name)}</td><td>${e(med.dosage)}</td><td>${e(med.frequency)}</td><td>${e(med.route)}</td><td>${e(med.status)}</td>
                          </tr>`).join('')
                      : '<tr><td colspan="5" style="text-align:center;font-style:italic;">No active medications recorded</td></tr>'
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Laboratory Results</div>
              <div class="section-content">
                ${labPanelsWithResults.length > 0 ? labPanelsWithResults.slice(0, 5).map((panel: any) => `
                  <div style="margin-bottom:25px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;padding:12px 16px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div><strong>Panel Time:</strong> ${e(new Date(panel.panel_time).toLocaleString())}</div>
                        <span style="padding:4px 12px;border-radius:4px;font-size:11px;font-weight:bold;background:${panel.status === 'new' ? '#fee2e2' : panel.status === 'partial_ack' ? '#fef3c7' : '#d1fae5'};color:${panel.status === 'new' ? '#dc2626' : panel.status === 'partial_ack' ? '#d97706' : '#065f46'};">${e(panel.status)}</span>
                      </div>
                      <div style="margin-top:4px;font-size:12px;"><strong>Source:</strong> ${e(panel.source)} | <strong>Entered By:</strong> ${e(panel.entered_by_name || 'Unknown')}${panel.notes ? ` | <strong>Notes:</strong> ${e(panel.notes)}` : ''}</div>
                    </div>
                    ${panel.results && panel.results.length > 0 ? `
                      <table class="medication-table" style="margin:0;border:none;">
                        <thead><tr style="background:#f9fafb;"><th>Test Name</th><th>Value</th><th>Units</th><th>Reference Range</th><th>Flag</th><th>Category</th></tr></thead>
                        <tbody>
                          ${panel.results.map((result: LabResult) => `
                            <tr style="background:${result.flag === 'critical_high' || result.flag === 'critical_low' ? '#fee2e2' : result.flag === 'abnormal_high' || result.flag === 'abnormal_low' ? '#fef3c7' : 'white'};">
                              <td><strong>${e(result.test_name)}</strong></td>
                              <td style="font-weight:bold;color:${result.flag === 'critical_high' || result.flag === 'critical_low' ? '#dc2626' : result.flag === 'abnormal_high' || result.flag === 'abnormal_low' ? '#d97706' : '#065f46'};">${result.value !== null ? e(String(result.value)) : 'N/A'}</td>
                              <td>${e(result.units || '-')}</td>
                              <td>${result.ref_operator === '<=' ? '≤' + e(String(result.ref_high)) : result.ref_operator === '>=' ? '≥' + e(String(result.ref_low)) : e(String(result.ref_low || '-')) + ' - ' + e(String(result.ref_high || '-'))}</td>
                              <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;background:${result.flag === 'critical_high' || result.flag === 'critical_low' ? '#dc2626' : result.flag === 'abnormal_high' || result.flag === 'abnormal_low' ? '#d97706' : '#10b981'};color:white;">${result.flag === 'normal' ? '✓' : result.flag === 'critical_high' ? '↑↑' : result.flag === 'critical_low' ? '↓↓' : result.flag === 'abnormal_high' ? '↑' : '↓'}</span></td>
                              <td style="font-size:11px;color:#6b7280;">${e(result.category)}</td>
                            </tr>`).join('')}
                        </tbody>
                      </table>` : '<p style="padding:16px;text-align:center;font-style:italic;color:#6b7280;">No test results recorded for this panel</p>'}
                  </div>`).join('')
                : '<p style="text-align:center;font-style:italic;margin:20px 0;">No laboratory panels recorded</p>'}
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Latest Vital Signs</div>
              <div class="section-content">
                ${formattedVitalsData.length > 0 ? `
                  <table class="vitals-table">
                    <thead><tr><th>Temperature</th><th>Heart Rate</th><th>Blood Pressure</th><th>Respiratory Rate</th><th>O2 Saturation</th><th>Recorded</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>${e(String(formattedVitalsData[0].temperature))}°F</td>
                        <td>${e(String(formattedVitalsData[0].heartRate))} bpm</td>
                        <td>${e(String(formattedVitalsData[0].bloodPressureDisplay))}</td>
                        <td>${e(String(formattedVitalsData[0].respiratoryRateDisplay))}/min</td>
                        <td>${e(String(formattedVitalsData[0].oxygenSaturationDisplay))}%${e(formattedVitalsData[0].roomAirIndicator)}</td>
                        <td>${formattedVitalsData[0].recorded_at ? e(new Date(formattedVitalsData[0].recorded_at).toLocaleString()) : 'Not recorded'}</td>
                      </tr>
                    </tbody>
                  </table>` : '<p style="text-align:center;font-style:italic;margin:20px 0;">No vital signs recorded</p>'}
              </div>
            </div>

            <div class="form-section">
              <div class="section-header">Clinical Assessment Forms</div>
              <div class="section-content">
                <div class="notes-section">
                  ${admissionData ? `
                    <div class="note-entry" style="background:#fefce8;border-color:#eab308;">
                      <div class="note-header" style="color:#854d0e;">📝 Admission Assessment</div>
                      <div class="note-content">
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px;">
                          ${admissionData.created_at ? `<div><span style="font-weight:600;color:#854d0e;">Admission Date:</span> <span>${e(new Date(admissionData.created_at).toLocaleString())}</span></div>` : ''}
                          ${admissionData.admission_type ? `<div><span style="font-weight:600;color:#854d0e;">Admission Type:</span> <span>${e(admissionData.admission_type)}</span></div>` : ''}
                          ${admissionData.chief_complaint ? `<div style="grid-column:span 2;"><span style="font-weight:600;color:#854d0e;">Chief Complaint:</span> <span>${e(admissionData.chief_complaint)}</span></div>` : ''}
                          ${admissionData.attending_physician ? `<div><span style="font-weight:600;color:#854d0e;">Attending Physician:</span> <span>${e(admissionData.attending_physician)}</span></div>` : ''}
                        </div>
                        ${admissionData.secondary_contact_name ? `
                          <div style="background:#f8fafc;padding:10px;border-radius:6px;margin-top:10px;">
                            <div style="font-weight:600;color:#475569;margin-bottom:6px;">Secondary Contact</div>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:13px;">
                              <div><strong>Name:</strong> ${e(admissionData.secondary_contact_name)}</div>
                              ${admissionData.secondary_contact_phone ? `<div><strong>Phone:</strong> ${e(admissionData.secondary_contact_phone)}</div>` : ''}
                              ${admissionData.secondary_contact_relationship ? `<div><strong>Relationship:</strong> ${e(admissionData.secondary_contact_relationship)}</div>` : ''}
                            </div>
                          </div>` : ''}
                      </div>
                    </div>` : '<div class="note-entry"><div class="note-content" style="text-align:center;font-style:italic;">No admission assessment recorded</div></div>'}

                  ${directiveData ? `
                    <div class="note-entry" style="background:#fef2f2;border:2px solid ${directiveData.dnr_status === 'Full Code' ? '#22c55e' : '#ef4444'};">
                      <div class="note-header" style="color:${directiveData.dnr_status === 'Full Code' ? '#166534' : '#991b1b'};">⚕️ Advanced Directives</div>
                      <div class="note-content">
                        <strong>DNR Status:</strong> <span style="font-weight:bold;font-size:16px;color:${directiveData.dnr_status === 'Full Code' ? '#22c55e' : '#ef4444'};">${e(directiveData.dnr_status || 'Not Specified')}</span><br>
                        <strong>Healthcare Proxy:</strong> ${e(directiveData.healthcare_proxy_name || 'None designated')}<br>
                        ${directiveData.healthcare_proxy_phone ? `<strong>Proxy Contact:</strong> ${e(directiveData.healthcare_proxy_phone)}<br>` : ''}
                        <strong>Organ Donation:</strong> ${e(directiveData.organ_donation_status || 'Not specified')}<br>
                        ${directiveData.religious_preference ? `<strong>Religious Preference:</strong> ${e(directiveData.religious_preference)}<br>` : ''}
                        ${directiveData.special_instructions ? `<strong>Special Instructions:</strong> ${e(directiveData.special_instructions)}` : ''}
                      </div>
                      <div class="note-meta">End-of-life care preferences and legal healthcare decisions</div>
                    </div>` : '<div class="note-entry"><div class="note-content" style="text-align:center;font-style:italic;">No advanced directives recorded</div></div>'}

                  ${assessmentsData.length > 0 ? `
                    <div class="note-entry" style="background:#f0f9ff;border-color:#3b82f6;">
                      <div class="note-header" style="color:#1e40af;">📋 Nursing Assessments (${assessmentsData.length} on file)</div>
                      <div class="note-content">
                        ${assessmentsData.map((assessment, idx) => {
                          let parsedData: any = null;
                          try { parsedData = JSON.parse(assessment.assessment_notes); } catch (_e) { /* plain text */ }

                          if (parsedData && typeof parsedData === 'object') {
                            return `
                              ${idx > 0 ? '<hr style="margin:15px 0;border:none;border-top:1px solid #e5e7eb;">' : ''}
                              <div style="margin-bottom:${idx < assessmentsData.length - 1 ? '15px' : '0'};">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                  <strong style="font-size:14px;color:#1e40af;font-weight:700;">${parsedData.assessmentType ? e(parsedData.assessmentType.toUpperCase()) : 'NURSING ASSESSMENT'}</strong>
                                  <span style="font-size:12px;color:#64748b;">${e(new Date(parsedData.assessmentDate || assessment.created_at || '').toLocaleString())}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                                  ${parsedData.generalAppearance ? `<div><span style="font-weight:600;color:#475569;">General Appearance:</span> ${e(parsedData.generalAppearance)}</div>` : ''}
                                  ${parsedData.levelOfConsciousness ? `<div><span style="font-weight:600;color:#475569;">LOC:</span> ${e(parsedData.levelOfConsciousness)}</div>` : ''}
                                  ${parsedData.respiratoryAssessment ? `<div style="grid-column:span 2;"><span style="font-weight:600;color:#475569;">Respiratory:</span> ${e(parsedData.respiratoryAssessment)}</div>` : ''}
                                  ${parsedData.cardiovascularAssessment ? `<div style="grid-column:span 2;"><span style="font-weight:600;color:#475569;">Cardiovascular:</span> ${e(parsedData.cardiovascularAssessment)}</div>` : ''}
                                  ${parsedData.motorFunction ? `<div><span style="font-weight:600;color:#475569;">Motor Function:</span> ${e(parsedData.motorFunction)}</div>` : ''}
                                  ${parsedData.cognitiveFunction ? `<div><span style="font-weight:600;color:#475569;">Cognitive Function:</span> ${e(parsedData.cognitiveFunction)}</div>` : ''}
                                  ${parsedData.skinCondition ? `<div><span style="font-weight:600;color:#475569;">Skin Condition:</span> ${e(parsedData.skinCondition)}</div>` : ''}
                                  ${parsedData.pressureUlcerRisk ? `<div><span style="font-weight:600;color:${parsedData.pressureUlcerRisk === 'high' ? '#dc2626' : '#475569'};">Pressure Ulcer Risk:</span> ${e(parsedData.pressureUlcerRisk)}</div>` : ''}
                                  ${parsedData.fallRiskScore != null ? `<div><span style="font-weight:600;color:#475569;">Fall Risk Score:</span> ${e(String(parsedData.fallRiskScore))}</div>` : ''}
                                  ${parsedData.fallRiskFactors ? `<div><span style="font-weight:600;color:#475569;">Fall Risk Factors:</span> ${e(parsedData.fallRiskFactors)}</div>` : ''}
                                </div>
                                ${parsedData.assessmentNotes ? `<div style="background:#f8fafc;padding:10px;border-radius:6px;margin-top:10px;"><div style="font-weight:600;color:#1e40af;margin-bottom:6px;">Assessment Notes</div><div style="font-size:13px;color:#334155;">${e(parsedData.assessmentNotes)}</div></div>` : ''}
                                ${parsedData.recommendations ? `<div style="background:#f0fdf4;padding:10px;border-radius:6px;margin-top:10px;"><div style="font-weight:600;color:#059669;margin-bottom:6px;">Recommendations</div><div style="font-size:13px;color:#334155;">${e(parsedData.recommendations)}</div></div>` : ''}
                                <div style="margin-top:10px;font-size:12px;color:#64748b;"><strong>Assessed by:</strong> ${e(parsedData.nurseName || assessment.nurse_name)} • <strong>Priority:</strong> ${e(parsedData.priorityLevel || assessment.priority_level || 'routine')}</div>
                              </div>`;
                          } else {
                            return `
                              ${idx > 0 ? '<hr style="margin:15px 0;border:none;border-top:1px solid #e5e7eb;">' : ''}
                              <div>
                                <strong>Assessment #${idx + 1}:</strong> ${e(new Date(assessment.created_at || '').toLocaleDateString())}<br>
                                <strong>By:</strong> ${e(assessment.nurse_name)}<br>
                                <strong>Notes:</strong> ${e(assessment.assessment_notes || 'No notes provided')}
                              </div>`;
                          }
                        }).join('')}
                      </div>
                    </div>` : '<div class="note-entry"><div class="note-content" style="text-align:center;font-style:italic;">No nursing assessments recorded</div></div>'}

                  ${bowelRecordsData.length > 0 ? `
                    <div class="note-entry" style="background:#f0fdf4;border-color:#22c55e;">
                      <div class="note-header" style="color:#166534;">📊 Bowel Records (${bowelRecordsData.length} on file)</div>
                      <div class="note-content">
                        <strong>Latest:</strong> ${e(new Date(bowelRecordsData[0].recorded_at).toLocaleString())}<br>
                        <strong>Continence:</strong> ${e(bowelRecordsData[0].bowel_incontinence)} | <strong>Appearance:</strong> ${e(bowelRecordsData[0].stool_appearance)}<br>
                        <strong>Consistency:</strong> ${e(bowelRecordsData[0].stool_consistency)}, <strong>Colour:</strong> ${e(bowelRecordsData[0].stool_colour)}, <strong>Amount:</strong> ${e(bowelRecordsData[0].stool_amount)}
                        ${bowelRecordsData[0].notes ? `<br><strong>Notes:</strong> ${e(bowelRecordsData[0].notes)}` : ''}
                      </div>
                      <div class="note-meta">Recorded by: ${e(bowelRecordsData[0].nurse_name)}</div>
                    </div>` : '<div class="note-entry"><div class="note-content" style="text-align:center;font-style:italic;">No bowel records documented</div></div>'}
                </div>
              </div>
            </div>

            ${ordersData && ordersData.length > 0 ? `
            <div class="form-section">
              <div class="section-header">Active Doctors Orders</div>
              <div class="section-content">
                <table class="medication-table">
                  <thead><tr><th>Date</th><th>Time</th><th>Order Text</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>
                    ${ordersData.slice(0, 10).map(order => `
                      <tr>
                        <td>${e(order.order_date)}</td><td>${e(order.order_time)}</td><td>${e(order.order_text)}</td><td>${e(order.order_type)}</td>
                        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;background:${order.is_acknowledged ? '#d1fae5' : '#fee2e2'};color:${order.is_acknowledged ? '#065f46' : '#dc2626'};"> ${order.is_acknowledged ? 'Acknowledged' : 'Pending'}</span></td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>` : ''}

            <div class="signature-section">
              <div class="signature-line">
                <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Attending Physician Signature</div></div>
                <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Date</div></div>
              </div>
              <div class="signature-line">
                <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Nurse Signature</div></div>
                <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Date</div></div>
              </div>
            </div>

            <div class="record-footer">
              <div><strong>Record Generated:</strong> ${e(new Date().toLocaleString())}</div>
              <div><strong>Generated By:</strong> hacCare Medical Records System</div>
              <div class="simulation-disclaimer" style="margin-top:15px;">
                ⚠️ SIMULATION RECORD DISCLAIMER: This document is a simulated patient record created for healthcare education and training purposes only. It does not represent actual patient data, real medical diagnoses, or genuine clinical encounters. This record should not be used for any actual clinical decision-making, billing, legal purposes, or patient care. All information contained herein is fictional and for instructional use only.
              </div>
              <div class="confidentiality-notice">
                <strong>CONFIDENTIALITY NOTICE:</strong> This medical record contains confidential patient health information protected by federal and state privacy laws including HIPAA. This information is intended solely for the use of authorized healthcare providers and personnel involved in the patient's care. Any unauthorized review, disclosure, copying, distribution, or use of this information is strictly prohibited and may be subject to legal penalties. If you have received this record in error, please notify the sender immediately and destroy all copies.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Use a Blob URL instead of document.write() to avoid DOM-based XSS sink.
    // All patient data is already escaped via e() (escapeHtml), but this approach
    // eliminates the document.write sink entirely so static analysis tools are satisfied.
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    reportWindow.location.href = blobUrl;
    // Revoke the object URL after a short delay — the browser holds the blob
    // alive until the page finishes loading regardless of early revocation.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    reportWindow.focus();
  } catch (error) {
    secureLogger.error('Error generating patient record:', error);
    alert('Error generating patient record. Please try again.');
  }
}
