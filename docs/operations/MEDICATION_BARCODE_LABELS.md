# Medication Barcode Labels - Operations Guide

## Overview

This guide covers the optimized medication barcode label system for printing labels compatible with round medication bottles and high-contrast B&W laser printers.

## Label Specifications

### Physical Format
- **Label Sheet**: Avery 5160 (30 labels per sheet)
- **Label Size**: 1" × 2⅝" (2.625 inches)
- **Layout**: 3 columns × 10 rows per sheet
- **Printer**: High-quality B&W laser printer at 1200 DPI

### Label Components

Each medication label contains:
1. **Medication Name** (14px, bold, uppercase) - Left side
2. **Patient Name** (13px, bold, black) - Below medication name
3. **Medication ID** (9px, monospace, bold) - Below patient name (e.g., "ID: MZ12345")
4. **Vertical Barcode** (CODE128, rotated 90°) - Right side

## Barcode Optimization for Round Bottles

### Design Rationale

The barcode system is specifically optimized for scanning on curved surfaces (round medication bottles):

**Barcode Dimensions:**
- **Canvas Size**: 0.75in width × 0.9in height (rotated)
- **Bar Width**: 3 pixels (thick bars for 1200 DPI clarity)
- **Bar Height**: 52 pixels (minimizes curve wrap)
- **Margin**: 1 pixel (maximizes usable space)

**Why These Settings Work:**
1. **Thick bars (width: 3)** - Print crisp at 1200 DPI, resist blur on glossy label paper
2. **Moderate height (52px)** - Short enough to avoid excessive curvature on 1.5-2" diameter bottles
3. **Large canvas (0.75in×0.9in)** - Provides white space for scanner lock-on
4. **No rotated text** - Medication ID displays horizontally for easy reading

### Barcode Format

- **Type**: CODE128 (industry standard, high-density)
- **Length**: 7 characters (e.g., "MZ12345")
- **Format**: `M` + First letter of medication + 5 digits from medication ID hash
- **Example**: Morphine → "MM12345", Zofran → "MZ67890"

**Why CODE128:**
- Supports alphanumeric characters
- High data density (more data in less space)
- Excellent error checking
- Compatible with all medical barcode scanners
- Already integrated with BCMA system

## Printing Instructions

### Before Printing

1. **Verify Printer Settings:**
   - Quality: High or Best (1200 DPI)
   - Color: Black & White only
   - Paper type: Label stock
   - Scaling: 100% (no fit-to-page)

2. **Load Label Sheets:**
   - Use Avery 5160 label sheets
   - Load one sheet for test print first
   - Check printer manual for correct orientation

### Printing Process

1. **Navigate to Active Simulations** or **Admin > Bulk Label Print**
2. Click **"Print Labels"** button
3. Select **"Medication Labels"**
4. Preview labels in modal
5. Click **"Print"** button
6. Verify test print before bulk printing

### Post-Printing Quality Check

**Verify each label has:**
- ✅ Crisp, clear black bars (no blurring)
- ✅ Medication name is readable
- ✅ Patient name is bold and clear
- ✅ Medication ID is visible below patient name
- ✅ Barcode has white space around it
- ✅ No smudging or toner dust

**If print quality is poor:**
- Clean printer rollers and drum
- Replace toner cartridge if low
- Use fresh label sheets (not old/humid stock)
- Increase printer quality settings

## Label Application

### Applying to Round Bottles

1. **Clean bottle surface** - Wipe with dry cloth to remove dust
2. **Position vertically** - Barcode should run up/down the bottle height
3. **Center placement** - Apply to flattest part of bottle (avoid seams)
4. **Smooth application** - Press from center outward to avoid bubbles
5. **Full adhesion** - Ensure edges are fully adhered to prevent peeling

### Optimal Placement

```
     [Cap]
       |
   [BARCODE]  ← Vertical orientation
       |
   [Label]
       |
    [Bottom]
```

