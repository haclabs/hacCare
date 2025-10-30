// Core Simulation Types for the New Architecture

export interface SimulationTemplate {
  id: string;
  name: string;
  description?: string;
  specialty?: string;
  difficultyLevel: number; // 1-5
  estimatedDuration: number; // minutes
  learningObjectives: string[];
  createdBy: string;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimulationSnapshot {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  snapshotData: SnapshotData;
  createdBy: string;
  tenantId: string;
  createdAt: Date;
}

export interface SnapshotData {
  patients: PatientSnapshot[];
  vitals: VitalSnapshot[];
  medications: MedicationSnapshot[];
  alerts: AlertSnapshot[];
  notes: NoteSnapshot[];
  woundCare?: WoundCareSnapshot[];
  handoverNotes?: HandoverNoteSnapshot[];
}

export interface PatientSnapshot {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  medicalRecordNumber: string;
  roomNumber?: string;
  bedNumber?: string;
  // Add other patient fields as needed
}

export interface VitalSnapshot {
  id: string;
  patientId: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  recordedAt: Date;
  recordedBy: string;
}

export interface MedicationSnapshot {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  prescribedBy: string;
  prescribedAt: Date;
  status: 'active' | 'discontinued' | 'completed';
}

export interface AlertSnapshot {
  id: string;
  patientId: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  createdAt: Date;
}

export interface NoteSnapshot {
  id: string;
  patientId: string;
  type: 'progress' | 'nursing' | 'physician' | 'discharge';
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface WoundCareSnapshot {
  id: string;
  patientId: string;
  location: string;
  description: string;
  treatment: string;
  performedBy: string;
  performedAt: Date;
}

export interface HandoverNoteSnapshot {
  id: string;
  patientId: string;
  fromShift: string;
  toShift: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface SimulationInstance {
  id: string;
  templateId: string;
  snapshotId: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  persistentIdentifiers: PersistentIdentifiers;
  currentState: SnapshotData;
  startedAt: Date;
  endedAt?: Date;
  createdBy: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistentIdentifiers {
  patientBarcodes: Record<string, string>; // patientId -> barcode
  medicationBarcodes: Record<string, string>; // medicationId -> barcode
  // Add other persistent identifiers as needed
}

export interface SimulationActivity {
  id: string;
  simulationId: string;
  studentId: string;
  actionType: SimulationActionType;
  actionData: Record<string, any>;
  timestamp: Date;
  tenantId: string;
}

export type SimulationActionType =
  | 'simulation_started'
  | 'simulation_reset'
  | 'vital_recorded'
  | 'medication_administered'
  | 'alert_acknowledged'
  | 'note_added'
  | 'wound_care_performed'
  | 'handover_completed'
  | 'student_joined'
  | 'student_left';

export interface SimulationSession {
  id: string;
  simulationId: string;
  studentId: string;
  joinedAt: Date;
  leftAt?: Date;
  role: 'student' | 'observer' | 'instructor';
  tenantId: string;
}

// Request/Response Types for API
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  specialty?: string;
  difficultyLevel: number;
  estimatedDuration: number;
  learningObjectives: string[];
  copyFromLive?: boolean;
  livePatientIds?: string[];
}

export interface CreateSnapshotRequest {
  templateId: string;
  name: string;
  description?: string;
}

export interface LaunchSimulationRequest {
  templateId: string;
  snapshotId: string;
  name: string;
}

export interface RecordVitalRequest {
  patientId: string;
  vitals: Partial<VitalSnapshot>;
}

export interface AdministerMedicationRequest {
  medicationId: string;
  patientId: string;
  administeredBy: string;
  administeredAt: Date;
  dosageGiven: string;
  notes?: string;
}

export interface AcknowledgeAlertRequest {
  alertId: string;
  acknowledgedBy: string;
  notes?: string;
}

// Simulation Engine Events
export interface SimulationEvent {
  type: string;
  simulationId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface SimulationEngineConfig {
  autoSaveInterval: number; // seconds
  maxConcurrentSimulations: number;
  enableRealTimeSync: boolean;
  logAllActivities: boolean;
}

// Analytics Types
export interface SimulationReport {
  simulationId: string;
  duration: number; // minutes
  studentPerformance: StudentPerformanceMetrics;
  criticalActionsMissed: string[];
  responseTimeMetrics: ResponseTimeMetrics;
  recommendations: string[];
}

export interface StudentPerformanceMetrics {
  studentId: string;
  totalActions: number;
  correctActions: number;
  incorrectActions: number;
  averageResponseTime: number; // seconds
  criticalMissed: number;
  score: number; // 0-100
}

export interface ResponseTimeMetrics {
  averageVitalRecordingTime: number;
  averageMedicationAdminTime: number;
  averageAlertAcknowledgmentTime: number;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  simulationId: string;
  data: any;
  timestamp: Date;
}

export type WebSocketEventType =
  | 'vitals_updated'
  | 'alert_triggered'
  | 'medication_administered'
  | 'student_joined'
  | 'student_left'
  | 'simulation_reset'
  | 'simulation_paused'
  | 'simulation_resumed';