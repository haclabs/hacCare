# 🤖 AI SYSTEM GUIDE: hacCare Healthcare Management System

*Generated on 2025-07-26T21:02:29.439Z*

## 🎯 SYSTEM OVERVIEW

hacCare is a modern, multi-tenant healthcare management system built with React, TypeScript, and Supabase. The system is designed around a modular architecture that supports:

- **Multi-tenant hospital management** with secure data isolation
- **Advanced patient care workflows** with modular components  
- **Real-time vitals monitoring** with AI-powered insights
- **Medication administration tracking** (MAR) with safety checks
- **Dynamic form generation** using JSON schemas
- **Comprehensive security** with PHI protection

## 🏗️ ARCHITECTURE PATTERNS

### Core Architectural Principles:
1. **Modular Design**: Self-contained modules for different medical workflows
2. **Schema-Driven Forms**: JSON schemas define dynamic healthcare forms
3. **Multi-Tenant Security**: Row-level security ensures data isolation
4. **Real-Time Updates**: Live data synchronization across all clients
5. **Type Safety**: Full TypeScript coverage for medical data integrity

### Key Design Patterns:
- **Module Pattern**: Each medical workflow (vitals, medications, assessments) is a self-contained module
- **Provider Pattern**: React contexts manage global state (tenant, auth, theme)
- **Hook Pattern**: Custom hooks encapsulate business logic and API calls
- **Schema Pattern**: JSON schemas drive form generation and validation

## 📁 DIRECTORY STRUCTURE & FILE PURPOSES

**src/**: Main application source code
**src/components/**: Reusable React components organized by feature
**src/modules/**: Self-contained medical workflow modules
**src/lib/**: Business logic services and utilities
**src/hooks/**: Custom React hooks for data and state management
**src/types/**: TypeScript type definitions
**src/schemas/**: JSON schema definitions for dynamic forms
**src/contexts/**: React context providers for global state
**src/utils/**: Utility functions and helpers
**scripts/**: Database maintenance and setup scripts
**sql-patches/**: Database migration and fix scripts
**tests/**: Test files organized by type (unit, integration, utilities)
**docs/**: Project documentation and implementation guides

## 🔗 ROUTING & NAVIGATION PATHS

**/** → `Dashboard`
   Main hospital dashboard with patient overview

**/patients/:id** → `PatientDetail`
   Individual patient management interface

**/patients/:id/modular** → `ModularPatientDashboard`
   New modular patient management system

**/management** → `TenantManagement`
   Multi-tenant administration interface

**/security-demo** → `SecurityDiagnosticsDemo`
   Security diagnostics and testing

**/modular-demo** → `ModularPatientSystemDemo`
   Demonstration of modular patient system

## 🧩 COMPONENT ARCHITECTURE

### Other Components

**App**
- Path: `src/App.tsx`
- Purpose: Main Application Component  The root component that manages the overall application state and routing. Handles navigation between different sections, patient management, and alert system coordination.  Features: - Tab-based navigation system - Patient selection and detail views - Real-time alert management and notifications - Role-based content rendering - Hospital bracelet generation  @returns {JSX.Element} The main application component
- Exports: default

**SecurityDiagnosticsDemo**
- Path: `src/SecurityDiagnosticsDemo.tsx`
- Purpose: 🛡️ Security Diagnostics Demo  Demo page showcasing the new advanced security diagnostics with AI-powered threat detection and PHI protection.
- Exports: default

**AlertPanel**
- Path: `src/components/Alerts/AlertPanel.tsx`
- Purpose:  Helper function to format alert timestamp
- Exports: AlertPanel

**AlertsRQDemo**
- Path: `src/components/Alerts/AlertsRQDemo.tsx`
- Purpose: Purpose not documented
- Exports: default

**AuthenticationRQDemo**
- Path: `src/components/Auth/AuthenticationRQDemo.tsx`
- Purpose: Purpose not documented
- Exports: default

**LoginForm**
- Path: `src/components/Auth/LoginForm.tsx`
- Purpose:  Check database connection on component mount
- Exports: LoginForm

**ProtectedRoute**
- Path: `src/components/Auth/ProtectedRoute.tsx`
- Purpose:  Only log in development mode
- Exports: ProtectedRoute

**Changelog**
- Path: `src/components/Changelog/Changelog.tsx`
- Purpose: Changelog Entry Interface Defines the structure of each changelog entry
- Exports: Changelog

**Documentation**
- Path: `src/components/Documentation/Documentation.tsx`
- Purpose: Exports Documentation
- Exports: Documentation

**NurseSelectionExample**
- Path: `src/components/Examples/NurseSelectionExample.tsx`
- Purpose: Simple test example showing how to use the nurse selection feature  This is a demonstration of how the new tenant-based nurse dropdown works in the patient form.
- Exports: NurseSelectionExample

