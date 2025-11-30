# hacCare

A comprehensive healthcare simulation and training platform for clinical education. Built with React, TypeScript, and Supabase.

## Overview

hacCare is a simulated Electronic Medical Record (EMR) system designed for healthcare education and clinical training. It provides realistic patient care workflows with features including barcode medication administration (BCMA), vital signs monitoring, clinical documentation, and multi-tenant simulation management.

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
- Role-based access control (Nurse, Admin, Super Admin)
- HIPAA-compliant data handling with encryption
- Comprehensive audit trails for all actions
- Secure session management with automatic timeout
- Multi-tenant isolation for data security

## Technical Stack

- React 18.2 with TypeScript 5.3
- Vite 7.1 for build tooling
- Supabase (PostgreSQL 15) with Row Level Security
- Tailwind CSS 3.4 for responsive design
- TanStack Query 5.17 for data synchronization
- React Router 6.26 for navigation

## Version History

### 5.2.0-rc5 (November 2025)
- Patient creation tenant race condition fix
- RLS infinite recursion resolution in simulation system
- Enhanced troubleshooting documentation
- Browser cache debugging improvements

### 5.2.0-rc4 (November 2025)
- Lab orders system with specimen tracking
- Body mapping system for device and wound tracking
- Simulation integration for clinical features
- Patient duplication across tenants

### 5.2.0-rc3 (October 2025)
- Diabetic record management system
- Enhanced glucose monitoring and insulin tracking
- Time-in-range analysis
- MAR integration improvements

### 5.2.0-rc2 (October 2025)
- BCMA Five Rights verification
- Advanced barcode scanning with multi-format support
- Patient identification workflow
- Medication safety checks

### 5.2.0-rc1 (October 2025)
- Enhanced security diagnostics
- AI-powered threat detection
- Secure logging service with PHI redaction
- Real-time security monitoring

### 5.1.0 (October 2025)
- Alert system with smart deduplication
- Priority classification and escalation
- Acknowledgment workflow
- Real-time notifications

### 5.0.0 (September 2025)
- New simulation system architecture
- Template management and reusable scenarios
- Student activity tracking
- Debrief report generation

### 4.0.0 (September 2025)
- Complete UI modernization
- Patient profile enhancements
- Vital signs monitoring improvements
- Clinical assessment tools

### 3.0.0 (August 2025)
- Multi-tenant architecture
- Role-based access control
- Session management
- Audit logging

### 2.0.0 (July 2025)
- Medication administration tracking
- Patient notes system
- Laboratory results management
- Clinical workflows

### 1.0.0 (June 2025)
- Initial release
- Basic patient management
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