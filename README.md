# hacCare

Version 5.5.0

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

### Frontend
- **React 19.2** with **TypeScript 6.0** (strict mode)
- **Vite 8.0** (Rolldown-based bundler) with `@vitejs/plugin-react` 6.0 (Oxc-powered React Refresh, no Babel)
- **Tailwind CSS 4.1** via PostCSS
- **React Router 7.15** for client-side navigation
- **TanStack Query 5.100** for server state, caching, and background sync
- **Lucide React 1.14** for icons
- **React Big Calendar 1.19** for scheduling views

### Backend & Database
- **Supabase** (PostgreSQL 15) hosted in **ca-central-1** (Canada) for data residency
- **Row Level Security (RLS)** enforcing multi-tenant isolation on every table
- **SECURITY DEFINER** functions for privileged cross-tenant operations
- **Supabase JS 2.105** client SDK

### Document & Barcode Generation
- **jsPDF 4.1** + **html2canvas 1.4** for PDF export
- **@react-pdf/renderer 4.5** for structured PDF reports
- **JsBarcode 3.12** for Code128 barcode generation
- **PapaParse 5.5** for CSV import/export

### Utilities
- **date-fns 4.1** for date formatting
- **DOMPurify 3.4** for XSS sanitisation
- **UUID 14.0** for identifier generation

### Dev Tooling
- **Vitest 4.1** for unit testing
- **ESLint 10.3** with TypeScript and React Hooks plugins
- **Terser 5.47** for production minification
- **rollup-plugin-visualizer 7.0** for bundle analysis (`npm run build -- --analyze`)

## Version History

### 5.5.0 (May 2026)
- Migrated infrastructure to Canada (ca-central-1) region for data residency compliance
- Fixed critical security vulnerabilities (jspdf HTML injection, flatted prototype pollution)
- Optional vital signs fields to support clinical edge cases (newborns, partial assessments)
- Fixed empty array handling in snapshot restore function
- Redeployed reset simulation functions with BBIT entries support
- Dependency and environment variable cleanup

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

This application handles simulated protected health information (PHI) for educational purposes. All security features follow HIPAA compliance guidelines.

### Continuous Security Scanning

- **GitHub CodeQL** — static analysis runs on every PR and push, scanning JavaScript/TypeScript and Python for vulnerabilities (SQL injection, XSS, path traversal, insecure randomness, etc.)
- **Snyk** — dependency vulnerability scanning on every PR, with results uploaded to the GitHub Security tab as SARIF reports
- **`npm audit`** — run locally and in CI to catch known CVEs in the dependency tree

All findings are reviewed before merging. Security alerts are visible under the **Security** tab of this repository.

### Application Security Controls

- **Multi-tenant Row Level Security** — every table enforces `tenant_id` isolation via PostgreSQL RLS; cross-tenant data leakage is blocked at the database layer
- **Role-based access control** — five-tier hierarchy (Super Admin → Coordinator → Admin → Instructor → Nurse) with program-scoped permissions
- **SECURITY DEFINER functions** — privileged operations (simulation launch, tenant creation) run as controlled database functions, not ad-hoc queries
- **DOMPurify sanitisation** — all user-supplied HTML is sanitised before rendering
- **Secure session management** — automatic timeout, token rotation via Supabase Auth
- **Comprehensive audit trails** — all clinical actions logged with user, timestamp, and tenant context
- **PHI redaction** — simulated patient data only; no real PHI is stored or transmitted

Report security issues to the repository maintainers.

## License

See LICENSE file for details.

## Support

For issues, questions, or contributions, please use the GitHub issue tracker.

Built with ❤️ by the hacCare Team | A haclabs product