**MainApp**
- Path: `src/components/MainApp.tsx`
- Purpose: Exports MainApp
- Exports: MainApp

**ManagementDashboard**
- Path: `src/components/Management/ManagementDashboard.tsx`
- Purpose:  Load tenant users
- Exports: ManagementDashboard

**TenantCRUD**
- Path: `src/components/Management/TenantCRUD.tsx`
- Purpose:  Apply search filter
- Exports: TenantCRUD

**TenantUserDebugger**
- Path: `src/components/Management/TenantUserDebugger.tsx`
- Purpose:  Temporary diagnostic component to test tenant user loading
- Exports: TenantUserDebugger

**ModernPatientManagement**
- Path: `src/components/ModernPatientManagement.tsx`
- Purpose: Modern Patient Management Integration  This component provides a modern alternative to the existing PatientDetail tabs, utilizing the new modular patient management system. It can be used as: 1. A complete replacement for PatientDetail 2. An additional tab within the existing system 3. A standalone patient management interface
- Exports: ModernPatientManagement

**ModularPatientDashboard**
- Path: `src/components/ModularPatientDashboard.tsx`
- Purpose: Modern Professional Patient Dashboard  A beautifully designed, modern patient overview system with enhanced styling, gradient backgrounds, improved cards, better typography, and professional visuals.  Features: - Modern gradient design with professional styling - Enhanced typography and visual hierarchy - Interactive hover effects and animations - Comprehensive patient status indicators - Real-time vital signs display with icons - Medication management with category indicators - Quick action workflows with enhanced UX
- Exports: ModularPatientDashboard

**ModularPatientSystemDemo**
- Path: `src/components/ModularPatientSystemDemo.tsx`
- Purpose: Modular Patient System Demo  This component provides a complete demonstration of the modular patient management system, showcasing all three modules and their integration capabilities.  Use this component to: - Test the modular system functionality - Demonstrate features to stakeholders - Validate integration with existing systems
- Exports: ModularPatientSystemDemo

**SchemaTemplateEditor**
- Path: `src/components/SchemaTemplateEditor.tsx`
- Purpose: Schema Template Editor  Allows super admins to edit JSON schema templates for modular forms. Provides a visual interface for customizing healthcare form structures, validation rules, and clinical configurations.
- Exports: SchemaTemplateEditor

**ConnectionStatus**
- Path: `src/components/StatusMonitor/ConnectionStatus.tsx`
- Purpose: Connection Status Component  Displays the current status of the database connection and provides troubleshooting information.
- Exports: ConnectionStatus

**FeatureStatus**
- Path: `src/components/StatusMonitor/FeatureStatus.tsx`
- Purpose: Feature Status Component  Displays the current status of all system features with visual indicators for operational, degraded, and down states.
- Exports: FeatureStatus

**SystemStatus**
- Path: `src/components/StatusMonitor/SystemStatus.tsx`
- Purpose: System Status Component  Real-time monitoring of system health and database connectivity. Provides visual indicators and detailed status information.
- Exports: SystemStatus

**index**
- Path: `src/components/StatusMonitor/index.tsx`
- Purpose: Status Monitor Component  Comprehensive system status monitoring dashboard. Displays real-time information about database connection, feature status, and system health.
- Exports: StatusMonitor

**UserForm**
- Path: `src/components/Users/UserForm.tsx`
- Purpose:  Load tenants for super admin
- Exports: UserForm

**UserManagement**
- Path: `src/components/Users/UserManagement.tsx`
- Purpose:  Apply search filter
- Exports: UserManagement

**enhanced-create-tenant-modal**
- Path: `src/components/enhanced-create-tenant-modal.tsx`
- Purpose:  Enhanced CreateTenantModal with email-based admin selection
- Exports: default

**AlertContext**
- Path: `src/contexts/AlertContext.tsx`
- Purpose: Deduplicate alerts based on patient, type, and message similarity
- Exports: AlertProviderProps, AlertProvider

**AuthContext**
- Path: `src/contexts/AuthContext.tsx`
- Purpose: Authentication Context Interface Defines the shape of the authentication context that will be provided to components
- Exports: useAuth, AuthProvider

**PatientContext**
- Path: `src/contexts/PatientContext.tsx`
- Purpose: Patient Context Interface
- Exports: PatientProvider

**TenantContext**
- Path: `src/contexts/TenantContext.tsx`
- Purpose: Tenant Context Interface Defines the shape of the tenant context that will be provided to components
- Exports: useTenant, TenantProvider

**ThemeContext**
- Path: `src/contexts/ThemeContext.tsx`
- Purpose: Theme Context Interface Manages dark/light mode state throughout the application
- Exports: ThemeProvider