**Avoid:**
- ❌ Horizontal orientation (won't scan when rotated)
- ❌ Wrapping over bottle curves/corners
- ❌ Overlapping existing labels
- ❌ Placement over bottle ridges or seams

## Scanning Best Practices

### For Students

1. **Hold scanner perpendicular** to barcode
2. **Distance**: 2-4 inches from label
3. **Steady hand** - Don't wave scanner
4. **If fails**: Rotate bottle slightly and try again
5. **Multiple attempts**: Try different angles on curve

### Troubleshooting Scanning Issues

**Barcode won't scan:**
- Ensure scanner is charged/connected
- Try rotating bottle to find flatter surface
- Check for label damage or smudging
- Verify scanner settings (CODE128 enabled)
- Test with known-good barcode first

**Partial scans:**
- Label may be on too tight of a curve
- Try larger bottles for problematic medications
- Ensure scanner laser covers full barcode height

## Storage and Handling

### Label Sheet Storage
- Store in original packaging until use
- Keep in cool, dry environment (not humid)
- Avoid direct sunlight (can yellow adhesive)
- Use within 6 months of purchase for best adhesion

### Labeled Bottle Storage
- Keep bottles upright to prevent label edge peeling
- Avoid areas with high moisture or heat
- Store away from direct sunlight (prevents fading)
- Check labels weekly for peeling/damage

## Maintenance

### Monthly Tasks
- [ ] Verify printer quality with test print
- [ ] Clean printer rollers and drum
- [ ] Check label stock inventory
- [ ] Test sample barcodes with scanner
- [ ] Review student scanning success rates

### When to Replace Labels
- Visible damage (tears, creases, smudges)
- Edges peeling from bottle
- Barcode won't scan after multiple attempts
- Medication name illegible
- Water damage or toner smearing

## Technical Details

### System Integration

**Files Modified:**
- `src/features/simulation/components/SimulationLabelPrintModal.tsx`
- `src/features/admin/components/BulkLabelPrint.tsx`

**Barcode Generation:**
- Service: `src/services/clinical/bcmaService.ts`
- Method: `generateMedicationBarcode()`
- Format: 7-character CODE128

**Label Rendering:**
- Library: JsBarcode 3.11.5
- Canvas-based rendering
- Print-optimized CSS media queries

### Rollback Instructions

If labels don't scan properly, revert to previous version:

```bash
# Switch to backup branch
git checkout backup-before-barcode-changes

# Restore old label files
git checkout backup-before-barcode-changes -- src/features/simulation/components/SimulationLabelPrintModal.tsx
git checkout backup-before-barcode-changes -- src/features/admin/components/BulkLabelPrint.tsx

# Commit the rollback
git add .
git commit -m "Rollback: Restore previous barcode label settings"
git push origin main
```

## Optimization History

**November 19, 2025 - Round Bottle Optimization:**
- Reduced barcode from 0.8in×0.8in to 0.75in×0.9in
- Increased bar width from 2 to 3 for better 1200 DPI printing
- Optimized height to 52px to minimize curve wrap
- Moved medication ID to horizontal orientation
- Removed all background colors for B&W printing
- Increased patient name font size for readability

**Previous Issues Addressed:**
- Barcode too large causing curve distortion
- Thin bars blurring at 1200 DPI
- Rotated medication ID hard to read
- Colored backgrounds wasting toner
- Patient name too small (11px → 13px)

## Support

**For scanning issues:**
1. Check this guide's troubleshooting section
2. Test with backup scanner
3. Print new label if damaged
4. Contact IT if scanner malfunction suspected

**For printing issues:**
1. Review printer settings section
2. Run test print first
3. Clean printer if quality poor
4. Contact operations for label sheet reorder

**For technical/code issues:**
- See `docs/features/bcma/` for BCMA system documentation
- Review `src/services/clinical/bcmaService.ts` for barcode logic
- Check Git history for recent label changes

---

**Last Updated**: November 19, 2025  
**Maintained By**: Operations Team  
**Related Documentation**: 
- [BCMA System Documentation](../features/bcma/)
- [Simulation Management Guide](./SIMULATION_MANAGEMENT.md)
- [Label Printing Workflow](./BULK_LABEL_PRINTING.md)
