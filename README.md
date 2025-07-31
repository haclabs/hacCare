# 🏥 hacCare - Advanced Healthcare Management System

A comprehensive, modern healthcare management platform built with React 18, TypeScript, and Supabase, designed for real-world clinical environments with advanced BCMA (Barcode Medication Administration), patient management, security diagnostics, diabetic care, and medical documentation systems.

## 🌟 Key Highlights

- **🚀 Modern Tech Stack**: React 18, TypeScript, Vite 7.0.5, Supabase
- **📱 Mobile-First Design**: Responsive interface optimized for tablets and mobile devices
- **🔒 Enterprise Security**: Row Level Security, role-based access control, HIPAA-compliant data handling
- **⚡ Real-Time Updates**: Live patient data synchronization and alert notifications
- **🔍 Advanced Barcode Scanning**: Multi-format barcode support with BCMA integration
- **🏥 BCMA System**: Complete barcode-driven medication administration with Five Rights verification
- **📊 Comprehensive Analytics**: Patient statistics, medication tracking, and clinical insights
- **🩺 Specialized Care Modules**: Diabetic record management and advanced clinical documentation

## 🚀 Core Features

### 📱 Patient Management Suite
- **Complete Patient Profiles**: Demographics, medical history, allergies, emergency contacts
- **Vital Signs Monitoring**: Real-time tracking with automated alert thresholds
- **Medication Administration**: Due time tracking, administration history, drug interaction alerts
- **BCMA Integration**: Barcode-driven medication safety with Five Rights verification
- **Diabetic Care Management**: Specialized glucose monitoring and insulin tracking
- **Clinical Assessments**: Wound care documentation, admission records, advanced directives
- **Patient Notes System**: Categorized notes with priority levels and search functionality
- **Medical History Timeline**: Chronological view of patient care events
- **24-Hour MAR View**: Comprehensive medication administration tracking

### 🔍 Smart Barcode Integration & BCMA System
- **BCMA (Barcode Medication Administration)**: Complete Five Rights verification system
- **Professional Barcode Generation**: Patient wristbands and medication labels with print capability
- **Multi-Format Scanner Support**: Patient IDs (PT12345), medication barcodes, specimen labels
- **Intelligent Input Detection**: Distinguishes scanner input from manual keyboard entry
- **Patient Identification**: Instant lookup via hospital bracelets and chart labels
- **Medication Verification**: Barcode-driven administration with comprehensive safety checks
- **Equipment Tracking**: Medical device and supply management
- **Debug & Troubleshooting**: Visual feedback and comprehensive logging
- **Five Rights Verification**: Patient, Medication, Dose, Route, and Time validation
- **Audit Trail Compliance**: Complete logging for regulatory requirements

### 🚨 Advanced Alert System
- **Real-Time Monitoring**: Continuous patient status and medication due alerts
- **Smart Deduplication**: Prevents duplicate notifications for same conditions
- **Priority Classification**: High, medium, low priority with visual indicators
- **Acknowledgment Workflow**: Debounced acknowledgment with optimistic UI updates
- **Alert Categories**: Medications, vitals, emergencies, lab results, discharge readiness
- **Escalation Rules**: Automatic escalation for critical unacknowledged alerts

### 📊 Clinical Documentation & Reporting
- **Hospital Bracelets**: Generate UPC-128 compatible patient identification with print capability
- **BCMA Barcode Labels**: Professional medication and patient barcode generation
- **Label Generation**: Avery 5160 compatible labels for charts and specimens
- **Wound Assessment Tools**: Detailed measurement tracking and photo documentation
- **Image Annotation**: Advanced medical image markup with measurement tools
- **Admission Processing**: Comprehensive intake and documentation workflows
- **Analytics Dashboard**: Patient statistics, medication compliance, alert trends
- **Diabetic Record Reports**: Glucose trends, insulin tracking, and clinical insights
- **Audit Trail Reports**: Comprehensive logging for regulatory compliance

