# 📚 hacCare Documentation

Welcome to the hacCare documentation hub. This guide helps you find the information you need quickly.

---

## 🚀 Quick Start

**New to hacCare?**
- 📖 [Main Project README](../README.md) - Project overview, features, tech stack
- 🏥 [Getting Started Guide](getting-started/) - Setup and first steps
- 🗄️ [Database Setup](../database/README.md) - Run migrations and setup database

**Need to Deploy?**
- 🚀 [Security Hardening Deployment](architecture/security/SECURITY_HARDENING_DEPLOYMENT.md)
- 🔐 [Security Audit Analysis](architecture/security/SECURITY_AUDIT_ANALYSIS.md)

---

## 📂 Documentation Structure

### 🎯 [Features](features/)
Feature-specific documentation and guides:

- **[BCMA (Barcode Medication Administration)](features/bcma/)** - Medication scanning and Five Rights verification
- **[Simulation System](features/simulation/)** - Clinical scenario simulation and training
- **[Label Printing](features/labels/)** - Patient wristbands, medication labels, chart labels
- **[Laboratory System](features/labs/)** - Lab panels, results, and reference ranges
- **[Authentication](features/auth/)** - Microsoft OAuth, session management
- **[Backup System](features/backup/)** - Encrypted backups, restore procedures
- **[Patient Management](features/patients/)** - Patient records, landing page

### 🏗️ [Architecture](architecture/)
System design and technical decisions:

- **[Security](architecture/security/)** - Security audit, hardening, RLS policies, risk analysis

### 🔧 [Operations](operations/)
Deployment, monitoring, and troubleshooting:

- **[Deployment](operations/deployment/)** - Production deployment guides
- **[Troubleshooting](operations/troubleshooting/)** - Common issues and fixes

### 💻 [Development](development/)
Developer workflows, tools, and archived work:

- **[Plans](development/plans/)** - Feature planning documents
- **[Reports](development/reports/)** - Development status reports
- **[Archives](development/archives/)** - Historical work and old migrations
- **[Database](development/database/)** - Legacy migrations and development SQL
- **[Simulation v2](development/simulation-v2/)** - Simulation system development work

---

## 🎓 Common Tasks

### For Developers

**Setting Up Local Environment:**
1. Read [Getting Started](getting-started/)
2. Review [Database README](../database/README.md)
3. Run migrations: `psql -f database/migrations/*.sql`
4. Check [Troubleshooting](operations/troubleshooting/) if issues arise

**Working on Features:**
- Check [features/](features/) for existing feature documentation
- Review [development/](development/) for ongoing work
- Follow patterns in [architecture/security/](architecture/security/) for security

**Before Deploying:**
- Run [Security Hardening](architecture/security/SECURITY_HARDENING_DEPLOYMENT.md)
- Review [Security Audit](architecture/security/SECURITY_AUDIT_ANALYSIS.md)
- Test with [database/maintenance/](../database/maintenance/) scripts

### For Operations

**Deployment:**
- Follow [Security Hardening Deployment](architecture/security/SECURITY_HARDENING_DEPLOYMENT.md)
- Run [Production Deployment Check](../database/maintenance/production_deployment_check.sql)

**Troubleshooting:**
- Check [operations/troubleshooting/](operations/troubleshooting/) for common issues
- Review specific fix documents for known problems

**Monitoring:**
- Run [Security Audit](../database/maintenance/security_audit.sql)
- Check [Performance Indexes](../database/maintenance/performance_indexes.sql)

---

## 📊 Key Resources

### Security
- [Security Audit Analysis](architecture/security/SECURITY_AUDIT_ANALYSIS.md) - Current security posture
- [Security Hardening Guide](architecture/security/SECURITY_HARDENING_RISK_ANALYSIS.md) - Risk analysis
- [Deployment Guide](architecture/security/SECURITY_HARDENING_DEPLOYMENT.md) - Step-by-step hardening

### Features
- [BCMA System](features/bcma/MEDICATION_BARCODE_OPTIMIZATION.md) - Barcode medication administration
- [Simulation Guide](features/simulation/SIMULATION_USER_GUIDE.md) - Using the simulation system
- [Label Printing](features/labels/) - Complete label system documentation
- [OAuth Setup](features/auth/MICROSOFT_OAUTH_SETUP.md) - Microsoft authentication

### Database
- [Database README](../database/README.md) - Migration system overview
- [Migrations](../database/migrations/) - All production migrations (001-015)
- [Functions](../database/functions/) - Database functions and procedures
- [Policies](../database/policies/) - Row Level Security policies
- [Maintenance Scripts](../database/maintenance/) - DBA tools and checks

---

## 🔍 Finding What You Need

**By Topic:**
- **BCMA / Medication Administration** → [features/bcma/](features/bcma/)
- **Patient Simulation** → [features/simulation/](features/simulation/)
- **Barcode Labels** → [features/labels/](features/labels/)
- **Lab Results** → [features/labs/](features/labs/)
- **Login / Auth Issues** → [operations/troubleshooting/](operations/troubleshooting/)
- **Security / RLS** → [architecture/security/](architecture/security/)
- **Database / Migrations** → [../database/](../database/)

**By Role:**
- **New Developer** → [Getting Started](getting-started/) + [Main README](../README.md)
- **Feature Developer** → [features/](features/) + [development/](development/)
- **DevOps / SRE** → [operations/](operations/) + [architecture/security/](architecture/security/)
- **DBA** → [../database/](../database/) + [operations/troubleshooting/](operations/troubleshooting/)

---

## 📝 Documentation Standards

When adding new documentation:

1. **Choose the right folder:**
   - New feature? → `features/<feature-name>/`
   - System design? → `architecture/`
   - Deployment/ops? → `operations/`
   - Development work? → `development/`

2. **Create a README.md in each folder** to explain the contents

3. **Use clear, descriptive filenames:**
   - ✅ `OAUTH_IMPLEMENTATION_GUIDE.md`
   - ❌ `fix.md` or `temp_notes.md`

4. **Update this README** if you create a new major section

---

## 💬 Need Help?

- **Can't find something?** Check the folder structure above
- **Found an issue?** Check [operations/troubleshooting/](operations/troubleshooting/)
- **Need to understand architecture?** See [architecture/](architecture/)
- **Working on development?** Check [development/](development/)

---

**Last Updated:** October 18, 2025  
**Documentation Version:** 5.0.0-rc.1
