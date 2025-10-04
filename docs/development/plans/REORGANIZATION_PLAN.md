# 🏗️ hacCare Project Reorganization Plan
# Security & Performance Optimization - File Structure Cleanup

## 🎯 OBJECTIVES
1. Establish logical folder hierarchy based on enterprise standards
2. Remove orphaned/debugging files that pose security risks
3. Optimize performance by eliminating unused imports and dependencies
4. Create clear separation between production and development code
5. Implement proper migration vs. hotfix SQL organization

## 📁 PROPOSED NEW STRUCTURE

```
hacCare/
├── 📁 src/
│   ├── 📁 app/                    # Application core
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── 📁 features/               # Feature-based architecture
│   │   ├── 📁 auth/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── 📁 patients/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── 📁 medications/
│   │   ├── 📁 vitals/
│   │   ├── 📁 alerts/
│   │   └── 📁 admin/
│   │
│   ├── 📁 shared/                 # Shared utilities
│   │   ├── 📁 components/
│   │   │   ├── 📁 ui/           # Base UI components
│   │   │   ├── 📁 forms/        # Reusable forms
│   │   │   └── 📁 layout/       # Layout components
│   │   │
│   │   ├── 📁 hooks/             # Generic hooks
│   │   ├── 📁 utils/             # Utility functions
│   │   ├── 📁 types/             # Global types
│   │   ├── 📁 constants/         # App constants
│   │   └── 📁 config/            # Configuration
│   │
│   └── 📁 assets/                 # Static assets
│       ├── 📁 images/
│       ├── 📁 icons/
│       └── 📁 styles/
│
├── 📁 database/                   # Database management
│   ├── 📁 migrations/            # Schema migrations (chronological)
│   ├── 📁 seeds/                 # Test data
│   ├── 📁 policies/              # RLS policies
│   └── 📁 functions/             # Database functions
│
├── 📁 scripts/                    # Development scripts
│   ├── 📁 build/
│   ├── 📁 deployment/
│   └── 📁 maintenance/
│
├── 📁 docs/                       # Documentation
│   ├── 📁 api/
│   ├── 📁 deployment/
│   └── 📁 security/
│
├── 📁 tests/                      # Test files
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 e2e/
│
└── 📁 archive/                    # Deprecated/old files
    ├── 📁 old-components/
    ├── 📁 debug-scripts/
    └── 📁 migration-patches/
```

## 🗑️ FILES TO REMOVE/ARCHIVE

### SQL Debug Files (Archive)
- All `debug_*.sql` files
- All `fix_*.sql` files
- All `test_*.sql` files
- Temporary migration patches

### Orphaned Test Files (Remove)
- `test-alerts.js`
- `test-vital-alerts.js` 
- `test-bulk-labels.js`

### Obsolete Components (Archive)
- `AuthContext-no-loading.tsx`
- `AuthContext-simple.tsx` 
- `main_fixed.tsx`
- `modular-patient-system.ts`
- `SimulationDashboard.tsx` (in archive/)

### Development Utilities (Move to scripts/)
- `connectionTest.ts`
- Various debug services

## 🔧 IMPLEMENTATION STEPS

### Phase 1: Safety & Backup
1. Create archive directory
2. Move all debug SQL files to archive
3. Git commit with "Archive debug files"

### Phase 2: Core Restructure  
1. Create new feature-based directories
2. Move components to appropriate features
3. Consolidate authentication contexts
4. Update all import paths

### Phase 3: Database Organization
1. Create database/ directory structure
2. Separate migrations from patches
3. Organize by chronological order

### Phase 4: Testing & Validation
1. Run full test suite
2. Check all imports resolve
3. Verify application functionality
4. Performance benchmarking

### Phase 5: Documentation
1. Update README with new structure
2. Create migration guide
3. Document architectural decisions

## 🔒 SECURITY CONSIDERATIONS

### Remove Security Risks
- Debug files with connection strings
- Test files with hardcoded values
- Old authentication methods
- Unused service files

### Improve Security
- Centralize configuration
- Separate development utilities
- Clean import chains
- Remove dead code

## 📊 PERFORMANCE BENEFITS

### Bundle Size Reduction
- Remove unused components (~15-20% reduction expected)
- Eliminate duplicate contexts
- Clean up dead imports

### Build Performance  
- Faster TypeScript compilation
- Reduced dependency resolution
- Cleaner module graph

### Runtime Performance
- Smaller initial bundle
- Better tree-shaking
- Reduced memory footprint

## ✅ SUCCESS METRICS

- [ ] Reduce project file count by >30%
- [ ] Eliminate all security lint warnings
- [ ] Improve build time by >25%  
- [ ] Zero broken imports
- [ ] All tests passing
- [ ] Documentation up to date

Would you like me to proceed with the implementation?