### 🩺 Specialized Clinical Modules
- **Diabetic Record Management**: Comprehensive diabetes care with glucose monitoring
- **Insulin Administration Tracking**: Basal-Bolus therapy support with correction insulin units
- **Glucose Trend Analysis**: Time-in-range calculations and clinical decision support
- **MAR Integration**: Seamless medication administration record management
- **24-Hour Medication History**: Complete administration tracking and audit trails
- **BCMA Workflow**: Barcode-driven medication safety with Five Rights verification
- **Clinical Assessment Tools**: Wound care, vital signs, and patient monitoring

### 🔐 Advanced Security & Compliance
- **HIPAA Compliance**: Secure data handling with comprehensive audit trails
- **Enhanced Security Diagnostics**: AI-powered threat detection and monitoring
- **Secure Logging Service**: PHI-compliant logging with automatic redaction
- **Role-Based Access**: Nurse, admin, and super admin permission levels
- **Session Management**: Automatic timeout and secure authentication
- **Data Encryption**: End-to-end encryption for sensitive medical data
- **Real-time Security Monitoring**: Continuous assessment and threat detection
- **Audit Logging**: Comprehensive activity tracking and compliance reporting

## 🛠️ Technology Stack

### Frontend Architecture
- **React 18.2.0** - Modern React with hooks, concurrent features, and Suspense
- **TypeScript 5.3.3** - Full type safety with strict mode for medical data integrity
- **Vite 7.0.5** - Next-generation frontend tooling with lightning-fast HMR
- **Tailwind CSS 3.4.1** - Utility-first CSS framework for responsive design
- **React Router v6.21.0** - Client-side routing with lazy loading and error boundaries
- **TanStack Query 5.17.0** - Powerful data synchronization and caching
- **Lucide React 0.312.0** - Beautiful, consistent iconography

### Backend & Database
- **Supabase 2.39.0** - Backend-as-a-Service with PostgreSQL and real-time features
- **PostgreSQL** - Enterprise-grade relational database with ACID compliance
- **Real-time Subscriptions** - Live data updates for patient monitoring
- **Row Level Security (RLS)** - Database-level security policies
- **Edge Functions** - Serverless functions for complex medical logic

### Healthcare-Specific Libraries
- **date-fns 3.2.0** - Comprehensive date manipulation for medical scheduling
- **uuid 11.1.0** - Unique identifier generation for patient records and audit trails
- **react-dropzone 14.3.8** - File upload system for medical documents and images
- **react-image-marker 1.2.0** - Advanced medical image annotation and measurement
- **dompurify 3.2.6** - XSS protection and sanitization for medical data inputs
- **Custom BCMA Service** - Healthcare-optimized barcode medication administration
- **Custom Security Framework** - HIPAA-compliant logging and threat detection
- **UPC-128 Generation** - Patient bracelet and label barcode creation

### Development & Quality Tools
- **TypeScript ESLint 8.37.0** - Advanced code linting with healthcare-specific rules
- **Vitest 1.2.0** - Modern unit testing framework with coverage reporting
- **PostCSS 8.4.33** - CSS processing with autoprefixer
- **npm-check-updates 16.14.12** - Automated dependency management
- **GitHub Codespaces** - Cloud-based development environment

### Testing & Quality Assurance
- **@testing-library/react 14.1.2** - Component testing utilities
- **@testing-library/jest-dom 6.2.0** - DOM testing matchers
- **@testing-library/user-event 14.5.2** - User interaction simulation
- **Vitest Coverage 1.2.0** - Code coverage reporting and analysis

## 📋 System Requirements

- **Node.js**: 18.0.0 or higher (specified in package.json engines)
- **npm**: 8.0.0 or higher for package management
- **Browser Support**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Supabase Account**: Required for backend services and database
- **Hardware Scanner**: Optional USB/Bluetooth barcode scanner for enhanced functionality

