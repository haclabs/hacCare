# Legacy Wound Care Module - Archived

**Date Archived:** November 16, 2025  
**Reason:** Superseded by hacMap Device & Wound Mapping System

## What Was Archived

### Components
- **WoundCareModule.tsx** - Main wound care module container
- **WoundCareDashboard.tsx** - Dashboard for viewing wound assessments and treatments
- **WoundAssessmentForm.tsx** - Form for creating/editing wound assessments
- **index.ts** - Module exports

### Services
- **woundCareService.ts** - Service layer for wound_assessments and wound_treatments tables

## Why It Was Archived

The legacy wound care system has been **completely replaced** by the new **hacMap** system, which provides:

1. **Visual Body Mapping**: Place wounds and devices directly on an interactive avatar
2. **Unified Assessment System**: Single interface for both wounds and devices
3. **Enhanced Data Model**: Improved schema with better tracking and JSONB flexibility
4. **Device Integration**: Wounds and devices managed together in context
5. **Better UX**: More intuitive placement and assessment workflow

## Migration Path

### Old System → New System

| Old Feature | New Feature in hacMap |
|-------------|----------------------|
| Wound Care card on MAR dashboard | hacMap card on MAR dashboard |
| WoundAssessmentForm | hacMap WoundForm + AssessmentForm |
| WoundCareDashboard timeline | hacMap assessment history panel |
| Body diagram wound placement | Interactive AvatarCanvas placement |
| wound_assessments table | wound_assessments (enhanced with JSONB) + avatar_locations |
| WoundCareService | assessmentService + hacmap API layer |

### Database Changes

The new system uses:
- `avatar_locations` - Stores x,y coordinates for visual placement
- `devices` - Tracks devices placed on body
- `wounds` - Enhanced wound tracking with better metrics
- `wound_assessments` - Assessment history with JSONB assessment_data
- `device_assessments` - New table for device-specific assessments

### Code References

If you need to reference the old implementation:
- UI Components: `/archive/wound-care-legacy/wound-care/`
- Service Layer: `/archive/wound-care-legacy/woundCareService.ts`
- Current hacMap: `/src/features/hacmap/`

## Files Removed From Active Codebase

### From ModularPatientDashboard.tsx
- ❌ Removed `WoundCareModule` import
- ❌ Removed `WoundCareService` import  
- ❌ Removed `wound-care` module configuration
- ❌ Removed wound_assessments loading from patient fetch
- ❌ Removed wound-care rendering case
- ❌ Updated grid layout (removed wound-care card from row 3)

### Impact
- **No breaking changes** - hacMap provides all wound functionality
- **Improved architecture** - Single source of truth for wounds/devices
- **Better student experience** - Visual placement is more intuitive

## Restoration (If Needed)

If you need to temporarily restore the old system:

```bash
# Restore components
mv archive/wound-care-legacy/wound-care src/features/clinical/components/

# Restore service
mv archive/wound-care-legacy/woundCareService.ts src/services/patient/

# Restore ModularPatientDashboard references (use git to revert)
git diff HEAD~1 src/components/ModularPatientDashboard.tsx
```

**Note:** This is not recommended as the old system is deprecated and unsupported.

## See Also

- **hacMap Documentation**: `/docs/features/hacmap/`
- **Migration Guide**: See main CHANGELOG.md for hacMap introduction
- **Database Schema**: `/database/migrations/` for hacMap tables
