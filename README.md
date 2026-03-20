# hacCare

Version 5.3.0

A multi-tenant healthcare simulation platform for clinical education. Built with React, TypeScript, and Supabase.

## Overview

hacCare is a simulated Electronic Medical Record (EMR) system designed for healthcare education and clinical training. It provides realistic patient care workflows including barcode medication administration (BCMA), vital signs monitoring, clinical documentation, and simulation management with role-based access control.

## Core Features

### Patient Care Management
- Complete patient profiles with demographics and medical history
- Real-time vital signs monitoring with automated alerts
- Medication administration tracking with Five Rights verification
- Clinical assessments including wound care and diabetic management
- Patient notes system with categorization and priority levels
- 24-hour Medication Administration Record (MAR) view

### Barcode Medication Administration (BCMA)
- Five Rights verification (Patient, Medication, Dose, Route, Time)
- Multi-format barcode scanner support
- Patient wristband and medication label generation
- Automatic patient identification via hospital bracelets
- Complete audit trail for regulatory compliance

### Clinical Documentation
- Wound assessment tools with photo documentation
- Laboratory order management with specimen tracking
- Body mapping system for device and wound tracking
- Admission and discharge processing workflows
- Printable labels compatible with Avery 5160 format

### Alert System
- Real-time patient monitoring with priority classification
- Medication due alerts with intelligent deduplication
- Critical vital sign notifications
- Acknowledgment workflow with audit logging
- Escalation rules for unacknowledged alerts

### Simulation System
- Template-based patient scenarios for teaching
- Multi-session simulation support with data isolation
- Student activity tracking and review
- Debrief report generation with PDF export
- Schema-agnostic design for automatic database adaptation

### Security & Compliance
- Role-based access control (Student, Instructor, Coordinator, Admin, Super Admin)
- HIPAA-compliant data handling with encryption
- Comprehensive audit trails for all actions
- Secure session management with automatic timeout
- Multi-tenant isolation with Row Level Security

## Technical Stack

- React 19.2 with TypeScript 5.3
- Vite 7.3 for build tooling
- Supabase (PostgreSQL 15) with Row Level Security
- Tailwind CSS 4.2 for responsive design
- TanStack Query 5.90 for data synchronization
- React Router 7.13 for navigation

## Version History

### 5.3.0 (March 2026)
- Made assigned nurse field optional for simulation workflows
- Fixed all security vulnerabilities (7 high/moderate issues resolved)
- Updated Supabase SDK to 2.99.0 for improved API compatibility
- Updated React, Vite, Tailwind, and build tooling to latest versions
- Improved multi-role support for students, instructors, and coordinators

### 5.2.0 (February 2026)
- Template versioning system with smart simulation sync
- Program-based instructor permissions
- Student management improvements
- Enhanced simulation portal with card-based UI
- Coordinator auto-login fix for program tenants
- Lab orders system with specimen tracking
- Body mapping for device and wound tracking
- BCMA Five Rights verification with barcode scanning

### 5.1.0 (January 2026)
- Alert system with smart deduplication
- Priority classification and escalation
- Real-time notifications
- Enhanced security diagnostics

### 5.0.0 (December 2025)
- New simulation system architecture
- Template management and reusable scenarios
- Student activity tracking
- Multi-tenant isolation improvementsement
- Vital signs tracking
- User authentication

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm or yarn package manager
- Supabase account for database

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`
4. Run development server: `npm run dev`
5. Build for production: `npm run build`

### Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- Architecture guides in `docs/architecture/`
- Feature documentation in `docs/features/`
- Database schema in `docs/database/`
- Deployment guides in `docs/deployment/`
- Operations and troubleshooting in `docs/operations/`

## Security

This application handles simulated protected health information (PHI) for educational purposes. All security features follow HIPAA compliance guidelines including:

- End-to-end encryption for sensitive data
- Comprehensive audit logging
- Role-based access controls
- Secure session management
- Automatic PHI redaction in logs

Report security issues to the repository maintainers.

## License

See LICENSE file for details.

## Support

For issues, questions, or contributions, please use the GitHub issue tracker.

Built with ❤️ by the hacCare Team | A haclabs product