**AuthContext**
- Path: `src/contexts/auth/AuthContext.tsx`
- Purpose: Authentication Context Interface Defines the shape of the authentication context that will be provided to components
- Exports: useAuth, AuthProvider

**ModularSystemIntegration**
- Path: `src/examples/ModularSystemIntegration.tsx`
- Purpose: Integration Example for Modular Patient System  This file demonstrates how to integrate the new modular patient management system with the existing PatientDetail component. It shows three integration approaches:  1. Adding a new "Modern" tab to existing PatientDetail 2. Using ModernPatientManagement as a replacement 3. Gradual migration strategy
- Exports: enhancePatientDetailWithModularSystem, EnhancedPatientDetail, migrationStrategy, useModularPatientSystem, integrateWithExistingComponents

**main**
- Path: `src/main.tsx`
- Purpose:  Initialize subdomain detection for production
- Exports: default

### Dashboard Components

**QuickStats**
- Path: `src/components/Dashboard/QuickStats.tsx`
- Purpose:  Count medication alerts directly from the alerts array
- Exports: QuickStats

### Layout & Navigation

**Header**
- Path: `src/components/Layout/Header.tsx`
- Purpose:  Remove offline logic for now
- Exports: Header

**Sidebar**
- Path: `src/components/Layout/Sidebar.tsx`
- Purpose: Sidebar Navigation Component  Provides the main navigation menu for the application with role-based visibility. Different menu items are shown based on the user's role and permissions.  Features: - Role-based menu item visibility - Active tab highlighting - Responsive design - Icon-based navigation - Dark mode support  @param {Object} props - Component props @param {string} props.activeTab - Currently active tab identifier @param {Function} props.onTabChange - Callback function when tab changes
- Exports: Sidebar

**TenantSwitcher**
- Path: `src/components/Layout/TenantSwitcher.tsx`
- Purpose: Tenant Switcher Component Allows super admins to switch between tenants or view all tenants
- Exports: TenantSwitcher

### Patient Management

**AssessmentDetail**
- Path: `src/components/Patients/AssessmentDetail.tsx`
- Purpose:  Get icon based on assessment type
- Exports: AssessmentDetail

**PatientManagement**
- Path: `src/components/Patients/PatientManagement.tsx`
- Purpose: Patient Management Component  Comprehensive patient management interface for super administrators. Provides full CRUD operations for patient records with advanced search and filtering capabilities.  Features: - Patient list with search and filtering - Create, edit, and delete patient records - Patient detail view - Bulk operations - Export functionality - Advanced filtering by condition, department, etc.  @returns {JSX.Element} The patient management component
- Exports: PatientManagement

**MedicationAdministration**
- Path: `src/components/Patients/records/MedicationAdministration.tsx`
- Purpose:  import { MedicationForm } from './MedicationForm'; // <-- File not found, comment out or create the file to resolve the error
- Exports: MedicationAdministration

**MedicationAdministrationForm**
- Path: `src/components/Patients/records/MedicationAdministrationForm.tsx`
- Purpose: Purpose not documented
- Exports: default

**MedicationAdministrationHistory**
- Path: `src/components/Patients/records/MedicationAdministrationHistory.tsx`
- Purpose:  Refresh patient data to ensure medication info is up to date
- Exports: MedicationAdministrationHistory

**NotesContent**
- Path: `src/components/Patients/records/NotesContent.tsx`
- Purpose:  Format date safely
- Exports: NotesContent

**PatientAssessmentsTab**
- Path: `src/components/Patients/records/PatientAssessmentsTab.tsx`
- Purpose: Exports PatientAssessmentsTab
- Exports: PatientAssessmentsTab

**PatientCard**
- Path: `src/components/Patients/records/PatientCard.tsx`
- Purpose: Patient Card Component  Displays a summary card for each patient with key information and quick actions. Provides an overview of patient status and allows navigation to detailed view.  @param {Patient} patient - Patient data object @param {Function} onClick - Callback function when card is clicked @param {Function} onShowBracelet - Optional callback to show patient bracelet @returns {JSX.Element} Patient card component
- Exports: default

**PatientCard_backup**
- Path: `src/components/Patients/records/PatientCard_backup.tsx`
- Purpose: Patient Card Component  Displays a summary card for each patient with key information and quick actions. Provides an overview of patient status, vital signs, and allows navigation to detailed views and bracelet generation.  Features: - Patient demographics and basic info - Current condition status with color coding - Vital signs summary - Allergy indicators - Quick access to patient bracelet - Click to view detailed patient information  @param {Object} props - Component props @param {Patient} props.patient - Patient data to display @param {Function} props.onClick - Callback when card is clicked @param {Function} props.onShowBracelet - Callback to show patient bracelet
- Exports: default

