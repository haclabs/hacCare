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
  FlaskConical
} from 'lucide-react';
import { VitalsModule } from '../modules/vitals/VitalsModule';
import { MARModule } from '../modules/mar/MARModule';
import { FormsModule } from '../modules/forms/FormsModule';
import { WoundCareModule } from '../modules/wound-care/WoundCareModule';
import { SchemaTemplateEditor } from './SchemaTemplateEditor';
import { HandoverNotes } from './Patients/handover/HandoverNotes';
import { DoctorsOrders } from './Patients/DoctorsOrders';
import { Labs } from './Patients/Labs';
import { Patient } from '../types';
import { fetchPatientById, fetchPatientVitals, fetchPatientNotes } from '../lib/patientService';
import { fetchPatientMedications } from '../lib/medicationService';
import { WoundCareService } from '../lib/woundCareService';
import { hasUnacknowledgedLabs } from '../lib/labService';
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

type ActiveModule = 'vitals' | 'medications' | 'forms' | 'wound-care' | 'overview' | 'handover';

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
      // Get all patient data for comprehensive record
      const [vitalsData, medicationsData, notesData] = await Promise.all([
        fetchPatientVitals(patient.id),
        fetchPatientMedications(patient.id),
        fetchPatientNotes(patient.id)
      ]);

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
                color: #000;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 8px;
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
                <div class="hospital-logo">HACCARE MEDICAL CENTER</div>
                <div class="hospital-address">
                  1234 Healthcare Drive • Medical City, MC 12345<br>
                  Phone: (555) 123-4567 • Fax: (555) 123-4568
                </div>
                <div class="record-type">Official Medical Record</div>
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
                <div class="section-header">Clinical Notes and Assessments</div>
                <div class="section-content">
                  <div class="notes-section">
                    ${notesData.length > 0 ? notesData.slice(0, 8).map(note => `
                      <div class="note-entry">
                        <div class="note-header">${note.type || 'Clinical Note'}</div>
                        <div class="note-content">${note.content}</div>
                        <div class="note-meta">Recorded: ${new Date(note.created_at || new Date()).toLocaleString()}</div>
                      </div>
                    `).join('') : '<p style="text-align: center; font-style: italic; margin: 20px 0;">No clinical notes recorded</p>'}
                  </div>
                </div>
              </div>

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
      color: 'blue'
    },
    {
      id: 'patient-record',
      title: 'View Patient Record',
      description: 'Generate comprehensive medical record',
      icon: FileText,
      action: handlePrintRecord,
      color: 'blue'
    },
    {
      id: 'discharge-summary',
      title: 'Discharge Summary',
      description: 'Create discharge documentation',
      icon: FileCheck,
      action: () => alert('Discharge Summary feature coming soon!'),
      color: 'green'
    },
    {
      id: 'transfer-request',
      title: 'Transfer Request',
      description: 'Initiate patient transfer process',
      icon: ArrowRight,
      action: () => alert('Transfer Request feature coming soon!'),
      color: 'purple'
    },
    {
      id: 'doctors-orders',
      title: 'Doctors Orders',
      description: 'View and manage physician orders',
      icon: FileText,
      action: () => setShowDoctorsOrders(true),
      color: 'blue',
      badge: unacknowledgedCount > 0 ? 'New Order' : undefined
    },
    {
      id: 'labs',
      title: 'Labs',
      description: 'View and manage laboratory results',
      icon: FlaskConical,
      action: () => setShowLabs(true),
      color: 'purple',
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

  // Module configurations with enhanced styling
  const moduleConfigs: ModuleConfig[] = [
    {
      id: 'vitals',
      title: 'Vital Signs',
      description: 'Monitor and record patient vital signs with real-time tracking',
      icon: Activity,
      color: 'blue',
      badge: patient.vitals?.length?.toString() || '0'
    },
    {
      id: 'medications',
      title: 'Medications',
      description: 'Complete medication administration and reconciliation system',
      icon: Pill,
      color: 'green',
      badge: patient.medications?.length?.toString() || '0'
    },
    {
      id: 'wound-care',
      title: 'Wound Care',
      description: 'Comprehensive wound assessment and treatment tracking',
      icon: Camera,
      color: 'orange',
      badge: patient.wound_assessments?.length?.toString() || '0'
    },
    {
      id: 'forms',
      title: 'Assessments',
      description: 'Clinical assessment forms and comprehensive documentation',
      icon: FileText,
      color: 'purple'
    },
    {
      id: 'handover',
      title: 'Handover Notes',
      description: 'SBAR communication framework for care transitions',
      icon: MessageSquare,
      color: 'indigo'
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

  const handleAssessmentSave = (assessment: any) => {
    // In a real implementation, this would be saved to assessments collection
    console.log('Assessment saved:', assessment);
    setLastUpdated(new Date());
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {moduleConfigs.map((module) => {
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
        })}
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
            {isMultiTenantAdmin && (
              <button
                onClick={() => setShowSchemaEditor(true)}
                className="flex items-center text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:scale-105 font-medium"
                title="Edit Schema Templates"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Template
              </button>
            )}
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
            {renderActionCards()}
            {renderModuleSelector()}
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
