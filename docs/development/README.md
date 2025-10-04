# 📚 hacCare Development Documentation

## 🏗️ **Development Structure Overview**

This directory contains all development-related files, documentation, and tools for the hacCare project. Production code should remain in the main `src/` directory.

## 📁 **Directory Structure**

```
docs/development/
├── 📁 plans/           # Project planning and architecture documents
├── 📁 reports/         # Development reports, summaries, and references  
├── 📁 archives/        # Archived code, debug scripts, and old components
├── 📁 database/        # Database migrations, policies, and functions
└── 📁 scripts/         # Maintenance and development scripts
```

## 📋 **Contents**

### 📋 Plans
- `REORGANIZATION_PLAN.md` - Complete project restructuring plan and guidelines

### 📊 Reports  
- `CLEANUP_SUMMARY_PHASE1.md` - Detailed cleanup results and metrics
- `PHASE1_SUCCESS_SUMMARY.md` - Final phase 1 accomplishments 
- `SUPER_ADMIN_REFERENCE.md` - Database security implementation guide
- `vital-alerts-improvements.md` - Alert system enhancement documentation

### 🗄️ Archives
- **debug-scripts/** - SQL diagnostic and troubleshooting files
- **migration-patches/** - Emergency database patches and hotfixes
- **old-components/** - Deprecated React components and utilities
- **old-wound-system/** - Legacy wound management system

### 💾 Database
- **migrations/** - Chronological schema migrations (001_xxx.sql format)
- **policies/** - Row Level Security (RLS) and access control policies
- **functions/** - Database functions, performance optimizations

### 🔧 Scripts
- **maintenance/** - Connection tests, security audits, deployment checks

## 🎯 **Usage Guidelines**

### For Development
- All new planning documents go in `plans/`
- Development reports and analysis in `reports/`
- Never delete archived files - they contain project history
- Database changes follow migration numbering system

### For Production
- Only reference files in main `src/` directory in production builds
- Development files should not be imported in production code
- Archive obsolete code instead of deleting

## 🔒 **Security Notes**

- Archived debug scripts may contain sensitive information
- Database files contain production schema - handle carefully
- Maintenance scripts should only be run in development/staging

## 📈 **Project Health**

✅ **Current Status**: Professional organization achieved  
✅ **Security**: All debug files safely archived  
✅ **Performance**: 35%+ file reduction completed  
✅ **Maintainability**: Enterprise-grade structure implemented

---
*Last Updated: October 4, 2025*  
*Project: hacCare Healthcare Management System*