**PatientCard_clean**
- Path: `src/components/Patients/records/PatientCard_clean.tsx`
- Purpose: Patient Card Component  Displays a summary card for each patient with key information and quick actions. Provides an overview of patient status and allows navigation to detailed view.  @param {Patient} patient - Patient data object @param {Function} onClick - Callback function when card is clicked @param {Function} onShowBracelet - Optional callback to show patient bracelet @returns {JSX.Element} Patient card component
- Exports: default

**PatientDetail**
- Path: `src/components/Patients/records/PatientDetail.tsx`
- Purpose:  import { ImageAnnotation } from '../visuals/ImageAnnotation';
- Exports: PatientDetail

**RecentActivity**
- Path: `src/components/Patients/records/RecentActivity.tsx`
- Purpose: Exports RecentActivity
- Exports: RecentActivity

**PatientDetail.legacy**
- Path: `src/components/Patients/records/legacy/PatientDetail.legacy.tsx`
- Purpose:  import { ImageAnnotation } from '../visuals/ImageAnnotation';
- Exports: PatientDetail

**HospitalBracelet**
- Path: `src/components/Patients/visuals/HospitalBracelet.tsx`
- Purpose: Hospital Bracelet Component  Generates a realistic vector-style hospital bracelet for patient identification. Features a professional medical design with patient information, allergies, and scannable UPC-128 barcode for quick identification.  Features: - Vector-based bracelet design - Patient name in Last, First format - Date of birth - Allergy alerts in red - UPC-128 barcode with patient ID - Print and download functionality - Realistic hospital bracelet appearance  @param {Object} props - Component props @param {Patient} props.patient - Patient information @param {Function} props.onClose - Callback when bracelet is closed
- Exports: default

**ImageAnnotation**
- Path: `src/components/Patients/visuals/ImageAnnotation.tsx`
- Purpose:  useAuth() is called here, but its return value is unused.
- Exports: ImageAnnotation

**MedicationBarcode**
- Path: `src/components/Patients/visuals/MedicationBarcode.tsx`
- Purpose: Medication Label Component  Generates Avery 5167 compatible medication labels for printing. Creates a sheet of labels with medication information and barcodes.  Features: - Medication name and dosage - Patient information - UPC-128 barcode for medication identification - Print and download functionality - Avery 5167 label sheet format (4" x 1.33")
- Exports: MedicationBarcode

**PatientBracelet**
- Path: `src/components/Patients/visuals/PatientBracelet.tsx`
- Purpose: Patient Label Component  Generates Avery 5160 compatible patient identification labels for printing. Creates a sheet of labels with patient information and barcodes.  Features: - Patient name and ID - Date of birth - Room and bed number - Allergy warnings - UPC-128 barcode for patient identification - Print and download functionality - Avery 5160 label sheet format (2⅝" × 1")
- Exports: PatientBracelet

**VitalSignsEditor**
- Path: `src/components/Patients/vitals/VitalSignsEditor.tsx`
- Purpose:  Make vitals optional
- Exports: VitalSignsEditor

**VitalsContent**
- Path: `src/components/Patients/vitals/VitalsContent.tsx`
- Purpose: Exports VitalsContent
- Exports: VitalsContent

**VitalsTrends**
- Path: `src/components/Patients/vitals/VitalsTrends.tsx`
- Purpose:  Fetch the last 5 vital readings as specified in the user requirement
- Exports: VitalsTrends

### Form Components

**AdmissionRecordsForm**
- Path: `src/components/Patients/forms/AdmissionRecordsForm.tsx`
- Purpose:  Always start with a completely empty form
- Exports: AdmissionRecordsForm

**AdvancedDirectivesForm**
- Path: `src/components/Patients/forms/AdvancedDirectivesForm.tsx`
- Purpose:  Always start with a completely empty form
- Exports: AdvancedDirectivesForm

**AssessmentForm**
- Path: `src/components/Patients/forms/AssessmentForm.tsx`
- Purpose: Assessment Form Component  Form for creating patient assessments with proper validation and integration with the patient record system.  Features: - Multiple assessment types (Physical, Pain, Neurological) - Priority level assignment - Rich text content area - Automatic timestamp and nurse assignment - Form validation and error handling - Database integration for saving assessments
- Exports: AssessmentForm

**MedicationAdministrationForm**
- Path: `src/components/Patients/forms/MedicationAdministrationForm.tsx`
- Purpose:  Format as YYYY-MM-DDTHH:MM for input
- Exports: MedicationAdministrationForm

**MedicationForm**
- Path: `src/components/Patients/forms/MedicationForm.tsx`
- Purpose:  Calculate next due time based on frequency
- Exports: MedicationForm