## 🚀 Quick Start Guide

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/haclabs/hacCare.git
cd hacCare

# Install all dependencies
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the project root:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Development Settings
VITE_DEBUG_BARCODE=true
VITE_MOCK_DATA=false
```

### 3. Database Initialization
Execute these SQL scripts in your Supabase dashboard:

```sql
-- Core patient management tables
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vital signs monitoring
CREATE TABLE patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  temperature DECIMAL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Clinical notes and documentation
CREATE TABLE patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  note_type VARCHAR NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alert and notification system
CREATE TABLE patient_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  alert_type VARCHAR NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR DEFAULT 'medium',
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Medication management
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  medication_name VARCHAR NOT NULL,
  dosage VARCHAR,
  frequency VARCHAR,
  due_time TIMESTAMP,
  administered_at TIMESTAMP,
  administered_by UUID
);
```

### 4. Development Server
```bash
# Start the development server
npm run dev

# The application will be available at:
# http://localhost:5173
```

### 5. Additional Scripts
```bash
# Type checking
npm run type-check

# Code linting and formatting
npm run lint
npm run lint:fix

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Dependency management
npm run deps:check    # Check for updates
npm run deps:update   # Update dependencies

# Production build
npm run build
npm run preview       # Preview production build
```

## 🏗️ Project Architecture

```
hacCare/
├── 📁 src/
│   ├── 📄 App.tsx                    # Main application component
│   ├── 📄 main.tsx                   # Application entry point
│   ├── 📄 TestApp.tsx               # Testing and development utilities
│   ├── 📄 index.css                 # Global styles and Tailwind imports
│   ├── 📄 vite-env.d.ts            # Vite type definitions
│   │
│   ├── 📁 api/                      # External API integrations
│   │   └── 📄 advancedDirectives.ts # Advanced directives API
│   │
│   ├── 📁 components/               # React component library
│   │   ├── 📄 MainApp.tsx          # Main application container
│   │   ├── 📁 Alerts/              # Alert and notification components
│   │   │   └── 📄 AlertPanel.tsx    # Alert management interface
│   │   ├── 📁 Auth/                # Authentication components
│   │   │   ├── 📄 LoginForm.tsx     # User login interface
│   │   │   └── 📄 ProtectedRoute.tsx # Route protection wrapper
│   │   ├── 📁 bcma/                # BCMA (Barcode Medication Administration)
│   │   │   ├── 📄 BCMAAdministration.tsx # Main BCMA workflow
│   │   │   ├── 📄 BarcodeGenerator.tsx # Barcode generation and printing
│   │   │   └── 📄 BCMAVerification.tsx # Five Rights verification
│   │   ├── 📁 Changelog/           # Version and update tracking
│   │   │   └── 📄 Changelog.tsx     # Application changelog display
│   │   ├── 📁 Dashboard/           # Analytics and overview
│   │   │   └── 📄 QuickStats.tsx    # Patient statistics dashboard
│   │   ├── 📁 DiabeticRecordModule/ # Diabetic care management
│   │   │   └── 📄 DiabeticRecordModule.tsx # Glucose and insulin tracking
│   │   ├── 📁 Documentation/       # Help and documentation
│   │   │   └── 📄 Documentation.tsx # User documentation interface
│   │   ├── 📁 Layout/              # Application layout components
│   │   │   ├── � Header.tsx        # Navigation header
│   │   │   └── 📄 Sidebar.tsx       # Navigation sidebar
│   │   ├── 📁 Patients/            # Patient management suite
│   │   │   ├── 📄 AssessmentDetail.tsx # Clinical assessment details
│   │   │   ├── 📄 PatientManagement.tsx # Patient list and management
│   │   │   ├── 📁 forms/           # Patient data entry forms
│   │   │   ├── 📁 records/         # Medical record components
│   │   │   ├── 📁 visuals/         # Patient data visualizations
│   │   │   └── 📁 vitals/          # Vital signs components
│   │   ├── 📁 Settings/            # System configuration
│   │   │   ├── 📄 ConnectionDiagnostics.tsx # Network diagnostics
│   │   │   ├── 📄 SecurityConnectionDiagnostics.tsx # Security monitoring
│   │   │   ├── 📄 SecuritySettings.tsx # Security configuration
│   │   │   └── 📄 Settings.tsx      # General settings interface
│   │   ├── 📁 StatusMonitor/       # System health monitoring
│   │   │   ├── 📄 ConnectionStatus.tsx # Network status indicator
│   │   │   ├── 📄 FeatureStatus.tsx # Feature availability status
│   │   │   ├── 📄 SystemStatus.tsx  # Overall system health
│   │   │   └── 📄 index.tsx         # Status monitor entry point
│   │   ├── 📁 UI/                  # Reusable UI components
│   │   │   ├── 📄 BarcodeScanner.tsx # Barcode scanning interface
│   │   │   └── 📄 LoadingSpinner.tsx # Loading state indicator
│   │   └── 📁 Users/               # User management
│   │       ├── 📄 UserForm.tsx      # User creation/editing form
│   │       └── 📄 UserManagement.tsx # User administration interface
│   │
│   ├── 📁 contexts/                # React context providers
│   │   ├── 📄 AlertContext.tsx     # Alert state management
│   │   ├── 📄 AuthContext.tsx      # Authentication state
│   │   ├── 📄 PatientContext.tsx   # Patient data context
│   │   ├── 📄 ThemeContext.tsx     # UI theme management
│   │   └── 📁 auth/               # Authentication utilities
│   │       └── 📄 AuthContext.tsx   # Enhanced auth context
│   │
│   ├── 📁 data/                    # Static data and mocks
│   │   └── 📄 mockData.ts          # Development mock data
│   │
│   ├── � hooks/                   # Custom React hooks
│   │   ├── 📄 useAlerts.ts         # Alert management hook
│   │   ├── 📄 useAuth.ts           # Authentication hook
│   │   ├── 📄 useBarcodeScanner.ts # Barcode scanner hook
│   │   ├── 📄 usePatients.ts       # Patient data hook
│   │   ├── 📄 useTheme.ts          # Theme management hook
│   │   └── 📁 queries/            # TanStack Query hooks
│   │       ├── 📄 useAlerts.ts     # Alert queries
│   │       ├── 📄 useAssessments.ts # Assessment queries
│   │       ├── 📄 useAuth.ts       # Authentication queries
│   │       ├── 📄 useMedications.ts # Medication queries
│   │       └── 📄 usePatients.ts   # Patient queries
│   │
│   ├── 📁 lib/                     # External libraries and services
│   │   ├── 📄 admissionService.ts  # Patient admission logic
│   │   ├── 📄 alertService.ts      # Alert processing service
│   │   ├── 📄 assessmentService.ts # Clinical assessment service
│   │   ├── 📄 auditService.ts      # Audit trail and logging
│   │   ├── 📄 bcmaService.ts       # BCMA medication administration
│   │   ├── 📄 connectionTest.ts    # Network connectivity testing
│   │   ├── 📄 imageService.ts      # Medical image processing
│   │   ├── 📄 medicationService.ts # Medication management
│   │   ├── 📄 patientService.ts    # Patient data operations
│   │   ├── 📄 queryClient.ts       # TanStack Query configuration
│   │   ├── 📄 secureLogger.ts      # HIPAA-compliant logging service
│   │   ├── 📄 securityHeaders.ts   # Security headers configuration
│   │   ├── 📄 supabase.ts          # Supabase client setup
│   │   └── 📄 woundService.ts      # Wound care management
│   │
│   ├── 📁 modules/                 # Feature modules
│   │   └── 📁 mar/                # Medication Administration Record
│   │       ├── 📄 MARModule.tsx    # Main MAR interface with BCMA integration
│   │       └── 📁 components/     # MAR-specific components
│   │           └── 📄 MedicationHistoryView.tsx # 24-hour medication history
│   │
│   ├── 📁 Patients/               # Legacy patient components  
│   │   └── 📁 records/            # Medical record components
│   │       └── 📄 MedicationAdministration.tsx
│   │
│   ├── 📁 types/                  # TypeScript type definitions
│   │   └── 📄 index.ts            # Central type exports
│   │
│   └── 📁 utils/                  # Utility functions
│       ├── 📄 authErrorParser.ts  # Authentication error handling
│       ├── 📄 barcodeUtils.tsx    # Barcode processing utilities
│       ├── 📄 dateUtils.ts        # Date manipulation helpers
│       ├── 📄 patientUtils.ts     # Patient data utilities
│       ├── 📄 sanitization.ts     # Data sanitization and PHI protection
│       └── 📄 time.ts             # Time formatting and calculations
│
├── 📄 package.json               # Project dependencies and scripts
├── 📄 tsconfig.json             # TypeScript configuration
├── 📄 vite.config.ts            # Vite build configuration
├── 📄 tailwind.config.js        # Tailwind CSS configuration
├── 📄 eslint.config.js          # ESLint linting rules
├── 📄 postcss.config.js         # PostCSS configuration
└── 📄 README.md                 # Project documentation
```

## 📦 Complete Dependency List

### 🚀 Production Dependencies
```json
{
  "@supabase/supabase-js": "^2.39.0",        // Supabase client for backend services
  "@tanstack/react-query": "^5.17.0",       // Powerful data synchronization library
  "@tanstack/react-query-devtools": "^5.17.0", // Development tools for React Query
  "class-variance-authority": "^0.7.0",      // CSS class utility for variant management
  "clsx": "^2.1.0",                          // Utility for constructing className strings
  "date-fns": "^3.2.0",                      // Modern JavaScript date utility library
  "lucide-react": "^0.312.0",                // Beautiful & consistent icon toolkit
  "react": "^18.2.0",                        // React library for building user interfaces
  "react-dom": "^18.2.0",                    // React package for working with the DOM
  "react-dropzone": "^14.3.8",               // File upload dropzone component
  "react-image-marker": "^1.2.0",            // Image annotation and marking component
  "react-router-dom": "^6.21.0",             // Declarative routing for React applications
  "uuid": "^11.1.0"                          // RFC4122 (v1, v4, and v5) UUIDs
}
```

### 🛠️ Development Dependencies
```json
{
  "@testing-library/jest-dom": "^6.2.0",     // Custom jest matchers for DOM nodes
  "@testing-library/react": "^14.1.2",       // React testing utilities
  "@testing-library/user-event": "^14.5.2",  // User event simulation for testing
  "@types/node": "^20.11.0",                 // TypeScript definitions for Node.js
  "@types/react": "^18.2.48",                // TypeScript definitions for React
  "@types/react-dom": "^18.2.18",            // TypeScript definitions for React DOM
  "@types/uuid": "^10.0.0",                  // TypeScript definitions for UUID
  "@typescript-eslint/eslint-plugin": "^8.37.0", // ESLint plugin for TypeScript
  "@typescript-eslint/parser": "^8.37.0",    // ESLint parser for TypeScript
  "@vitejs/plugin-react": "^4.6.0",          // Vite plugin for React support
  "@vitest/coverage-v8": "^1.2.0",           // Coverage reporting for Vitest
  "autoprefixer": "^10.4.16",                // PostCSS plugin to parse CSS
  "eslint": "^8.56.0",                       // Pluggable JavaScript linter
  "eslint-plugin-react-hooks": "^4.6.0",     // ESLint rules for React Hooks
  "eslint-plugin-react-refresh": "^0.4.5",   // ESLint plugin for React Fast Refresh
  "npm-check-updates": "^16.14.12",          // Utility to upgrade package.json dependencies
  "postcss": "^8.4.33",                      // Tool for transforming CSS with JavaScript
  "tailwindcss": "^3.4.1",                   // Utility-first CSS framework
  "typescript": "^5.3.3",                    // TypeScript language and compiler
  "vite": "^7.0.5",                          // Next generation frontend tooling
  "vitest": "^1.2.0"                         // Vite-native unit test framework
}
```

## 🔒 Security & Data Management

### Data Storage Architecture
**Critical**: This application implements a **Supabase-first** architecture for maximum security and compliance:

- ✅ **Primary Data Store**: All patient data stored in Supabase PostgreSQL with enterprise-grade encryption
- ✅ **Session Management**: Supabase Auth handles all authentication sessions with automatic refresh
- ✅ **Real-time Sync**: Live data updates through Supabase real-time subscriptions
- ✅ **Backup & Recovery**: Automated Supabase backup system with point-in-time recovery
- ❌ **No Local Storage**: Zero reliance on localStorage/sessionStorage for sensitive data
- ❌ **No Client Caching**: Medical data never cached locally beyond temporary UI state

### HIPAA Compliance Features
- **End-to-End Encryption**: All data encrypted in transit and at rest
- **Role-Based Access Control (RBAC)**: Granular permissions for nurses, administrators, and super admins
- **Audit Trails**: Comprehensive logging of all patient data access and modifications
- **Session Security**: Automatic timeout, secure token refresh, and session invalidation
- **Data Minimization**: Only necessary patient data is transmitted and displayed
- **Row Level Security**: Database-level security policies prevent unauthorized data access

### Authentication & Authorization
- **Multi-Factor Authentication**: Optional MFA support for enhanced security
- **Password Policies**: Enforced strong password requirements with breach detection
- **Role Hierarchy**: Nurse → Admin → Super Admin with escalating permissions
- **API Security**: All backend operations secured with JWT tokens and RLS policies

## 🧪 Development & Testing

### Available Scripts
- **`npm run dev`**: Start development server with hot module replacement
- **`npm run build`**: Create optimized production build with TypeScript compilation
- **`npm run preview`**: Preview production build locally
- **`npm run lint`**: Run ESLint with TypeScript support
- **`npm run lint:fix`**: Automatically fix linting issues
- **`npm run type-check`**: Run TypeScript compiler without emitting files
- **`npm run test`**: Execute unit tests with Vitest
- **`npm run test:watch`**: Run tests in watch mode for development
- **`npm run test:coverage`**: Generate comprehensive test coverage reports
- **`npm run clean`**: Clean build artifacts and node_modules cache
- **`npm run deps:update`**: Update all dependencies to latest versions
- **`npm run deps:check`**: Check for available dependency updates
- **`npm run prepare`**: Pre-commit hook for type checking

### Testing Strategy
- **Unit Tests**: Component and utility function testing with Vitest
- **Integration Tests**: API and database interaction testing
- **User Event Testing**: Simulated user interactions with Testing Library
- **Coverage Reports**: Maintain >90% test coverage for critical healthcare functions
- **Continuous Integration**: Automated testing on all pull requests

### Code Quality Standards
- **TypeScript Strict Mode**: Full type safety for medical data integrity
- **ESLint Configuration**: Healthcare-specific linting rules and best practices
- **Prettier Integration**: Consistent code formatting across the entire codebase
- **Husky Pre-commit Hooks**: Automated testing and linting before commits
- **Semantic Versioning**: Clear version management with automated changelog generation

## 🚀 Deployment Options

### 1. Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

### 2. Netlify Deployment
```bash
# Build the project
npm run build

