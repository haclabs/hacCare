/**
 * Modern Professional Patient Dashboard
 * 
 * A beautifully designed, modern patient overview system with enhanced styling,
 * gradient backgrounds, improved cards, better typography, and professional visuals.
 * 
 * Features:
 * - Modern gradient design with professional styling
 * - Enhanced typography and visual hierarchy
 * - Interactive hover effects and animations
 * - Comprehensive patient status indicators
 * - Real-time vital signs display with icons
 * - Medication management with category indicators
 * - Quick action workflows with enhanced UX
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Pill, 
  FileText, 
  User, 
  Settings,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  BedDouble,
  Badge,
  FileCheck,
  ArrowRight,
  Camera,
  MessageSquare,
  FlaskConical,
  MapPin
} from 'lucide-react';
import { VitalsModule } from '../features/clinical/components/vitals';
import { MARModule } from '../features/clinical/components/mar';
import { FormsModule } from '../features/forms';
import { WoundCareModule } from '../features/clinical/components/wound-care';
import { SchemaTemplateEditor } from './SchemaTemplateEditor';
import { HandoverNotes } from '../features/patients/components/handover/HandoverNotes';
import { AvatarBoard } from '../features/hacmap/AvatarBoard';
import { AdvancedDirectivesForm } from '../features/patients/components/forms/AdvancedDirectivesForm';
import { DoctorsOrders } from '../features/patients/components/DoctorsOrders';
import { Labs } from '../features/patients/components/Labs';
import { IntakeOutputCard } from '../features/clinical/components/intake-output';
import { Patient, DoctorsOrder } from '../types';
import { fetchPatientById, fetchPatientVitals } from '../services/patient/patientService';
import { fetchPatientMedications } from '../services/clinical/medicationService';
import { fetchAdmissionRecord, fetchAdvancedDirective, upsertAdmissionRecord, AdmissionRecord, AdvancedDirective } from '../services/patient/admissionService';
import { supabase } from '../lib/api/supabase';
import { fetchDoctorsOrders } from '../services/clinical/doctorsOrdersService';
import { fetchPatientAssessments, createAssessment } from '../services/patient/assessmentService';
import { fetchPatientBowelRecords, createBowelRecord } from '../services/clinical/bowelRecordService';
import { getLabPanels, getLabResults, hasUnacknowledgedLabs } from '../services/clinical/labService';
import { WoundCareService } from '../services/patient/woundCareService';
import type { LabPanel, LabResult } from '../features/clinical/types/labs';
import { useTenant } from '../contexts/TenantContext';
import { useDoctorsOrdersAlert } from '../hooks/useDoctorsOrdersAlert';

interface ModularPatientDashboardProps {
  onShowBracelet?: (patient: Patient) => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
}

type ActiveModule = 'vitals' | 'medications' | 'forms' | 'wound-care' | 'overview' | 'handover' | 'advanced-directives' | 'hacmap';

interface ModuleConfig {
  id: ActiveModule;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  badge?: string;
}

export const ModularPatientDashboard: React.FC<ModularPatientDashboardProps> = ({
  onShowBracelet,
  currentUser
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMultiTenantAdmin, currentTenant } = useTenant();
  const [activeModule, setActiveModule] = useState<ActiveModule>('overview');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showDoctorsOrders, setShowDoctorsOrders] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  
  const handleOrdersChange = () => {
    // Trigger a refresh of the orders count
    setOrdersRefreshTrigger(prev => prev + 1);
  };
  
  const handleLabsChange = () => {
    // Trigger a refresh of the labs count
    setLabsRefreshTrigger(prev => prev + 1);
  };
  
  // Track unacknowledged doctors orders
  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0);
  const { unacknowledgedCount } = useDoctorsOrdersAlert(patient?.id || '', ordersRefreshTrigger);
  
  // Track unacknowledged labs
  const [labsRefreshTrigger, setLabsRefreshTrigger] = useState(0);
  const [unacknowledgedLabsCount, setUnacknowledgedLabsCount] = useState(0);
  


  // Generate comprehensive hospital-style patient record
  const handlePrintRecord = async () => {
    if (!patient?.id) {
      alert('Patient data not available for record generation.');
      return;
    }

    try {
      // Get all patient data for comprehensive record including clinical assessments
      console.log('🔍 DEBUG: Fetching lab panels for patient.id:', patient.id, 'tenant:', currentTenant?.id);
      
      const [vitalsData, medicationsData, assessmentsData, bowelRecordsData, admissionData, directiveData, ordersData, labPanelsResponse] = await Promise.all([
        fetchPatientVitals(patient.id),
        fetchPatientMedications(patient.id),
        fetchPatientAssessments(patient.id),
        fetchPatientBowelRecords(patient.id),
        fetchAdmissionRecord(patient.id),
        fetchAdvancedDirective(patient.id),
        fetchDoctorsOrders(patient.id),
        getLabPanels(patient.id, currentTenant?.id || '')
      ]);

      const labPanelsData = labPanelsResponse.data || [];
      
      // Fetch lab results for each panel
      const labPanelsWithResults = await Promise.all(
        labPanelsData.map(async (panel: LabPanel) => {
          const resultsResponse = await getLabResults(panel.id);
          return {
            ...panel,
            results: resultsResponse.data || []
          };
        })
      );
      
      // Debug: Log lab panels data
      console.log('🔍 DEBUG: labPanelsResponse:', labPanelsResponse);
      console.log('🔍 DEBUG: labPanelsData:', labPanelsData);
      console.log('🔍 DEBUG: labPanelsData.length:', labPanelsData.length);
      console.log('🔍 DEBUG: labPanelsWithResults:', labPanelsWithResults);
      
      // Debug: Log assessments data
      console.log('🔍 DEBUG: assessmentsData:', assessmentsData);
      if (assessmentsData.length > 0) {
        console.log('🔍 DEBUG: First assessment:', assessmentsData[0]);
        console.log('🔍 DEBUG: assessment_notes field:', assessmentsData[0].assessment_notes);
        console.log('🔍 DEBUG: typeof assessment_notes:', typeof assessmentsData[0].assessment_notes);
      }
      
      // Debug: Log advanced directives data
      console.log('🔍 DEBUG: directiveData:', directiveData);
      console.log('Assessments Data for patient record:', assessmentsData);
      if (assessmentsData.length > 0) {
        console.log('First assessment:', assessmentsData[0]);
        console.log('First assessment notes:', assessmentsData[0].assessment_notes);
      }

      // Create a new window for the hospital record
      const reportWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (!reportWindow) {
        alert('Please allow popups to generate the patient record.');
        return;
      }

      reportWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Patient Medical Record - ${patient.first_name} ${patient.last_name}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              
              body { 
                font-family: 'Times New Roman', serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: #fff;
                padding: 0;
                margin: 0;
              }
              
              .record-container {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.75in;
                background: white;
                min-height: 11in;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
              }
              
              .hospital-header {
                text-align: center;
                border-bottom: 3px double #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              
              .logo-img {
                max-width: 200px;
                height: auto;
                margin: 0 auto 10px auto;
                display: block;
              }
              
              .hospital-logo {
                font-size: 24px;
                font-weight: bold;
                color: #000;
                margin-bottom: 3px;
                letter-spacing: 1px;
              }
              
              .hospital-address {
                font-size: 10px;
                color: #333;
                margin-bottom: 8px;
              }
              
              .record-type {
                font-size: 16px;
                font-weight: bold;
                color: #d63384;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 8px;
              }
              
              .simulation-disclaimer {
                background: #fff3cd;
                border: 2px solid #856404;
                padding: 8px 12px;
                margin: 15px 0;
                font-size: 9px;
                text-align: center;
                color: #856404;
                font-weight: bold;
                border-radius: 4px;
              }
              
              .patient-id-bar {
                background: #f0f0f0;
                border: 2px solid #000;
                padding: 10px;
                margin: 15px 0;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
              }
              
              .form-section {
                margin-bottom: 25px;
                border: 1px solid #000;
                page-break-inside: avoid;
              }
              
              .section-header {
                background: #000;
                color: #fff;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .section-content {
                padding: 15px;
              }
              
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
              }
              
              .info-row {
                display: flex;
                margin-bottom: 8px;
                align-items: baseline;
              }
              
              .info-label {
                font-weight: bold;
                min-width: 120px;
                margin-right: 10px;
                text-transform: uppercase;
                font-size: 11px;
              }
              
              .info-value {
                flex: 1;
                border-bottom: 1px solid #ccc;
                padding-bottom: 2px;
                font-size: 12px;
              }
              
              .alert-box {
                background: #fff3cd;
                border: 3px solid #dc3545;
                padding: 12px;
                margin: 15px 0;
                font-weight: bold;
                text-align: center;
                font-size: 14px;
              }
              
              .alert-box.no-alerts {
                background: #d4edda;
                border-color: #28a745;
                color: #155724;
              }
              
              .medication-table, .vitals-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              
              .medication-table th, .medication-table td,
              .vitals-table th, .vitals-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
                font-size: 11px;
              }
              
              .medication-table th, .vitals-table th {
                background: #f5f5f5;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .notes-section {
                margin-top: 15px;
              }
              
              .note-entry {
                border: 1px solid #ccc;
                margin-bottom: 10px;
                padding: 10px;
                background: #fafafa;
              }
              
              .note-header {
                font-weight: bold;
                font-size: 11px;
                color: #333;
                margin-bottom: 5px;
                text-transform: uppercase;
              }
              
              .note-content {
                font-size: 11px;
                line-height: 1.5;
                margin-bottom: 5px;
              }
              
              .note-meta {
                font-size: 9px;
                color: #666;
                font-style: italic;
              }
              
              .signature-section {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #000;
              }
              
              .signature-line {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
              }
              
              .sig-field {
                flex: 1;
                margin-right: 30px;
              }
              
              .sig-field:last-child {
                margin-right: 0;
              }
              
              .sig-line {
                border-bottom: 1px solid #000;
                height: 30px;
                margin-bottom: 5px;
              }
              
              .sig-label {
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .record-footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ccc;
                font-size: 9px;
                color: #666;
                text-align: center;
              }
              
              .confidentiality-notice {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                padding: 10px;
                margin-top: 15px;
                font-size: 9px;
                text-align: justify;
              }
              
              .action-buttons {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                display: flex;
                gap: 10px;
              }
              
              .btn {
                padding: 10px 15px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .btn-print {
                background: #007bff;
                color: white;
              }
              
              .btn-close {
                background: #6c757d;
                color: white;
              }
              
              .btn:hover {
                opacity: 0.8;
              }
              
              @media print {
                .action-buttons { display: none; }
                .record-container { 
                  box-shadow: none; 
                  padding: 0.5in;
                  max-width: none;
                }
                @page { 
                  margin: 0.5in;
                  size: letter;
                }
              }
              
              @media screen and (max-width: 768px) {
                .record-container {
                  padding: 20px;
                  max-width: 100%;
                }
                .info-grid {
                  grid-template-columns: 1fr;
                }
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
                <img src="/src/images/logo.png" alt="HacCare Logo" class="logo-img" />
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
                PATIENT: ${patient.first_name?.toUpperCase()} ${patient.last_name?.toUpperCase()} | ID: ${patient.patient_id} | DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}
              </div>

              <div class="form-section">
                <div class="section-header">Patient Demographics</div>
                <div class="section-content">
                  <div class="info-grid">
                    <div>
                      <div class="info-row">
                        <span class="info-label">Last Name:</span>
                        <span class="info-value">${patient.last_name}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">First Name:</span>
                        <span class="info-value">${patient.first_name}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Date of Birth:</span>
                        <span class="info-value">${new Date(patient.date_of_birth).toLocaleDateString()}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years</span>
                      </div>
                    </div>
                    <div>
                      <div class="info-row">
                        <span class="info-label">Gender:</span>
                        <span class="info-value">${patient.gender}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Blood Type:</span>
                        <span class="info-value">${patient.blood_type}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Room Number:</span>
                        <span class="info-value">${patient.room_number}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Bed Number:</span>
                        <span class="info-value">${patient.bed_number}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Admission Information</div>
                <div class="section-content">
                  <div class="info-row">
                    <span class="info-label">Admission Date:</span>
                    <span class="info-value">${new Date(patient.admission_date).toLocaleDateString()}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Current Condition:</span>
                    <span class="info-value">${patient.condition}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Primary Diagnosis:</span>
                    <span class="info-value">${patient.diagnosis}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Assigned Nurse:</span>
                    <span class="info-value">${patient.assigned_nurse}</span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Emergency Contact Information</div>
                <div class="section-content">
                  <div class="info-row">
                    <span class="info-label">Contact Name:</span>
                    <span class="info-value">${patient.emergency_contact_name}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Relationship:</span>
                    <span class="info-value">${patient.emergency_contact_relationship}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Phone Number:</span>
                    <span class="info-value">${patient.emergency_contact_phone}</span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Allergies and Medical Alerts</div>
                <div class="section-content">
                  ${patient.allergies && patient.allergies.length > 0 
                    ? `<div class="alert-box">
                        ⚠️ CRITICAL ALLERGIES: ${patient.allergies.join(' • ')}
                      </div>`
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
                        <th>Medication Name</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Route</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${medicationsData.filter(med => med.status === 'Active').length > 0 
                        ? medicationsData.filter(med => med.status === 'Active').map(med => `
                          <tr>
                            <td>${med.name}</td>
                            <td>${med.dosage}</td>
                            <td>${med.frequency}</td>
                            <td>${med.route}</td>
                            <td>${med.status}</td>
                          </tr>
                        `).join('')
                        : '<tr><td colspan="5" style="text-align: center; font-style: italic;">No active medications recorded</td></tr>'
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Laboratory Results</div>
                <div class="section-content">
                  ${labPanelsWithResults.length > 0 ? labPanelsWithResults.slice(0, 5).map((panel: any) => `
                    <div style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <div>
                            <strong style="font-size: 14px;">Panel Time:</strong> ${new Date(panel.panel_time).toLocaleString()}
                          </div>
                          <div>
                            <span style="padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${panel.status === 'new' ? '#fee2e2' : panel.status === 'partial_ack' ? '#fef3c7' : '#d1fae5'}; color: ${panel.status === 'new' ? '#dc2626' : panel.status === 'partial_ack' ? '#d97706' : '#065f46'};">${panel.status}</span>
                          </div>
                        </div>
                        <div style="margin-top: 4px; font-size: 12px;">
                          <strong>Source:</strong> ${panel.source} | 
                          <strong>Entered By:</strong> ${panel.entered_by_name || 'Unknown'}
                          ${panel.notes ? ` | <strong>Notes:</strong> ${panel.notes}` : ''}
                        </div>
                      </div>
                      ${panel.results && panel.results.length > 0 ? `
                        <table class="medication-table" style="margin: 0; border: none;">
                          <thead>
                            <tr style="background: #f9fafb;">
                              <th>Test Name</th>
                              <th>Value</th>
                              <th>Units</th>
                              <th>Reference Range</th>
                              <th>Flag</th>
                              <th>Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${panel.results.map((result: LabResult) => `
                              <tr style="background: ${result.flag === 'critical_high' || result.flag === 'critical_low' ? '#fee2e2' : result.flag === 'abnormal_high' || result.flag === 'abnormal_low' ? '#fef3c7' : 'white'};">
                                <td><strong>${result.test_name}</strong></td>
                                <td style="font-weight: bold; color: ${result.flag === 'critical_high' || result.flag === 'critical_low' ? '#dc2626' : result.flag === 'abnormal_high' || result.flag === 'abnormal_low' ? '#d97706' : '#065f46'};">${result.value !== null ? result.value : 'N/A'}</td>
                                <td>${result.units || '-'}</td>
                                <td>${result.ref_operator === '<=' ? '≤' + result.ref_high : result.ref_operator === '>=' ? '≥' + result.ref_low : (result.ref_low || '-') + ' - ' + (result.ref_high || '-')}</td>
                                <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${result.flag === 'critical_high' || result.flag === 'critical_low' ? '#dc2626' : result.flag === 'abnormal_high' || result.flag === 'abnormal_low' ? '#d97706' : '#10b981'}; color: white;">${result.flag === 'normal' ? '✓' : result.flag === 'critical_high' ? '↑↑' : result.flag === 'critical_low' ? '↓↓' : result.flag === 'abnormal_high' ? '↑' : '↓'}</span></td>
                                <td style="font-size: 11px; color: #6b7280;">${result.category}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      ` : '<p style="padding: 16px; text-align: center; font-style: italic; color: #6b7280;">No test results recorded for this panel</p>'}
                    </div>
                  `).join('') : '<p style="text-align: center; font-style: italic; margin: 20px 0;">No laboratory panels recorded</p>'}
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Latest Vital Signs</div>
                <div class="section-content">
                  ${vitalsData.length > 0 ? `
                    <table class="vitals-table">
                      <thead>
                        <tr>
                          <th>Temperature</th>
                          <th>Heart Rate</th>
                          <th>Blood Pressure</th>
                          <th>Respiratory Rate</th>
                          <th>O2 Saturation</th>
                          <th>Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>${vitalsData[0].temperature}°F</td>
                          <td>${vitalsData[0].heartRate} bpm</td>
                          <td>${vitalsData[0].bloodPressure}</td>
                          <td>${vitalsData[0].respiratoryRate}/min</td>
                          <td>${vitalsData[0].oxygenSaturation}%</td>
                          <td>${vitalsData[0].recorded_at ? new Date(vitalsData[0].recorded_at).toLocaleString() : 'Not recorded'}</td>
                        </tr>
                      </tbody>
                    </table>
                  ` : '<p style="text-align: center; font-style: italic; margin: 20px 0;">No vital signs recorded</p>'}
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Clinical Assessment Forms</div>
                <div class="section-content">
                  <div class="notes-section">
                    ${admissionData ? `
                      <div class="note-entry" style="background: #fefce8; border-color: #eab308;">
                        <div class="note-header" style="color: #854d0e;">📝 Admission Assessment</div>
                        <div class="note-content">
                          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
                            ${admissionData.admission_date ? `
                              <div>
                                <span style="font-weight: 600; color: #854d0e;">Admission Date:</span>
                                <span style="margin-left: 5px;">${new Date(admissionData.admission_date).toLocaleString()}</span>
                              </div>
                            ` : ''}
                            ${admissionData.admission_type ? `
                              <div>
                                <span style="font-weight: 600; color: #854d0e;">Admission Type:</span>
                                <span style="margin-left: 5px;">${admissionData.admission_type}</span>
                              </div>
                            ` : ''}
                            ${admissionData.admitting_diagnosis ? `
                              <div style="grid-column: span 2;">
                                <span style="font-weight: 600; color: #854d0e;">Admitting Diagnosis:</span>
                                <span style="margin-left: 5px;">${admissionData.admitting_diagnosis}</span>
                              </div>
                            ` : ''}
                            ${admissionData.chief_complaint ? `
                              <div style="grid-column: span 2;">
                                <span style="font-weight: 600; color: #854d0e;">Chief Complaint:</span>
                                <span style="margin-left: 5px;">${admissionData.chief_complaint}</span>
                              </div>
                            ` : ''}
                            ${admissionData.attending_physician ? `
                              <div>
                                <span style="font-weight: 600; color: #854d0e;">Attending Physician:</span>
                                <span style="margin-left: 5px;">${admissionData.attending_physician}</span>
                              </div>
                            ` : ''}
                            ${admissionData.allergies ? `
                              <div>
                                <span style="font-weight: 600; color: #dc2626;">Allergies:</span>
                                <span style="margin-left: 5px;">${admissionData.allergies}</span>
                              </div>
                            ` : ''}
                            ${admissionData.current_medications ? `
                              <div style="grid-column: span 2;">
                                <span style="font-weight: 600; color: #059669;">Current Medications:</span>
                                <span style="margin-left: 5px;">${admissionData.current_medications}</span>
                              </div>
                            ` : ''}
                          </div>
                          
                          ${admissionData.emergency_contact_name ? `
                            <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-top: 10px;">
                              <div style="font-weight: 600; color: #475569; margin-bottom: 6px;">Emergency Contact</div>
                              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
                                <div><strong>Name:</strong> ${admissionData.emergency_contact_name}</div>
                                ${admissionData.emergency_contact_phone ? `<div><strong>Phone:</strong> ${admissionData.emergency_contact_phone}</div>` : ''}
                                ${admissionData.emergency_contact_relationship ? `<div><strong>Relationship:</strong> ${admissionData.emergency_contact_relationship}</div>` : ''}
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    ` : '<div class="note-entry"><div class="note-content" style="text-align: center; font-style: italic;">No admission assessment recorded</div></div>'}

                    ${directiveData ? `
                      <div class="note-entry" style="background: #fef2f2; border: 2px solid ${directiveData.dnr_status === 'Full Code' ? '#22c55e' : '#ef4444'};">
                        <div class="note-header" style="color: ${directiveData.dnr_status === 'Full Code' ? '#166534' : '#991b1b'};">⚕️ Advanced Directives</div>
                        <div class="note-content">
                          <strong>DNR Status:</strong> <span style="font-weight: bold; font-size: 16px; color: ${directiveData.dnr_status === 'Full Code' ? '#22c55e' : '#ef4444'};">${directiveData.dnr_status || 'Not Specified'}</span><br>
                          <strong>Healthcare Proxy:</strong> ${directiveData.healthcare_proxy_name || 'None designated'}<br>
                          ${directiveData.healthcare_proxy_phone ? `<strong>Proxy Contact:</strong> ${directiveData.healthcare_proxy_phone}<br>` : ''}
                          ${directiveData.healthcare_proxy_relationship ? `<strong>Relationship:</strong> ${directiveData.healthcare_proxy_relationship}<br>` : ''}
                          <strong>Organ Donation:</strong> ${directiveData.organ_donation_status || 'Not specified'}<br>
                          ${directiveData.religious_preference ? `<strong>Religious Preference:</strong> ${directiveData.religious_preference}<br>` : ''}
                          ${directiveData.special_instructions ? `<strong>Special Instructions:</strong> ${directiveData.special_instructions}` : ''}
                        </div>
                        <div class="note-meta">End-of-life care preferences and legal healthcare decisions</div>
                      </div>
                    ` : '<div class="note-entry"><div class="note-content" style="text-align: center; font-style: italic;">No advanced directives recorded</div></div>'}

                    ${assessmentsData.length > 0 ? `
                      <div class="note-entry" style="background: #f0f9ff; border-color: #3b82f6;">
                        <div class="note-header" style="color: #1e40af;">📋 Nursing Assessments (${assessmentsData.length} on file)</div>
                        <div class="note-content">
                          ${assessmentsData.map((assessment, idx) => {
                            let parsedData = null;
                            console.log(`🔍 DEBUG: Processing assessment #${idx + 1}:`, assessment);
                            console.log(`🔍 DEBUG: assessment_notes type:`, typeof assessment.assessment_notes);
                            console.log(`🔍 DEBUG: assessment_notes value:`, assessment.assessment_notes);
                            try {
                              parsedData = JSON.parse(assessment.assessment_notes);
                              console.log(`🔍 DEBUG: Parsed data:`, parsedData);
                            } catch (e) {
                              console.log(`🔍 DEBUG: Parse error:`, e);
                              // If it's not JSON, display as plain text
                            }
                            
                            if (parsedData && typeof parsedData === 'object') {
                              return `
                                ${idx > 0 ? '<hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">' : ''}
                                <div style="margin-bottom: ${idx < assessmentsData.length - 1 ? '15px' : '0'};">
                                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <strong style="font-size: 14px; color: #1e40af; font-weight: 700;">${parsedData.assessmentType ? parsedData.assessmentType.toUpperCase() : 'NURSING ASSESSMENT'}</strong>
                                    <span style="font-size: 12px; color: #64748b;">${new Date(parsedData.assessmentDate || assessment.created_at).toLocaleString()}</span>
                                  </div>
                                  
                                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
                                    ${parsedData.patientId ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Patient ID:</span>
                                        <span style="margin-left: 5px;">${parsedData.patientId}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.generalAppearance ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">General Appearance:</span>
                                        <span style="margin-left: 5px;">${parsedData.generalAppearance}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.levelOfConsciousness ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Level of Consciousness:</span>
                                        <span style="margin-left: 5px;">${parsedData.levelOfConsciousness}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.respiratoryAssessment ? `
                                      <div style="grid-column: span 2;">
                                        <span style="font-weight: 600; color: #475569;">Respiratory:</span>
                                        <span style="margin-left: 5px;">${parsedData.respiratoryAssessment}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.cardiovascularAssessment ? `
                                      <div style="grid-column: span 2;">
                                        <span style="font-weight: 600; color: #475569;">Cardiovascular:</span>
                                        <span style="margin-left: 5px;">${parsedData.cardiovascularAssessment}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.motorFunction ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Motor Function:</span>
                                        <span style="margin-left: 5px;">${parsedData.motorFunction}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.cognitiveFunction ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Cognitive Function:</span>
                                        <span style="margin-left: 5px;">${parsedData.cognitiveFunction}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.skinCondition ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Skin Condition:</span>
                                        <span style="margin-left: 5px;">${parsedData.skinCondition}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.pressureUlcerRisk ? `
                                      <div>
                                        <span style="font-weight: 600; color: ${parsedData.pressureUlcerRisk === 'high' ? '#dc2626' : '#475569'};">Pressure Ulcer Risk:</span>
                                        <span style="margin-left: 5px;">${parsedData.pressureUlcerRisk}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.fallRiskScore !== null && parsedData.fallRiskScore !== undefined ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Fall Risk Score:</span>
                                        <span style="margin-left: 5px;">${parsedData.fallRiskScore}</span>
                                      </div>
                                    ` : ''}
                                    ${parsedData.fallRiskFactors ? `
                                      <div>
                                        <span style="font-weight: 600; color: #475569;">Fall Risk Factors:</span>
                                        <span style="margin-left: 5px;">${parsedData.fallRiskFactors}</span>
                                      </div>
                                    ` : ''}
                                  </div>
                                  
                                  ${parsedData.assessmentNotes ? `
                                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-top: 10px;">
                                      <div style="font-weight: 600; color: #1e40af; margin-bottom: 6px;">Assessment Notes</div>
                                      <div style="font-size: 13px; color: #334155;">${parsedData.assessmentNotes}</div>
                                    </div>
                                  ` : ''}
                                  
                                  ${parsedData.recommendations ? `
                                    <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; margin-top: 10px;">
                                      <div style="font-weight: 600; color: #059669; margin-bottom: 6px;">Recommendations</div>
                                      <div style="font-size: 13px; color: #334155;">${parsedData.recommendations}</div>
                                    </div>
                                  ` : ''}
                                  
                                  <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
                                    <strong>Assessed by:</strong> ${parsedData.nurseName || assessment.nurse_name} • 
                                    <strong>Priority:</strong> ${parsedData.priorityLevel || assessment.priority || 'routine'}
                                  </div>
                                </div>
                              `;
                            } else {
                              // Fallback for non-JSON or nursing assessments saved as plain text
                              const content = assessment.assessment_notes || assessment.content || 'No notes provided';
                              
                              // Try to parse it as JSON one more time for nursing assessments
                              let nursingData = null;
                              try {
                                nursingData = JSON.parse(content);
                              } catch (e) {
                                // Not JSON, display as text
                              }
                              
                              if (nursingData && typeof nursingData === 'object') {
                                // Display nursing assessment data
                                return `
                                  ${idx > 0 ? '<hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">' : ''}
                                  <div style="margin-bottom: ${idx < assessmentsData.length - 1 ? '15px' : '0'};">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                      <strong style="font-size: 14px; color: #1e40af;">Nursing Assessment #${idx + 1}</strong>
                                      <span style="font-size: 12px; color: #64748b;">${new Date(assessment.created_at).toLocaleString()}</span>
                                    </div>
                                    
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px;">
                                      ${nursingData.patientId ? `
                                        <div>
                                          <span style="font-weight: 600; color: #475569;">Patient ID:</span>
                                          <span style="margin-left: 5px;">${nursingData.patientId}</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.assessmentType ? `
                                        <div>
                                          <span style="font-weight: 600; color: #475569;">Type:</span>
                                          <span style="margin-left: 5px;">${nursingData.assessmentType}</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.generalAppearance ? `
                                        <div>
                                          <span style="font-weight: 600; color: #475569;">Appearance:</span>
                                          <span style="margin-left: 5px;">${nursingData.generalAppearance}</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.levelOfConsciousness ? `
                                        <div>
                                          <span style="font-weight: 600; color: #475569;">LOC:</span>
                                          <span style="margin-left: 5px;">${nursingData.levelOfConsciousness}</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.respiratoryAssessment ? `
                                        <div style="grid-column: span 2;">
                                          <span style="font-weight: 600; color: #475569;">🫁 Respiratory:</span>
                                          <span style="margin-left: 5px;">${nursingData.respiratoryAssessment}</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.cardiovascularAssessment ? `
                                        <div style="grid-column: span 2;">
                                          <span style="font-weight: 600; color: #475569;">💓 Cardiovascular:</span>
                                          <span style="margin-left: 5px;">${nursingData.cardiovascularAssessment}</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.painPresent && nursingData.painScale ? `
                                        <div>
                                          <span style="font-weight: 600; color: #dc2626;">⚠️ Pain Scale:</span>
                                          <span style="margin-left: 5px;">${nursingData.painScale}/10</span>
                                        </div>
                                      ` : ''}
                                      ${nursingData.painLocation ? `
                                        <div>
                                          <span style="font-weight: 600; color: #475569;">Pain Location:</span>
                                          <span style="margin-left: 5px;">${nursingData.painLocation}</span>
                                        </div>
                                      ` : ''}
                                    </div>
                                    
                                    <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
                                      <strong>Assessed by:</strong> ${assessment.nurse_name || nursingData.nurseName} • 
                                      <strong>Priority:</strong> ${assessment.priority || 'Medium'}
                                    </div>
                                  </div>
                                `;
                              } else {
                                // Plain text display
                                return `
                                  ${idx > 0 ? '<hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">' : ''}
                                  <div style="margin-bottom: ${idx < assessmentsData.length - 1 ? '15px' : '0'};">
                                    <strong>Latest Assessment:</strong> ${new Date(assessment.created_at).toLocaleDateString()}<br>
                                    <strong>Type:</strong> ${assessment.type || 'Assessment'}<br>
                                    <strong>By:</strong> ${assessment.nurse_name}<br>
                                    <strong>Notes:</strong> ${content}
                                    <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
                                      Priority: ${assessment.priority || 'Medium'}
                                    </div>
                                  </div>
                                `;
                              }
                            }
                          }).join('')}
                        </div>
                      </div>
                    ` : '<div class="note-entry"><div class="note-content" style="text-align: center; font-style: italic;">No nursing assessments recorded</div></div>'}

                    ${bowelRecordsData.length > 0 ? `
                      <div class="note-entry" style="background: #f0fdf4; border-color: #22c55e;">
                        <div class="note-header" style="color: #166534;">📊 Bowel Movement Records (${bowelRecordsData.length} on file)</div>
                        <div class="note-content">
                          <strong>Latest Record:</strong> ${new Date(bowelRecordsData[0].recorded_at).toLocaleString()}<br>
                          <strong>Continence Status:</strong> ${bowelRecordsData[0].bowel_incontinence}<br>
                          <strong>Stool Appearance:</strong> ${bowelRecordsData[0].stool_appearance}<br>
                          <strong>Consistency:</strong> ${bowelRecordsData[0].stool_consistency}, <strong>Colour:</strong> ${bowelRecordsData[0].stool_colour}, <strong>Amount:</strong> ${bowelRecordsData[0].stool_amount}<br>
                          ${bowelRecordsData[0].notes ? `<strong>Notes:</strong> ${bowelRecordsData[0].notes}` : ''}
                        </div>
                        <div class="note-meta">Recorded by: ${bowelRecordsData[0].nurse_name}</div>
                      </div>
                    ` : '<div class="note-entry"><div class="note-content" style="text-align: center; font-style: italic;">No bowel records documented</div></div>'}
                  </div>
                </div>
              </div>

              ${ordersData && ordersData.length > 0 ? `
              <div class="form-section">
                <div class="section-header">Active Doctors Orders</div>
                <div class="section-content">
                  <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                      <tr style="background: #f3f4f6; border-bottom: 2px solid #000;">
                        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Time</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Order Text</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Type</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${ordersData.slice(0, 10).map(order => `
                        <tr style="border-bottom: 1px solid #ddd;">
                          <td style="padding: 8px; border: 1px solid #ddd;">${order.order_date}</td>
                          <td style="padding: 8px; border: 1px solid #ddd;">${order.order_time}</td>
                          <td style="padding: 8px; border: 1px solid #ddd;">${order.order_text}</td>
                          <td style="padding: 8px; border: 1px solid #ddd;">${order.order_type}</td>
                          <td style="padding: 8px; border: 1px solid #ddd;">
                            <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${order.is_acknowledged ? '#d1fae5' : '#fee2e2'}; color: ${order.is_acknowledged ? '#065f46' : '#dc2626'};">
                              ${order.is_acknowledged ? 'Acknowledged' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              ` : ''}

              <div class="signature-section">
                <div class="signature-line">
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Attending Physician Signature</div>
                  </div>
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Date</div>
                  </div>
                </div>
                <div class="signature-line">
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Nurse Signature</div>
                  </div>
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Date</div>
                  </div>
                </div>
              </div>

              <div class="record-footer">
                <div><strong>Record Generated:</strong> ${new Date().toLocaleString()}</div>
                <div><strong>Generated By:</strong> hacCare Medical Records System</div>
                
                <div class="simulation-disclaimer" style="margin-top: 15px;">
                  ⚠️ SIMULATION RECORD DISCLAIMER: This document is a simulated patient record created for healthcare education and training purposes only. It does not represent actual patient data, real medical diagnoses, or genuine clinical encounters. This record should not be used for any actual clinical decision-making, billing, legal purposes, or patient care. All information contained herein is fictional and for instructional use only.
                </div>
                
                <div class="confidentiality-notice">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This medical record contains confidential patient health information protected by federal and state privacy laws including HIPAA. This information is intended solely for the use of authorized healthcare providers and personnel involved in the patient's care. Any unauthorized review, disclosure, copying, distribution, or use of this information is strictly prohibited and may be subject to legal penalties. If you have received this record in error, please notify the sender immediately and destroy all copies.
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      
      reportWindow.document.close();
      reportWindow.focus();
      
    } catch (error) {
      console.error('Error generating patient record:', error);
      alert('Error generating patient record. Please try again.');
    }
  };

  // Action Cards Configuration
  const actionCards = [
    {
      id: 'handover-notes',
      title: 'Handover Notes',
      description: 'Create SBAR communication notes for care transitions',
      icon: MessageSquare,
      action: () => setActiveModule('handover'),
      color: 'sky' // Matches handover module
    },
    {
      id: 'patient-record',
      title: 'View Patient Record',
      description: 'Generate comprehensive medical record',
      icon: FileText,
      action: handlePrintRecord,
      color: 'blue' // Unique: Blue for patient record
    },
    {
      id: 'discharge-summary',
      title: 'Discharge Summary',
      description: 'Create discharge documentation',
      icon: FileCheck,
      action: () => alert('Discharge Summary feature coming soon!'),
      color: 'green' // Unique: Green for discharge
    },
    {
      id: 'doctors-orders',
      title: 'Doctors Orders',
      description: 'View and manage physician orders',
      icon: FileText,
      action: () => setShowDoctorsOrders(true),
      color: 'indigo', // Unique: Indigo for doctor's orders
      badge: unacknowledgedCount > 0 ? 'New Order' : undefined
    },
    {
      id: 'labs',
      title: 'Labs',
      description: 'View and manage laboratory results',
      icon: FlaskConical,
      action: () => setShowLabs(true),
      color: 'violet', // Unique: Violet for labs
      badge: unacknowledgedLabsCount > 0 ? 'New Labs' : undefined
    }
  ];

  // Render Action Cards
  const renderActionCards = () => {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Patient Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actionCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.action}
                className={`
                  bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                  p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer
                  hover:border-${card.color}-300 dark:hover:border-${card.color}-600
                  group hover:scale-[1.02]
                `}
              >
                <div className="flex items-center mb-4">
                  <div className={`
                    p-3 rounded-lg mr-4
                    ${card.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/50 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/70' :
                      card.color === 'green' ? 'bg-green-100 dark:bg-green-900/50 group-hover:bg-green-200 dark:group-hover:bg-green-800/70' :
                      'bg-purple-100 dark:bg-purple-900/50 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/70'}
                    transition-colors duration-300
                  `}>
                    <IconComponent className={`h-6 w-6 ${
                      card.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      card.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      'text-purple-600 dark:text-purple-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {card.title}
                      </h4>
                      {card.badge && (
                        <div className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200 animate-pulse">
                          {card.badge}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className={`
                  text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300
                  ${card.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    card.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    'text-purple-600 dark:text-purple-400'}
                `}>
                  Click to {card.title.toLowerCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Load patient data from URL parameter
  useEffect(() => {
    const loadPatient = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch patient data, medications, and wound assessments simultaneously
        const [patientData, medicationsData, woundAssessmentsData] = await Promise.all([
          fetchPatientById(id),
          fetchPatientMedications(id).catch(err => {
            console.warn('Failed to fetch medications:', err);
            return []; // Return empty array if medications fail to load
          }),
          WoundCareService.getAssessmentsByPatient(id).catch(err => {
            console.warn('Failed to fetch wound assessments:', err);
            return []; // Return empty array if wound assessments fail to load
          })
        ]);
        
        if (patientData) {
          // Include medications and wound assessments in patient data
          const patientWithData = {
            ...patientData,
            medications: medicationsData,
            wound_assessments: woundAssessmentsData
          };
          setPatient(patientWithData);
          console.log(`✅ Patient loaded with ${medicationsData.length} medications and ${woundAssessmentsData.length} wound assessments`);
        }
        
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id]);

  // Check for unacknowledged labs
  useEffect(() => {
    const checkUnacknowledgedLabs = async () => {
      if (patient?.id && currentTenant?.id) {
        const { hasUnacked } = await hasUnacknowledgedLabs(patient.id, currentTenant.id);
        setUnacknowledgedLabsCount(hasUnacked ? 1 : 0);
      }
    };
    
    checkUnacknowledgedLabs();
  }, [patient?.id, currentTenant?.id, labsRefreshTrigger]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6 mx-auto"></div>
          <p className="text-xl font-medium text-gray-700">Loading patient data...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Patient</h2>
          <p className="text-red-600 mb-6">{error || 'Patient not found'}</p>
          <button
            onClick={() => navigate('/app')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Module configurations with enhanced styling - Each with unique color
  const moduleConfigs: ModuleConfig[] = [
    {
      id: 'vitals',
      title: 'Vital Signs',
      description: 'Monitor and record patient vital signs with real-time tracking',
      icon: Activity,
      color: 'cyan', // Unique: Light blue for vitals
      badge: patient.vitals?.length?.toString() || '0'
    },
    {
      id: 'medications',
      title: 'Medications',
      description: 'Complete medication administration and reconciliation system',
      icon: Pill,
      color: 'emerald', // Unique: Bright green for meds
      badge: patient.medications?.length?.toString() || '0'
    },
    {
      id: 'wound-care',
      title: 'Wound Care',
      description: 'Comprehensive wound assessment and treatment tracking',
      icon: Camera,
      color: 'orange', // Unique: Orange for wounds
      badge: patient.wound_assessments?.length?.toString() || '0'
    },
    {
      id: 'forms',
      title: 'Assessments',
      description: 'Clinical assessment forms and comprehensive documentation',
      icon: FileText,
      color: 'purple' // Unique: Purple for assessments
    },
    {
      id: 'handover',
      title: 'Handover Notes',
      description: 'SBAR communication framework for care transitions',
      icon: MessageSquare,
      color: 'sky' // Unique: Sky blue for handover
    },
    {
      id: 'advanced-directives',
      title: 'Advanced Directives',
      description: 'Legal care preferences and end-of-life planning documentation',
      icon: FileText,
      color: 'teal' // Unique: Teal for directives
    },
    {
      id: 'hacmap',
      title: 'hacMap - Device & Wound Map',
      description: 'Visual mapping of medical devices and wound locations on body diagram',
      icon: MapPin,
      color: 'rose' // Unique: Rose/pink for hacMap
    }
  ];

  // Handle data updates from modules
  const handlePatientUpdate = (updatedData: Partial<Patient>) => {
    if (patient) {
      const updatedPatient = { ...patient, ...updatedData };
      setPatient(updatedPatient);
      setLastUpdated(new Date());
    }
  };

  const handleMedicationUpdate = (medications: any[]) => {
    handlePatientUpdate({ medications });
  };

  const handleAssessmentSave = async (assessment: any) => {
    try {
      console.log('Saving assessment to database:', assessment);
      console.log('Assessment type:', assessment.type);
      
      // Route to appropriate table based on assessment type
      if (assessment.type === 'admission-assessment') {
        // Save to patient_admission_records table
        // Only save fields that are actually collected by the form
        const admissionRecord: AdmissionRecord = {
          patient_id: assessment.patientId,
          admission_type: 'Emergency', // Default since form doesn't collect this
          admission_date: assessment.data.admissionDate || new Date().toISOString(),
          chief_complaint: assessment.data.chiefComplaint || '',
          admitting_diagnosis: assessment.data.admittingDiagnosis || '',
          attending_physician: null, // Form doesn't collect this
          allergies: Array.isArray(assessment.data.allergies) ? assessment.data.allergies.join(', ') : assessment.data.allergies || '',
          current_medications: assessment.data.medications || '',
          // Form doesn't collect height/weight/BMI, insurance, or emergency contact
          height: null,
          weight: null,
          bmi: null,
          insurance_provider: null,
          insurance_policy: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null
        };
        
        await upsertAdmissionRecord(admissionRecord);
        console.log('Admission assessment saved to patient_admission_records');
        
      } else if (assessment.type === 'nursing-assessment') {
        // Save to patient_notes table directly with JSON content
        const { data: savedNote, error } = await supabase
          .from('patient_notes')
          .insert({
            patient_id: assessment.patientId,
            nurse_id: currentUser?.id || '',
            nurse_name: assessment.submittedBy,
            type: 'Assessment',
            content: JSON.stringify(assessment.data), // Store raw JSON
            priority: 'Medium'
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error saving nursing assessment:', error);
          throw error;
        }
        
        console.log('Nursing assessment saved to patient_notes:', savedNote);
        
      } else if (assessment.type === 'bowel-assessment') {
        // Save to bowel_records table
        await createBowelRecord({
          patient_id: assessment.patientId,
          nurse_id: currentUser?.id || '',
          nurse_name: assessment.submittedBy,
          recorded_at: assessment.data.recordedAt || new Date().toISOString(),
          bowel_incontinence: assessment.data.bowelIncontinence || 'Continent',
          stool_appearance: assessment.data.stoolAppearance || 'Normal',
          stool_consistency: assessment.data.stoolConsistency || 'Formed',
          stool_colour: assessment.data.stoolColour || 'Brown',
          stool_amount: assessment.data.stoolAmount || 'Moderate',
          notes: assessment.data.notes || ''
        });
        console.log('Bowel assessment saved to bowel_records');
        
      } else {
        // Default: save as generic assessment
        await createAssessment({
          patient_id: assessment.patientId,
          nurse_id: currentUser?.id || '',
          nurse_name: assessment.submittedBy,
          assessment_type: 'physical',
          assessment_date: new Date().toISOString(),
          assessment_notes: JSON.stringify(assessment.data),
          recommendations: '',
          follow_up_required: false,
          priority_level: 'routine'
        });
        console.log('Generic assessment saved to patient_notes');
      }
      
      console.log('Assessment saved to database successfully');
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error saving assessment to database:', error);
    }
  };

  // Get enhanced color classes for modern styling
  const getModuleColorClasses = (color: string, isActive: boolean = false) => {
    const colors = {
      blue: {
        bg: isActive ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-white',
        border: isActive ? 'border-blue-400 shadow-blue-100' : 'border-gray-200',
        text: isActive ? 'text-blue-900' : 'text-gray-900',
        icon: isActive ? 'text-blue-600' : 'text-gray-500',
        badge: 'bg-blue-500 text-white',
        accent: 'bg-blue-500',
        gradient: 'from-blue-500 to-blue-600'
      },
      green: {
        bg: isActive ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-white',
        border: isActive ? 'border-green-400 shadow-green-100' : 'border-gray-200',
        text: isActive ? 'text-green-900' : 'text-gray-900',
        icon: isActive ? 'text-green-600' : 'text-gray-500',
        badge: 'bg-green-500 text-white',
        accent: 'bg-green-500',
        gradient: 'from-green-500 to-green-600'
      },
      orange: {
        bg: isActive ? 'bg-gradient-to-br from-orange-50 to-orange-100' : 'bg-white',
        border: isActive ? 'border-orange-400 shadow-orange-100' : 'border-gray-200',
        text: isActive ? 'text-orange-900' : 'text-gray-900',
        icon: isActive ? 'text-orange-600' : 'text-gray-500',
        badge: 'bg-orange-500 text-white',
        accent: 'bg-orange-500',
        gradient: 'from-orange-500 to-orange-600'
      },
      purple: {
        bg: isActive ? 'bg-gradient-to-br from-purple-50 to-purple-100' : 'bg-white',
        border: isActive ? 'border-purple-400 shadow-purple-100' : 'border-gray-200',
        text: isActive ? 'text-purple-900' : 'text-gray-900',
        icon: isActive ? 'text-purple-600' : 'text-gray-500',
        badge: 'bg-purple-500 text-white',
        accent: 'bg-purple-500',
        gradient: 'from-purple-500 to-purple-600'
      },
      indigo: {
        bg: isActive ? 'bg-gradient-to-br from-indigo-50 to-indigo-100' : 'bg-white',
        border: isActive ? 'border-indigo-400 shadow-indigo-100' : 'border-gray-200',
        text: isActive ? 'text-indigo-900' : 'text-gray-900',
        icon: isActive ? 'text-indigo-600' : 'text-gray-500',
        badge: 'bg-indigo-500 text-white',
        accent: 'bg-indigo-500',
        gradient: 'from-indigo-500 to-indigo-600'
      },
      teal: {
        bg: isActive ? 'bg-gradient-to-br from-teal-50 to-teal-100' : 'bg-white',
        border: isActive ? 'border-teal-400 shadow-teal-100' : 'border-gray-200',
        text: isActive ? 'text-teal-900' : 'text-gray-900',
        icon: isActive ? 'text-teal-600' : 'text-gray-500',
        badge: 'bg-teal-500 text-white',
        accent: 'bg-teal-500',
        gradient: 'from-teal-500 to-teal-600'
      },
      rose: {
        bg: isActive ? 'bg-gradient-to-br from-rose-50 to-rose-100' : 'bg-white',
        border: isActive ? 'border-rose-400 shadow-rose-100' : 'border-gray-200',
        text: isActive ? 'text-rose-900' : 'text-gray-900',
        icon: isActive ? 'text-rose-600' : 'text-gray-500',
        badge: 'bg-rose-500 text-white',
        accent: 'bg-rose-500',
        gradient: 'from-rose-500 to-rose-600'
      },
      cyan: {
        bg: isActive ? 'bg-gradient-to-br from-cyan-50 to-cyan-100' : 'bg-white',
        border: isActive ? 'border-cyan-400 shadow-cyan-100' : 'border-gray-200',
        text: isActive ? 'text-cyan-900' : 'text-gray-900',
        icon: isActive ? 'text-cyan-600' : 'text-gray-500',
        badge: 'bg-cyan-500 text-white',
        accent: 'bg-cyan-500',
        gradient: 'from-cyan-500 to-cyan-600'
      },
      emerald: {
        bg: isActive ? 'bg-gradient-to-br from-emerald-50 to-emerald-100' : 'bg-white',
        border: isActive ? 'border-emerald-400 shadow-emerald-100' : 'border-gray-200',
        text: isActive ? 'text-emerald-900' : 'text-gray-900',
        icon: isActive ? 'text-emerald-600' : 'text-gray-500',
        badge: 'bg-emerald-500 text-white',
        accent: 'bg-emerald-500',
        gradient: 'from-emerald-500 to-emerald-600'
      },
      amber: {
        bg: isActive ? 'bg-gradient-to-br from-amber-50 to-amber-100' : 'bg-white',
        border: isActive ? 'border-amber-400 shadow-amber-100' : 'border-gray-200',
        text: isActive ? 'text-amber-900' : 'text-gray-900',
        icon: isActive ? 'text-amber-600' : 'text-gray-500',
        badge: 'bg-amber-500 text-white',
        accent: 'bg-amber-500',
        gradient: 'from-amber-500 to-amber-600'
      },
      sky: {
        bg: isActive ? 'bg-gradient-to-br from-sky-50 to-sky-100' : 'bg-white',
        border: isActive ? 'border-sky-400 shadow-sky-100' : 'border-gray-200',
        text: isActive ? 'text-sky-900' : 'text-gray-900',
        icon: isActive ? 'text-sky-600' : 'text-gray-500',
        badge: 'bg-sky-500 text-white',
        accent: 'bg-sky-500',
        gradient: 'from-sky-500 to-sky-600'
      },
      violet: {
        bg: isActive ? 'bg-gradient-to-br from-violet-50 to-violet-100' : 'bg-white',
        border: isActive ? 'border-violet-400 shadow-violet-100' : 'border-gray-200',
        text: isActive ? 'text-violet-900' : 'text-gray-900',
        icon: isActive ? 'text-violet-600' : 'text-gray-500',
        badge: 'bg-violet-500 text-white',
        accent: 'bg-violet-500',
        gradient: 'from-violet-500 to-violet-600'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Calculate age helper
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Render modern module selector with enhanced cards
  const renderModuleSelector = () => {
    // Define row layouts with original module IDs
    const rowLayouts = [
      // Row 1: View Patient Record, Advanced Directives, hacMap
      ['patient-record', 'advanced-directives', 'hacmap'],
      // Row 2: Doctors Orders, Labs, Vitals
      ['doctors-orders', 'labs', 'vitals'],
      // Row 3: Handover Notes, Medications, Wound Care
      ['handover', 'medications', 'wound-care'],
      // Row 4: Assessments, Transfer Request, Discharge Summary
      ['forms', 'transfer-request', 'discharge-summary']
    ];

    const renderCard = (moduleId: string) => {
      // Check if it's an action card
      const actionCard = actionCards.find(ac => ac.id === moduleId);
      if (actionCard) {
        const Icon = actionCard.icon;
        const colorClasses = getModuleColorClasses(actionCard.color, false);
        
        return (
          <button
            key={actionCard.id}
            onClick={actionCard.action}
            className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 ${colorClasses.bg} ${colorClasses.border} shadow-sm hover:shadow-md`}
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r ${colorClasses.gradient}`}></div>
            
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses.gradient} shadow-md`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              {actionCard.badge && (
                <div className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200 shadow-sm animate-pulse">
                  {actionCard.badge}
                </div>
              )}
            </div>
            
            <div>
              <h3 className={`text-xl font-bold mb-2 ${colorClasses.text} group-hover:text-opacity-90`}>
                {actionCard.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600 group-hover:text-gray-700">
                {actionCard.description}
              </p>
            </div>

            {/* Subtle animated border on hover */}
            <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-200 transition-colors duration-300"></div>
          </button>
        );
      }

      // It's a module card - find it in moduleConfigs
      const module = moduleConfigs.find(m => m.id === moduleId);
      if (!module) return null;

      const Icon = module.icon;
      const isActive = activeModule === module.id;
      const colorClasses = getModuleColorClasses(module.color, isActive);

      return (
        <button
          key={module.id}
          onClick={() => setActiveModule(module.id)}
          className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 ${colorClasses.bg} ${colorClasses.border} ${isActive ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
        >
          {/* Gradient accent bar */}
          <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r ${colorClasses.gradient}`}></div>
          
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses.gradient} shadow-md`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {module.badge && (
              <div className={`px-3 py-1 text-xs font-bold rounded-full ${colorClasses.badge} shadow-sm`}>
                {module.badge}
              </div>
            )}
          </div>
          
          <div>
            <h3 className={`text-xl font-bold mb-2 ${colorClasses.text} group-hover:text-opacity-90`}>
              {module.title}
            </h3>
            <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-700' : 'text-gray-600'} group-hover:text-gray-700`}>
              {module.description}
            </p>
          </div>

          {/* Subtle animated border on hover */}
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-200 transition-colors duration-300"></div>
        </button>
      );
    };

    return (
      <div className="space-y-6 mb-8">
        {rowLayouts.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {row.map(moduleId => renderCard(moduleId))}
          </div>
        ))}
      </div>
    );
  };

  // Render enhanced patient overview with modern cards
  const renderPatientOverview = () => {
    const getPatientStatus = () => {
      // Determine overall patient status based on recent vitals and medications
      if (!patient.vitals || patient.vitals.length === 0) {
        return { status: 'pending', label: 'Assessment Needed', color: 'yellow' };
      }
      return { status: 'stable', label: 'Stable', color: 'green' };
    };

    const patientStatus = getPatientStatus();
    const age = calculateAge(patient.date_of_birth);

    return (
      <div className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${patientStatus.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'} rounded-full border-2 border-white flex items-center justify-center`}>
                {patientStatus.color === 'green' ? (
                  <CheckCircle className="h-3 w-3 text-white" />
                ) : (
                  <Clock className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <Badge className="h-4 w-4" />
                  <span>ID: {patient.patient_id}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{age} years old</span>
                </span>
                <span className="flex items-center space-x-1">
                  <BedDouble className="h-4 w-4" />
                  <span>Room {patient.room_number || 'Unassigned'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{patient.gender}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </span>
              </div>
            </div>
          </div>
          {/* Modern Action Row */}
          <div className="flex items-center space-x-3">
            {onShowBracelet && (
              <button
                onClick={() => onShowBracelet(patient)}
                className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:scale-105 font-medium"
                title="Show ID Bracelet"
              >
                <Badge className="h-4 w-4 mr-2" />
                ID Bracelet
              </button>
            )}
            
            {/* hacMap Button */}
            <button
              onClick={() => setActiveModule('hacmap')}
              className="flex items-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-purple-200 hover:border-purple-300 hover:scale-105 font-medium"
              title="Open Device & Wound Map"
            >
              <svg 
                className="h-4 w-4 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              hacMap - Device & Wound Map
            </button>
            
            {/* Contact button removed as requested */}
          </div>
          {/* End Modern Action Row */}
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
              patientStatus.color === 'green' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                patientStatus.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              {patientStatus.label}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Enhanced Main Content */}
      <div className="px-6 py-8">
        {activeModule === 'overview' ? (
          <div className="space-y-8">
            {renderPatientOverview()}
            {renderModuleSelector()}
            
            {/* Intake & Output Card */}
            <IntakeOutputCard
              patientId={patient.id}
              patientName={`${patient.first_name} ${patient.last_name}`}
              onRefresh={() => setLastUpdated(new Date())}
            />
            
            {renderActionCards()}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Modern Breadcrumb */}
            <nav className="flex items-center space-x-3 text-sm">
              <button
                onClick={() => setActiveModule('overview')}
                className="text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                Overview
              </button>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span className="text-gray-900 font-semibold bg-gray-100 px-3 py-1.5 rounded-lg">
                {moduleConfigs.find(m => m.id === activeModule)?.title}
              </span>
            </nav>

            {/* Active Module Content with Enhanced Styling */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[600px] overflow-hidden">
              {activeModule === 'vitals' && (
                <VitalsModule
                  patient={patient}
                  vitals={patient.vitals || []}
                  onVitalsUpdate={(vitals) => {
                    handlePatientUpdate({ vitals });
                    setLastUpdated(new Date());
                  }}
                  currentUser={currentUser}
                />
              )}

              {activeModule === 'medications' && (
                <MARModule
                  patient={patient}
                  medications={patient.medications || []}
                  onMedicationUpdate={handleMedicationUpdate}
                  currentUser={currentUser}
                />
              )}

              {activeModule === 'wound-care' && (
                <WoundCareModule
                  patient={patient}
                  onPatientUpdate={handlePatientUpdate}
                />
              )}

              {activeModule === 'forms' && (
                <FormsModule
                  patient={patient}
                  onAssessmentSave={handleAssessmentSave}
                  currentUser={currentUser}
                />
              )}

              {activeModule === 'handover' && (
                <HandoverNotes
                  patientId={patient.id}
                  patientName={`${patient.first_name} ${patient.last_name}`}
                  currentUser={currentUser || {
                    id: 'unknown',
                    name: 'Unknown User',
                    role: 'nurse'
                  }}
                />
              )}

              {activeModule === 'advanced-directives' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Advanced Directives</h2>
                    <p className="text-gray-600 mt-2">
                      Legal care preferences and end-of-life planning documentation for {patient.first_name} {patient.last_name}
                    </p>
                  </div>
                  <AdvancedDirectivesForm
                    patientId={patient.id}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    onClose={() => setActiveModule('overview')}
                    onSave={() => {
                      setLastUpdated(new Date());
                      setActiveModule('overview');
                    }}
                  />
                </div>
              )}

              {activeModule === 'hacmap' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <AvatarBoard 
                    patientId={patient.id}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    patientNumber={patient.patient_id}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Doctors Orders Modal */}
      {showDoctorsOrders && patient && (
        <DoctorsOrders
          patientId={patient.id}
          currentUser={{
            id: currentUser?.id || 'unknown',
            name: currentUser?.name || 'Unknown User',
            role: (currentUser?.role as 'nurse' | 'admin' | 'super_admin') || 'nurse'
          }}
          onClose={() => setShowDoctorsOrders(false)}
          onOrdersChange={handleOrdersChange}
        />
      )}

      {/* Labs Modal */}
      {showLabs && patient && currentTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Laboratory Results</h2>
              <button
                onClick={() => setShowLabs(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <Labs
                patientId={patient.id}
                patientNumber={patient.patient_id}
                patientName={`${patient.first_name} ${patient.last_name}`}
                patientDOB={patient.date_of_birth}
                onLabsChange={handleLabsChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* Schema Template Editor */}
      <SchemaTemplateEditor
        isOpen={showSchemaEditor}
        onClose={() => setShowSchemaEditor(false)}
        onSave={(schema) => {
          console.log('Schema saved:', schema);
          // Here you would typically save to database
          setShowSchemaEditor(false);
        }}
      />
    </div>
  );
};