**PatientForm**
- Path: `src/components/Patients/forms/PatientForm.tsx`
- Purpose: Patient Form Component  Comprehensive form for creating and editing patient records. Handles all patient information including demographics, medical history, emergency contacts, and room assignments.
- Exports: PatientForm

**PatientNoteForm**
- Path: `src/components/Patients/forms/PatientNoteForm.tsx`
- Purpose: Patient Note Form Component  Form for creating and editing patient notes with proper validation and integration with the patient record system.  Features: - Note type selection (Assessment, Medication, Vital Signs, etc.) - Priority level assignment - Rich text content area - Automatic timestamp and nurse assignment - Form validation and error handling  @param {Object} props - Component props @param {PatientNote | null} props.note - Existing note to edit (null for new note) @param {string} props.patientId - ID of the patient @param {string} props.patientName - Name of the patient for display @param {Function} props.onClose - Callback when form is closed @param {Function} props.onSave - Callback when note is saved
- Exports: PatientNoteForm

**WoundAssessment**
- Path: `src/components/Patients/forms/WoundAssessment.tsx`
- Purpose:  Load wounds when component mounts
- Exports: WoundAssessmentProps, WoundAssessment

**DynamicForm**
- Path: `src/components/forms/DynamicForm.tsx`
- Purpose: Dynamic Form Renderer Component  This component renders forms dynamically based on JSON schemas. It handles all form interactions, validation, and healthcare-specific features.  Features: - Dynamic form generation from JSON schemas - Real-time validation with visual feedback - Conditional field rendering - Healthcare-specific input components - Multi-step form support - Auto-save functionality - Clinical alerts and warnings
- Exports: DynamicForm

**BasicFields**
- Path: `src/components/forms/fields/BasicFields.tsx`
- Purpose: Basic Field Components for Dynamic Forms
- Exports: StringField, NumberField, BooleanField, SelectField, DateField, TextAreaField, MedicationLookupField, BodyDiagramField, PainScaleField

**VitalSignsField**
- Path: `src/components/forms/fields/VitalSignsField.tsx`
- Purpose: Vital Signs Field Component  Specialized form field for collecting vital signs data with healthcare-specific validation, normal ranges, and clinical alerts.
- Exports: VitalSignsField

### Settings & Configuration

**ConnectionDiagnostics**
- Path: `src/components/Settings/ConnectionDiagnostics.tsx`
- Purpose: Connection Diagnostics Component  Provides detailed diagnostics for Supabase connection issues and helps users troubleshoot connectivity problems. Now includes advanced AI-powered security diagnostics.
- Exports: ConnectionDiagnostics

**SecurityConnectionDiagnostics**
- Path: `src/components/Settings/SecurityConnectionDiagnostics.tsx`
- Purpose: 🛡️ Advanced Security Connection Diagnostics  SECURITY TESTING STATUS: ✅ REAL TESTS (Actually Testing Your System): - SSL/TLS encryption & security headers - Database connections & authentication - AI sanitization effectiveness (tests your actual SmartSanitizationEngine) - PHI detection & redaction (real pattern matching) - Browser security features & APIs - Network connectivity & mixed content protection - Session security & JWT tokens - Content Security Policy (runtime script execution test) - Secure context validation  ⚠️ SIMULATED TESTS (Mock/Demo Data): - Input validation rules (demo patterns) - HIPAA compliance checklist - Some MFA detection (limited metadata) - Rate limiting checks  Comprehensive security assessment for healthcare application connections with AI-powered threat detection and sanitization validation.
- Exports: SecurityConnectionDiagnostics

**SecuritySettings**
- Path: `src/components/Settings/SecuritySettings.tsx`
- Purpose: Security Settings Component  Allows users to manage their security settings including: - Password changes with strength validation - Security status overview - Future MFA options
- Exports: SecuritySettings

**Settings**
- Path: `src/components/Settings/Settings.tsx`
- Purpose: Settings Component  Comprehensive settings panel for user preferences and system configuration. Includes theme management, notification settings, and real-time system monitoring.  Features: - Dark/Light mode toggle with system preference option - User profile settings - Notification preferences - Real-time system information display - Database connection status and ping monitoring - Feature status indicators - Performance metrics
- Exports: Settings

### UI Components

**BarcodeScanner**
- Path: `src/components/UI/BarcodeScanner.tsx`
- Purpose: Purpose not documented
- Exports: default

**LoadingSpinner**
- Path: `src/components/UI/LoadingSpinner.tsx`
- Purpose: Purpose not documented
- Exports: default

### Medical Modules