# Deploy dist/ folder to Netlify
# Configure environment variables in Netlify dashboard
```

### 3. Traditional Hosting
```bash
# Build for production
npm run build

# Upload dist/ folder to your web server
# Ensure proper HTTPS configuration for HIPAA compliance
```

### 4. Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## 🔐 Production Configuration

### Environment Variables
```env
# Required Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional Production Settings
VITE_APP_VERSION=3.0.0
VITE_DEBUG_MODE=false
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id
```

### Supabase Production Setup
1. **Database Configuration**:
   - Enable Row Level Security on all tables
   - Configure backup schedules and retention policies
   - Set up read replicas for improved performance

2. **Authentication Settings**:
   - Enable multi-factor authentication
   - Configure password strength requirements
   - Set up email templates for password resets

3. **Security Policies**:
   - Implement role-based access control
   - Configure API rate limiting
   - Enable audit logging for compliance

4. **Performance Optimization**:
   - Set up connection pooling
   - Configure database indexes for optimal query performance
   - Enable query optimization and monitoring

## 📊 Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Sentry integration for real-time error monitoring
- **Performance Metrics**: Core Web Vitals and application performance monitoring
- **User Analytics**: Privacy-compliant usage analytics and user behavior tracking
- **Uptime Monitoring**: Automated health checks and alerting

### Healthcare-Specific Monitoring
- **Alert Response Times**: Monitor critical alert acknowledgment times
- **Patient Data Access**: Track access patterns for compliance auditing
- **System Availability**: 99.9% uptime requirement for critical healthcare operations
- **Data Backup Verification**: Automated backup integrity checks

## 🆘 Support & Maintenance

### Documentation Resources
- **API Documentation**: Comprehensive Supabase integration guides
- **Component Library**: Storybook documentation for all UI components
- **Deployment Guides**: Step-by-step production deployment instructions
- **Troubleshooting**: Common issues and resolution procedures

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Development Team**: Direct contact for critical healthcare issues
- **Community Support**: Healthcare IT community forums and discussions
- **Training Materials**: User training guides and video tutorials

### Maintenance Schedule
- **Weekly**: Dependency security updates and vulnerability scanning
- **Monthly**: Performance optimization and database maintenance
- **Quarterly**: Feature updates and compliance audits
- **Annually**: Comprehensive security audits and penetration testing

## 📜 Compliance & Legal

### HIPAA Compliance
- **Administrative Safeguards**: Access controls, workforce training, incident response
- **Physical Safeguards**: Server security, workstation controls, device encryption
- **Technical Safeguards**: Access controls, audit logs, data integrity, transmission security

### Data Protection
- **GDPR Compliance**: Right to access, rectify, erase, and data portability
- **State Regulations**: Compliance with local healthcare data protection laws
- **Industry Standards**: Adherence to HL7 FHIR standards for healthcare interoperability

## 📄 License & Attribution

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Third-Party Acknowledgments
- **React**: Facebook's open-source UI library
- **Supabase**: Open-source Firebase alternative
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide**: Beautiful open-source icons
- **All other dependencies**: See package.json for complete attribution

## 🔄 Changelog & Versioning

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and feature updates.

### Version 3.0.0 (Current) - Major Feature Release
- ✅ Complete BCMA (Barcode Medication Administration) system
- ✅ Five Rights medication verification workflow
- ✅ Professional barcode generation and printing
- ✅ Diabetic record management with glucose monitoring
- ✅ Enhanced security diagnostics with AI-powered threat detection
- ✅ 24-hour medication administration history tracking
- ✅ Secure logging service with PHI protection
- ✅ Comprehensive audit trails and compliance reporting
- ✅ Enhanced database architecture with improved RLS policies
- ✅ Major UI/UX improvements and mobile optimization

---

**🏥 hacCare v3.0.0** - *Revolutionizing healthcare management with BCMA medication administration, diabetic care, advanced security diagnostics, and healthcare professional-focused design.*

**Built with ❤️ by the hacCare Team** | **Powered by React, TypeScript, and Supabase**