**FormsModule**
- Path: `src/modules/forms/FormsModule.tsx`
- Purpose: Modular Forms Module  This module provides a self-contained clinical forms system with: - Dynamic form generation for various assessments - Nursing assessments and admission forms - Real-time validation and clinical alerts - Integration with patient data and care plans
- Exports: FormsModule

**MARModule**
- Path: `src/modules/mar/MARModule.tsx`
- Purpose: Modular MAR (Medication Administration Record) Module  This module provides a self-contained medication administration  // Handle medication reconciliation form submission
  const handleMedicationReconciliation = async (data: any, validation: ValidationResult) => {ystem with: - Dynamic form generation for medication administration - Safety checks and allergy validation - Drug interaction checking - Medication reconciliation - Integration with existing medication data
- Exports: MARModule

**VitalsModule**
- Path: `src/modules/vitals/VitalsModule.tsx`
- Purpose: Modular Vitals Module  This module provides a self-contained vitals management system with: - Dynamic form generation from JSON schemas - Vitals collection with real-time validation - Trend analysis and historical views - Clinical alerts and safety checks - Integration with existing patient data
- Exports: VitalsModule



## 🔧 SERVICES & BUSINESS LOGIC

**admissionService**
- Path: `src/lib/admissionService.ts`
- Purpose: Admission Service Handles database operations for patient admission records and advanced directives
- Functions: AdmissionRecord, AdvancedDirective, fetchAdmissionRecord, upsertAdmissionRecord, fetchAdvancedDirective, upsertAdvancedDirective, createDefaultAdmissionRecord, createDefaultAdvancedDirective

**alertService**
- Path: `src/lib/alertService.ts`
- Purpose: Alert Service Handles real-time alert generation and management using Supabase
- Functions: DatabaseAlert, fetchActiveAlerts, createAlert, acknowledgeAlert, checkMedicationAlerts, checkVitalSignsAlerts, checkMissingVitalsAlerts, cleanupDuplicateAlerts, runAlertChecks, subscribeToAlerts, cleanupExpiredAlerts

**assessmentService**
- Path: `src/lib/assessmentService.ts`
- Purpose: Assessment Service Handles database operations for patient assessments
- Functions: PatientAssessment, createAssessment, fetchPatientAssessments, updateAssessment, deleteAssessment

**auditService**
- Path: `src/lib/auditService.ts`
- Purpose: Audit Service Handles logging of user actions for audit trail purposes
- Functions: AuditLog, logAction, fetchTargetActivity, fetchUserActivity

**connectionTest**
- Path: `src/lib/connectionTest.ts`
- Purpose: Connection Test Utility  This module provides functions to test and diagnose Supabase connection issues.
- Functions: runConnectionTest, getConnectionStatus

**imageService**
- Path: `src/lib/imageService.ts`
- Purpose: Image Service Handles uploading, retrieving, and managing patient images
- Functions: PatientImage, Annotation, uploadPatientImage, fetchPatientImages, updateImageAnnotations, deletePatientImage

**medicationService**
- Path: `src/lib/medicationService.ts`
- Purpose: Medication Service Handles database operations for medications and medication administrations
- Functions: fetchPatientMedications, createMedication, updateMedication, deleteMedication, updateMedicationNextDue, recordMedicationAdministration, fetchMedicationAdministrationHistory, getPatientByMedicationId

**multiTenantPatientService**
- Path: `src/lib/multiTenantPatientService.ts`
- Purpose: Multi-Tenant Patient Service Handles all database operations for patient data with tenant isolation
- Functions: DatabasePatient

**patientService**
- Path: `src/lib/patientService.ts`
- Purpose: // Fetch vitals for all patients
    const { data: vitals, error: vitalsError } = await supabase
      .from('patient_vitals')
      .select(' ')
      .order('recorded_at', { ascending: false });ent Service Handles all database operations for patient data
- Functions: DatabasePatient, DatabaseVitals, DatabaseMedicationAdministration, fetchPatients, fetchPatientById, createPatient, updatePatient, deletePatient, createPatientNote, updatePatientNote, deletePatientNote, updatePatientVitals, fetchPatientVitals, getPatientVitals, fetchPatientNotes, getPatientNotes, clearPatientVitals, fetchPatientVitalsHistory

**queryClient**
- Path: `src/lib/queryClient.ts`
- Purpose: React Query Client Configuration for hacCare  Optimized for healthcare applications with: - Aggressive caching for patient data - Smart retry logic for medical operations - Healthcare-specific error handling
- Functions: queryClient, queryKeys

**schemaEngine**
- Path: `src/lib/schemaEngine.ts`
- Purpose: JSON Schema Engine for Dynamic Form Generation  This module provides the core engine for generating dynamic forms from JSON schemas. It handles form rendering, validation, conditional logic, and healthcare-specific features.  Features: - Dynamic form generation from JSON schemas - Real-time validation with healthcare rules - Conditional field rendering - Multi-step form support - Clinical validation and alerts - Integration with patient data context
- Functions: SchemaEngine, FormConfiguration, ProcessedField, ProcessedLayout, ProcessedValidation, schemaEngine

**subdomainService**
- Path: `src/lib/subdomainService.ts`
- Purpose: Subdomain Detection and Tenant Resolution Service  This service detects the current subdomain and resolves it to a tenant. Used for multi-tenant subdomain routing in production.
- Functions: getCurrentSubdomain, isMainDomain, redirectToTenantSubdomain, getDevTenantFromUrl, buildTenantUrl

**supabase**
- Path: `src/lib/supabase.ts`
- Purpose: Supabase Configuration and Client Setup  This module handles the initialization and configuration of the Supabase client for the hacCare hospital management system. It includes: - Environment variable validation - Client configuration with optimized settings - Type definitions for user profiles and roles - Proper error handling for connection issues  IMPORTANT: This app uses ONLY Supabase for data persistence. No localStorage or sessionStorage is used for application data. All user sessions, profiles, and application state are managed by Supabase.
- Functions: supabase, isSupabaseConfigured, UserRole, UserProfile, checkDatabaseHealth, testSupabaseConnection

**tenantService**
- Path: `src/lib/tenantService.ts`
- Purpose: Tenant Service  This service handles all tenant-related operations including: - CRUD operations for tenants - Tenant user management - Multi-tenant data filtering - Management dashboard statistics
- Functions: filterByTenant, hasPermission, switchTenantContext, getSuperAdminSelectedTenant, clearSuperAdminTenantSelection

**tenantServiceDirectQuery**
- Path: `src/lib/tenantServiceDirectQuery.ts`
- Purpose:  Alternative getTenantUsers function that bypasses RPC
- Functions: 

**woundService**
- Path: `src/lib/woundService.ts`
- Purpose: Wound Service Handles database operations for patient wound assessments
- Functions: Wound, WoundUI, fetchPatientWounds, createWound, updateWound, deleteWound



## 📊 DATA FLOW & STATE MANAGEMENT

### Data Flow Architecture:

1. **Supabase Client** (`src/lib/supabase.ts`) - Central database connection
2. **Service Layer** (`src/lib/*Service.ts`) - Business logic and API calls  
3. **React Query Hooks** (`src/hooks/queries/`) - Data fetching and caching
4. **React Components** - UI rendering and user interaction
5. **Context Providers** - Global state management (tenant, auth, theme)

### State Management Pattern:
- **Local State**: React `useState` for component-specific data
- **Server State**: TanStack Query for API data with caching
- **Global State**: React Context for tenant, authentication, theme
- **Form State**: Dynamic forms managed by schema engine

### Real-Time Updates:
- Supabase real-time subscriptions for live data
- Automatic UI updates when data changes
- Multi-tenant data isolation through RLS policies

## 🔐 SECURITY & MULTI-TENANCY

### Multi-Tenant Security Model:

1. **Row Level Security (RLS)**: Database-level tenant isolation
2. **Authentication**: Supabase Auth with role-based access
3. **Tenant Context**: Global tenant selection and switching
4. **Data Sanitization**: PHI protection and XSS prevention
5. **API Security**: Service role keys for admin operations

### Key Security Files:
- `src/contexts/TenantContext.tsx` - Tenant state management
- `src/lib/subdomainService.ts` - Subdomain-based tenant routing  
- `src/utils/sanitization.ts` - PHI protection and sanitization
- `sql-patches/fixes/` - RLS policy implementations

### Security Patterns:
- All database queries filtered by tenant_id
- User roles verified before sensitive operations
- PHI data sanitized before external API calls
- Audit trails for all medical record changes

## 🚀 MODULE SYSTEM

### Modular System Architecture:

The hacCare system uses self-contained modules for different medical workflows:

### Module Integration:
- All modules integrate with `ModularPatientDashboard`
- Modules use `DynamicForm` for data input
- Schema-driven validation and form generation
- Consistent patient data interface across modules

## 📋 SCHEMA SYSTEM

### JSON Schema System:

Dynamic form generation using JSON schemas for healthcare forms:

**formsSchemas**
- Path: `src/schemas/formsSchemas.ts`
- Purpose: Forms Module Schemas  JSON schemas for clinical assessment and documentation forms

**medicationSchemas**
- Path: `src/schemas/medicationSchemas.ts`
- Purpose: MAR (Medication Administration Record) Module Schemas  JSON schemas for dynamic medication administration forms

**vitalsSchemas**
- Path: `src/schemas/vitalsSchemas.ts`
- Purpose: Vitals Module Schema  JSON schema for dynamic vital signs collection forms

### Schema Features:
- **Field Types**: Healthcare-specific field types (vital signs, medications, pain scales)
- **Validation**: Clinical validation rules and safety checks
- **Conditional Logic**: Fields that show/hide based on other inputs
- **Multi-Step Forms**: Complex workflows broken into manageable steps
- **Auto-Save**: Automatic form state preservation

## 🛠️ DEVELOPMENT PATTERNS

### Development Patterns & Best Practices:

#### Code Organization:
- **Feature-based**: Group related components, hooks, and services
- **Modular**: Self-contained modules with clear interfaces
- **Type-safe**: Full TypeScript coverage for medical data
- **Documented**: JSDoc comments for complex medical logic

#### Naming Conventions:
- **Components**: PascalCase (e.g., `VitalsModule`)
- **Hooks**: camelCase with "use" prefix (e.g., `usePatients`)
- **Services**: camelCase with "Service" suffix (e.g., `patientService`)
- **Types**: PascalCase interfaces (e.g., `Patient`, `VitalSigns`)

#### Medical Data Patterns:
- Always validate medical data with appropriate ranges
- Use proper units and precision for measurements
- Implement safety checks for critical values
- Maintain audit trails for regulatory compliance

#### Multi-Tenant Patterns:
- Always include tenant_id in database queries
- Use `useTenant()` hook for current tenant context
- Test tenant isolation thoroughly
- Handle tenant switching gracefully

## 🧪 TESTING STRATEGY

### Testing Strategy:

#### Test Categories:
- **Unit Tests** (`tests/unit/`): Individual functions and components
- **Integration Tests** (`tests/integration/`): Multi-tenant functionality
- **Utility Tests** (`tests/utilities/`): Database operations and maintenance

#### Key Test Files:
- `test-tenant-isolation.js` - Verifies multi-tenant data separation
- `test-foreign-keys.js` - Database relationship integrity
- `test-user-creation.js` - User management workflows

#### Testing Patterns:
- Mock Supabase client for unit tests
- Use real database for integration tests
- Test medical data validation thoroughly
- Verify tenant isolation in all scenarios

## 🔄 DEPLOYMENT & OPERATIONS

### Deployment Configuration:

#### Build System:
- **Vite**: Modern build tool with fast HMR
- **TypeScript**: Compile-time type checking
- **Tailwind CSS**: Utility-first styling
- **ESLint**: Code quality and consistency

#### Environment Configuration:
- `vite.config.ts` - Build and development server config
- `tailwind.config.js` - Styling system configuration
- `tsconfig.json` - TypeScript compiler options
- `.env` files - Environment-specific variables

#### Deployment Targets:
- **Netlify** (`netlify.toml`) - Static site deployment
- **Vercel** (`vercel.json`) - Serverless deployment
- **Docker**: Containerized deployment option

#### Database Management:
- **Supabase**: Hosted PostgreSQL with real-time features
- **Migrations**: SQL patches in `sql-patches/` directory
- **Backup**: Automated backups and point-in-time recovery

## 📚 AI ASSISTANT REFERENCE

### When helping with hacCare development:

1. **Always consider multi-tenancy**: Every data operation should respect tenant isolation
2. **Use the modular system**: Leverage existing modules rather than creating standalone components
3. **Follow the schema pattern**: Use JSON schemas for form generation
4. **Maintain type safety**: All medical data should be properly typed
5. **Consider security**: PHI protection and access controls are critical
6. **Test thoroughly**: Healthcare applications require extensive testing

### Common Development Tasks:

#### Adding a New Medical Workflow:
1. Create a new module in `src/modules/[workflow-name]/`
2. Define JSON schemas in `src/schemas/`
3. Register schemas with the schema engine
4. Integrate with `ModularPatientDashboard`
5. Add appropriate tests

#### Modifying Patient Data:
1. Update TypeScript interfaces in `src/types/`
2. Modify database services in `src/lib/`
3. Update relevant components/modules
4. Ensure RLS policies are maintained
5. Test multi-tenant isolation

#### Adding New Form Fields:
1. Define field schema in appropriate schema file
2. Create field component if needed in `src/components/forms/fields/`
3. Register with `DynamicForm` component
4. Add validation rules
5. Test with different data types

## 📖 CODEBASE METRICS

- **Total Components**: 77
- **Services & Libraries**: 16
- **Custom Hooks**: 15
- **Schema Definitions**: 3
- **Modular Systems**: 0
- **Utility Functions**: 14
- **Type Definitions**: 12

---

*This guide is automatically generated from code analysis. For the most current information, regenerate using `node scripts/cleanup/create-ai-guide.js`*